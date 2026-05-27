import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { CreateMemoryInput, Memory, UpdateMemoryInput } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';

type MemoryRow = { id: string; title: string; memoryDate: string | null; year: number | null; category: string | null; contentJson: string; emotionalTags: string; coverMediaId: string | null; isFavorite: 0 | 1; createdAt: string; updatedAt: string };
const memorySelect = `SELECT id, title, memory_date as memoryDate, year, category, content_json as contentJson, emotional_tags as emotionalTags, cover_media_id as coverMediaId, is_favorite as isFavorite, created_at as createdAt, updated_at as updatedAt FROM memories`;
const safeJson = <T>(value: string, fallback: T): T => { try { return JSON.parse(value) as T; } catch { return fallback; } };
const cleanTags = (tags?: string[]): string[] => [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
const cleanDate = (date?: string | null): string | null => {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const yearFromDate = (date?: string | null): number | null => { if (!date) return null; const parsed = new Date(date); return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear(); };
const mapMemory = (row: MemoryRow): Memory => ({ id: row.id, title: row.title, memoryDate: row.memoryDate, year: row.year, category: row.category, content: safeJson<{ text: string }>(row.contentJson, { text: '' }), emotionalTags: safeJson<string[]>(row.emotionalTags, []), coverMediaId: row.coverMediaId, isFavorite: Boolean(row.isFavorite), createdAt: row.createdAt, updatedAt: row.updatedAt });
const getMemory = (db: AppDatabase, userId: string, id: string): Memory => { const row = db.prepare(`${memorySelect} WHERE id = ? AND user_id = ?`).get(id, userId) as MemoryRow | undefined; if (!row) throw new Error('Memory not found'); return mapMemory(row); };

export const registerMemoryIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService): void => {
  ipcMain.handle('memories:list', async (): Promise<Memory[]> => (db.prepare(`${memorySelect} WHERE user_id = ? ORDER BY COALESCE(memory_date, created_at) DESC, created_at DESC`).all(auth.getCurrentUserId()) as MemoryRow[]).map(mapMemory));
  ipcMain.handle('memories:create', async (_event, input: CreateMemoryInput): Promise<Memory> => {
    const title = input.title.trim();
    if (!title) throw new Error('Memory title is required');
    const id = randomUUID();
    const now = new Date().toISOString();
    const memoryDate = cleanDate(input.memoryDate);
    const userId = auth.getCurrentUserId();
    db.prepare(`INSERT INTO memories (id, user_id, title, memory_date, year, category, content_json, emotional_tags, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, title, memoryDate, yearFromDate(memoryDate), input.category?.trim() || null, JSON.stringify({ text: input.text?.trim() || '' }), JSON.stringify(cleanTags(input.emotionalTags)), input.isFavorite ? 1 : 0, now, now);
    return getMemory(db, userId, id);
  });
  ipcMain.handle('memories:update', async (_event, input: UpdateMemoryInput): Promise<Memory> => {
    const userId = auth.getCurrentUserId();
    const current = getMemory(db, userId, input.id);
    const memoryDate = input.memoryDate === undefined ? current.memoryDate : cleanDate(input.memoryDate);
    const text = input.text === undefined ? current.content.text : input.text;
    db.prepare(`UPDATE memories SET title = ?, memory_date = ?, year = ?, category = ?, content_json = ?, emotional_tags = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(input.title === undefined ? current.title : input.title.trim() || current.title, memoryDate, yearFromDate(memoryDate), input.category === undefined ? current.category : input.category?.trim() || null, JSON.stringify({ text: text ?? '' }), JSON.stringify(input.emotionalTags === undefined ? current.emotionalTags : cleanTags(input.emotionalTags)), input.isFavorite === undefined ? (current.isFavorite ? 1 : 0) : input.isFavorite ? 1 : 0, input.id, userId);
    return getMemory(db, userId, input.id);
  });
  ipcMain.handle('memories:delete', async (_event, id: string): Promise<{ ok: true }> => { db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(id, auth.getCurrentUserId()); return { ok: true }; });
};
