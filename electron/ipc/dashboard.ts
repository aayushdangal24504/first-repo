import type { IpcMain } from 'electron';
import type { DashboardSnapshot } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import { getLatestMood } from './mood';
import { getQuoteOfTheDay } from '../services/mood-quotes';
import type { AuthService } from '../services/auth-service';

export const registerDashboardIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService): void => {
  ipcMain.handle('dashboard:get-snapshot', async (): Promise<DashboardSnapshot> => {
    const userId = auth.getCurrentUserId();
    const todayTasks = db.prepare(
      `SELECT id, title, priority, due_at as dueAt, status, progress
       FROM tasks
       WHERE status != 'done' AND status != 'archived' AND user_id = ?
       ORDER BY due_at IS NULL, due_at ASC, priority ASC
       LIMIT 8`
    ).all(userId) as DashboardSnapshot['todayTasks'];

    const recentNotes = db.prepare(
      `SELECT id, title, summary, updated_at as updatedAt
       FROM notes
       WHERE archived_at IS NULL AND user_id = ?
       ORDER BY updated_at DESC
       LIMIT 5`
    ).all(userId) as DashboardSnapshot['recentNotes'];

    const recentJournalEntries = db.prepare(
      `SELECT id, title, entry_date as entryDate, mood, location_label as locationLabel
       FROM journal_entries
       WHERE user_id = ?
       ORDER BY entry_date DESC
       LIMIT 5`
    ).all(userId) as DashboardSnapshot['recentJournalEntries'];

    const upcomingReminders = db.prepare(
      `SELECT id, title, body, remind_at as remindAt, priority
       FROM reminders
       WHERE is_completed = 0 AND user_id = ?
       ORDER BY COALESCE(snoozed_until, remind_at) ASC
       LIMIT 6`
    ).all(userId) as DashboardSnapshot['upcomingReminders'];

    return {
      quoteOfTheDay: await getQuoteOfTheDay(),
      todayTasks,
      recentNotes,
      recentJournalEntries,
      upcomingReminders,
      mood: getLatestMood(db, userId),
      stats: {
        openTasks: Number((db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done', 'archived') AND user_id = ?`).get(userId) as { count: number }).count),
        notes: Number((db.prepare(`SELECT COUNT(*) as count FROM notes WHERE archived_at IS NULL AND user_id = ?`).get(userId) as { count: number }).count),
        journalEntries: Number((db.prepare(`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?`).get(userId) as { count: number }).count),
        mediaFiles: Number((db.prepare(`SELECT COUNT(*) as count FROM media_files WHERE user_id = ?`).get(userId) as { count: number }).count)
      }
    };
  });
};
