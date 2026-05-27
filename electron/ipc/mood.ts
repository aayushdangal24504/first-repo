import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { MoodLog, MoodName } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import { getMoodQuote } from '../services/mood-quotes';
import type { AuthService } from '../services/auth-service';

const allowedMoods = new Set<MoodName>(['calm', 'focused', 'grateful', 'curious', 'tired', 'stressed', 'happy', 'low']);

type MoodRow = {
  id: string;
  mood: MoodName;
  quote: string;
  note: string | null;
  loggedAt: string;
  createdAt: string;
};

const mapMoodRow = (row: MoodRow): MoodLog => ({
  id: row.id,
  mood: row.mood,
  quote: row.quote,
  note: row.note,
  loggedAt: row.loggedAt,
  createdAt: row.createdAt
});

export const getLatestMood = (db: AppDatabase, userId: string): MoodLog | null => {
  const row = db.prepare(
    `SELECT id, mood, quote, note, logged_at as loggedAt, created_at as createdAt
     FROM mood_logs
     WHERE user_id = ?
     ORDER BY logged_at DESC
     LIMIT 1`
  ).get(userId) as MoodRow | undefined;

  return row ? mapMoodRow(row) : null;
};

export const registerMoodIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService): void => {
  ipcMain.handle('mood:get-latest', async (): Promise<MoodLog | null> => getLatestMood(db, auth.getCurrentUserId()));

  ipcMain.handle('mood:log', async (_event, input: { mood: MoodName; note?: string }): Promise<MoodLog> => {
    if (!allowedMoods.has(input.mood)) {
      throw new Error('Unsupported mood');
    }

    const userId = auth.getCurrentUserId();
    const latestMood = getLatestMood(db, userId);
    const moodLog: MoodLog = {
      id: randomUUID(),
      mood: input.mood,
      quote: await getMoodQuote(input.mood, latestMood?.mood === input.mood ? latestMood.quote : null),
      note: input.note?.trim() || null,
      loggedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    db.prepare(
      `INSERT INTO mood_logs (id, user_id, mood, quote, note, logged_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(moodLog.id, userId, moodLog.mood, moodLog.quote, moodLog.note, moodLog.loggedAt, moodLog.createdAt);

    return moodLog;
  });
};
