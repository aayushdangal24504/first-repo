import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { app, BrowserWindow, Notification } from 'electron';
import type { Reminder, ReminderRepeat } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';

const MAX_TIMEOUT_MS = 2_147_483_647;
const LOOKAHEAD_MS = 1000 * 60 * 60 * 24 * 14;

type ReminderRow = {
  id: string;
  title: string;
  body: string | null;
  remindAt: string;
  recurrenceRule: ReminderRepeat | null;
  snoozedUntil: string | null;
  category: string | null;
  priority: 'low' | 'normal' | 'high' | null;
  lastNotifiedAt: string | null;
  isCompleted: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

const mapReminderRow = (row: ReminderRow): Reminder => ({
  id: row.id,
  title: row.title,
  body: row.body,
  remindAt: row.remindAt,
  recurrenceRule: row.recurrenceRule ?? 'none',
  snoozedUntil: row.snoozedUntil,
  category: row.category,
  priority: row.priority ?? 'normal',
  lastNotifiedAt: row.lastNotifiedAt,
  isCompleted: Boolean(row.isCompleted),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const addRepeatInterval = (date: Date, recurrence: ReminderRepeat): Date | null => {
  const next = new Date(date);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  return recurrence === 'none' ? null : next;
};

export class ReminderScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly alarmLoops = new Map<string, NodeJS.Timeout>();
  private readonly alarmProcesses = new Map<string, ChildProcessWithoutNullStreams>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(private readonly db: AppDatabase) {}

  start(): void {
    this.scheduleAll();
    this.sweepTimer = setInterval(() => this.scheduleAll(), 1000 * 60);
  }

  stop(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    [...this.alarmLoops.keys()].forEach((id) => this.stopAlarm(id));
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  scheduleAll(): void {
    const reminders = this.db.prepare(
      `SELECT id, title, body, remind_at as remindAt, recurrence_rule as recurrenceRule,
              snoozed_until as snoozedUntil, category, priority, last_notified_at as lastNotifiedAt,
              is_completed as isCompleted, created_at as createdAt, updated_at as updatedAt
       FROM reminders
       WHERE is_completed = 0
       ORDER BY COALESCE(snoozed_until, remind_at) ASC`
    ).all() as ReminderRow[];

    reminders.map(mapReminderRow).forEach((reminder) => this.schedule(reminder));
  }

  schedule(reminder: Reminder): void {
    this.clear(reminder.id);

    if (reminder.isCompleted) return;

    const effectiveAt = new Date(reminder.snoozedUntil ?? reminder.remindAt).getTime();
    const delay = effectiveAt - Date.now();

    if (Number.isNaN(effectiveAt)) return;

    if (delay <= 0) {
      this.fire(reminder);
      return;
    }

    if (delay > LOOKAHEAD_MS || delay > MAX_TIMEOUT_MS) return;

    const timer = setTimeout(() => this.fire(reminder), delay);
    this.timers.set(reminder.id, timer);
  }

  clear(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.stopAlarm(id);
  }

  stopAlarm(id: string): void {
    const loop = this.alarmLoops.get(id);
    if (loop) clearTimeout(loop);
    this.alarmLoops.delete(id);

    const process = this.alarmProcesses.get(id);
    if (process && !process.killed) process.kill();
    this.alarmProcesses.delete(id);
  }

  showTestNotification(): void {
    const reminder = {
      id: 'test',
      title: 'Avyukta notification test',
      body: 'Desktop reminders are wired locally on this Mac.',
      remindAt: new Date().toISOString(),
      recurrenceRule: 'none',
      snoozedUntil: null,
      category: 'System',
      priority: 'normal',
      lastNotifiedAt: null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } satisfies Reminder;
    this.showNotification(reminder);
    this.emitAlarm(reminder);
    this.playLongAlarm(reminder.id);
  }

  private fire(reminder: Reminder): void {
    const dueKey = reminder.snoozedUntil ?? reminder.remindAt;
    if (reminder.lastNotifiedAt && new Date(reminder.lastNotifiedAt).getTime() >= new Date(dueKey).getTime()) return;

    this.showNotification(reminder);
    this.emitAlarm(reminder);

    const notifiedAt = new Date().toISOString();
    const nextDate = addRepeatInterval(new Date(reminder.remindAt), reminder.recurrenceRule);

    if (nextDate) {
      this.db.prepare(
        `UPDATE reminders
         SET remind_at = ?, snoozed_until = NULL, last_notified_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(nextDate.toISOString(), notifiedAt, reminder.id);
      this.schedule({ ...reminder, remindAt: nextDate.toISOString(), snoozedUntil: null, lastNotifiedAt: notifiedAt });
      return;
    }

    this.db.prepare(
      `UPDATE reminders
       SET snoozed_until = NULL, last_notified_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(notifiedAt, reminder.id);
  }

  private showNotification(reminder: Reminder): void {
    this.bringAppToAttention();
    if (!Notification.isSupported()) {
      this.showFallbackWindow();
      return;
    }

    const notification = new Notification({
      title: reminder.priority === 'high' ? `Important: ${reminder.title}` : reminder.title,
      subtitle: reminder.category ?? 'Avyukta Life',
      body: reminder.body ?? 'Reminder due now.',
      silent: false,
      sound: 'default'
    });

    notification.on('click', () => {
      const window = BrowserWindow.getAllWindows()[0];
      if (window) {
        if (window.isMinimized()) window.restore();
        window.focus();
      }
    });

    notification.show();
  }

  private playLongAlarm(id: string): void {
    this.stopAlarm(id);
    if (process.platform !== 'darwin') return;

    const soundPath = '/System/Library/Sounds/Sosumi.aiff';
    const startedAt = Date.now();
    const playOnce = () => {
      if (Date.now() - startedAt > 60_000) {
        this.stopAlarm(id);
        return;
      }

      const player = spawn('afplay', [soundPath]);
      this.alarmProcesses.set(id, player);
      player.once('close', () => {
        if (!this.alarmLoops.has(id)) return;
        const loop = setTimeout(playOnce, 300);
        this.alarmLoops.set(id, loop);
      });
    };

    const loop = setTimeout(playOnce, 0);
    this.alarmLoops.set(id, loop);
  }

  private bringAppToAttention(): void {
    if (process.platform === 'darwin') app.dock?.bounce('critical');
  }

  private showFallbackWindow(): void {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.flashFrame(true);
  }

  private emitAlarm(reminder: Reminder): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('reminders:alarm', {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        priority: reminder.priority,
        category: reminder.category,
        remindAt: reminder.remindAt
      });
    });
  }
}
