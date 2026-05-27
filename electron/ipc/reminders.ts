import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { CreateReminderInput, Reminder, ReminderPriority, ReminderRepeat, SnoozeReminderInput } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { ReminderScheduler } from '../services/reminder-scheduler';
import type { AuthService } from '../services/auth-service';

type ReminderRow = {
  id: string;
  title: string;
  body: string | null;
  remindAt: string;
  recurrenceRule: ReminderRepeat | null;
  snoozedUntil: string | null;
  category: string | null;
  priority: ReminderPriority | null;
  lastNotifiedAt: string | null;
  isCompleted: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

const reminderSelect = `SELECT id, title, body, remind_at as remindAt, recurrence_rule as recurrenceRule,
                              snoozed_until as snoozedUntil, category, priority,
                              last_notified_at as lastNotifiedAt, is_completed as isCompleted,
                              created_at as createdAt, updated_at as updatedAt
                       FROM reminders`;

const mapReminder = (row: ReminderRow): Reminder => ({
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

const getReminder = (db: AppDatabase, userId: string, id: string): Reminder => {
  const row = db.prepare(`${reminderSelect} WHERE id = ? AND user_id = ?`).get(id, userId) as ReminderRow | undefined;
  if (!row) throw new Error('Reminder not found');
  return mapReminder(row);
};

const cleanRepeat = (value?: ReminderRepeat): ReminderRepeat => {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
  return 'none';
};

const cleanPriority = (value?: ReminderPriority): ReminderPriority => {
  if (value === 'low' || value === 'high') return value;
  return 'normal';
};

export const registerReminderIpc = (ipcMain: IpcMain, db: AppDatabase, scheduler: ReminderScheduler, auth: AuthService): void => {
  ipcMain.handle('reminders:list', async (): Promise<Reminder[]> => {
    const rows = db.prepare(
      `${reminderSelect}
       WHERE user_id = ?
       ORDER BY is_completed ASC, COALESCE(snoozed_until, remind_at) ASC, created_at DESC`
    ).all(auth.getCurrentUserId()) as ReminderRow[];

    return rows.map(mapReminder);
  });

  ipcMain.handle('reminders:create', async (_event, input: CreateReminderInput): Promise<Reminder> => {
    const title = input.title.trim();
    const remindDate = new Date(input.remindAt);

    if (!title) throw new Error('Reminder title is required');
    if (Number.isNaN(remindDate.getTime())) throw new Error('Reminder date is invalid');

    const id = randomUUID();
    const now = new Date().toISOString();
    const userId = auth.getCurrentUserId();
    const reminder: Reminder = {
      id,
      title,
      body: input.body?.trim() || null,
      remindAt: remindDate.toISOString(),
      recurrenceRule: cleanRepeat(input.recurrenceRule),
      snoozedUntil: null,
      category: input.category?.trim() || null,
      priority: cleanPriority(input.priority),
      lastNotifiedAt: null,
      isCompleted: false,
      createdAt: now,
      updatedAt: now
    };

    db.prepare(
      `INSERT INTO reminders (id, user_id, title, body, remind_at, recurrence_rule, snoozed_until, category, priority, last_notified_at, is_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 0, ?, ?)`
    ).run(
      reminder.id,
      userId,
      reminder.title,
      reminder.body,
      reminder.remindAt,
      reminder.recurrenceRule,
      reminder.category,
      reminder.priority,
      reminder.createdAt,
      reminder.updatedAt
    );

    scheduler.schedule(reminder);
    return reminder;
  });

  ipcMain.handle('reminders:complete', async (_event, id: string): Promise<Reminder> => {
    const userId = auth.getCurrentUserId();
    db.prepare(`UPDATE reminders SET is_completed = 1, snoozed_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(id, userId);
    scheduler.clear(id);
    return getReminder(db, userId, id);
  });

  ipcMain.handle('reminders:delete', async (_event, id: string): Promise<{ ok: true }> => {
    db.prepare(`DELETE FROM reminders WHERE id = ? AND user_id = ?`).run(id, auth.getCurrentUserId());
    scheduler.clear(id);
    return { ok: true };
  });

  ipcMain.handle('reminders:snooze', async (_event, input: SnoozeReminderInput): Promise<Reminder> => {
    const minutes = Math.max(1, Math.min(24 * 60, Math.floor(input.minutes)));
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    db.prepare(
      `UPDATE reminders
       SET snoozed_until = ?, last_notified_at = NULL, is_completed = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).run(snoozedUntil, input.id, auth.getCurrentUserId());
    const reminder = getReminder(db, auth.getCurrentUserId(), input.id);
    scheduler.schedule(reminder);
    return reminder;
  });

  ipcMain.handle('reminders:test-notification', async (): Promise<{ ok: true }> => {
    scheduler.showTestNotification();
    return { ok: true };
  });

  ipcMain.handle('reminders:stop-alarm', async (_event, id: string): Promise<{ ok: true }> => {
    scheduler.stopAlarm(id);
    return { ok: true };
  });
};
