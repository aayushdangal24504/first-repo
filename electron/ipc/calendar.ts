import type { IpcMain } from 'electron';
import type { CalendarEventItem, CalendarMonthInput, CalendarSnapshot } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';

type EventRow = CalendarEventItem;

const monthRange = (year: number, month: number) => {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : new Date().getFullYear();
  const safeMonth = Math.min(12, Math.max(1, Math.trunc(month || new Date().getMonth() + 1)));
  const start = new Date(Date.UTC(safeYear, safeMonth - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(safeYear, safeMonth, 1, 0, 0, 0));
  return { safeYear, safeMonth, start: start.toISOString(), end: end.toISOString() };
};

export const registerCalendarIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService): void => {
  ipcMain.handle('calendar:get-month', async (_event, input: CalendarMonthInput): Promise<CalendarSnapshot> => {
    const { safeYear, safeMonth, start, end } = monthRange(input.year, input.month);
    const userId = auth.getCurrentUserId();
    const rows = db.prepare(
      `SELECT id, title, due_at as date, 'task' as type, status as subtitle, id as targetId FROM tasks WHERE due_at >= ? AND due_at < ? AND status != 'archived' AND user_id = ?
       UNION ALL SELECT id, title, remind_at as date, 'reminder' as type, COALESCE(category, priority) as subtitle, id as targetId FROM reminders WHERE remind_at >= ? AND remind_at < ? AND is_completed = 0 AND user_id = ?
       UNION ALL SELECT id, COALESCE(title, 'Journal page') as title, entry_date as date, 'journal' as type, COALESCE(mood, location_label) as subtitle, journal_id as targetId FROM journal_entries WHERE entry_date >= ? AND entry_date < ? AND user_id = ?
       UNION ALL SELECT id, title, starts_at as date, 'trip' as type, destination as subtitle, id as targetId FROM trips WHERE starts_at IS NOT NULL AND starts_at >= ? AND starts_at < ? AND user_id = ?
       UNION ALL SELECT id, title, memory_date as date, 'memory' as type, category as subtitle, id as targetId FROM memories WHERE memory_date IS NOT NULL AND memory_date >= ? AND memory_date < ? AND user_id = ?
       ORDER BY date ASC`
    ).all(start, end, userId, start, end, userId, start, end, userId, start, end, userId, start, end, userId) as EventRow[];
    return { year: safeYear, month: safeMonth, start, end, items: rows.map((row) => ({ ...row, subtitle: row.subtitle ?? null, targetId: row.targetId ?? null })) };
  });
};
