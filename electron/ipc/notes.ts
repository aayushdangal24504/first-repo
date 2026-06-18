import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';
import type { TrashService } from './trash';

type NoteRow = {
  id: string;
  folderId: string | null;
  title: string;
  summary: string | null;
  contentJson: string;
  coverMediaId: string | null;
  isPinned: 0 | 1;
  isFavorite: 0 | 1;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const noteSelect = `SELECT id, folder_id as folderId, title, summary, content_json as contentJson,
                          cover_media_id as coverMediaId, is_pinned as isPinned, is_favorite as isFavorite,
                          archived_at as archivedAt, created_at as createdAt, updated_at as updatedAt
                   FROM notes`;

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const parseHtml = (contentJson: string): string => {
  try {
    const content = JSON.parse(contentJson) as { html?: string };
    return content.html ?? '';
  } catch {
    return '';
  }
};

const mapNote = (row: NoteRow): Note => ({
  id: row.id,
  folderId: row.folderId,
  title: row.title,
  summary: row.summary,
  html: parseHtml(row.contentJson),
  coverMediaId: row.coverMediaId,
  isPinned: Boolean(row.isPinned),
  isFavorite: Boolean(row.isFavorite),
  archivedAt: row.archivedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const getNote = (db: AppDatabase, userId: string, id: string): Note => {
  const row = db.prepare(`${noteSelect} WHERE id = ? AND user_id = ?`).get(id, userId) as NoteRow | undefined;
  if (!row) throw new Error('Note not found');
  return mapNote(row);
};

export const registerNoteIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService, trashService: TrashService): void => {
  ipcMain.handle('notes:list', async (): Promise<Note[]> => {
    const userId = auth.getCurrentUserId();
    const rows = db.prepare(`${noteSelect} WHERE archived_at IS NULL AND user_id = ? ORDER BY is_pinned DESC, updated_at DESC`).all(userId) as NoteRow[];
    return rows.map(mapNote);
  });

  ipcMain.handle('notes:create', async (_event, input: CreateNoteInput): Promise<Note> => {
    const title = input.title.trim();
    if (!title) throw new Error('Note title is required');

    const id = randomUUID();
    const now = new Date().toISOString();
    const userId = auth.getCurrentUserId();
    db.prepare(
      `INSERT INTO notes (id, user_id, title, summary, content_json, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?, ?)`
    ).run(id, userId, title, JSON.stringify({ html: '<p></p>' }), now, now);
    return getNote(db, userId, id);
  });

  ipcMain.handle('notes:update', async (_event, input: UpdateNoteInput): Promise<Note> => {
    const userId = auth.getCurrentUserId();
    const current = getNote(db, userId, input.id);
    const html = input.html ?? current.html;
    const summary = stripHtml(html).slice(0, 220);

    db.prepare(
      `UPDATE notes
       SET title = ?, summary = ?, content_json = ?, is_pinned = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).run(
      input.title === undefined ? current.title : input.title.trim() || current.title,
      summary,
      JSON.stringify({ html }),
      input.isPinned === undefined ? (current.isPinned ? 1 : 0) : input.isPinned ? 1 : 0,
      input.isFavorite === undefined ? (current.isFavorite ? 1 : 0) : input.isFavorite ? 1 : 0,
      input.id,
      userId
    );

    return getNote(db, userId, input.id);
  });

  ipcMain.handle('notes:delete', async (_event, id: string): Promise<{ ok: true }> => {
    const userId = auth.getCurrentUserId();
    const note = getNote(db, userId, id);
    await trashService.moveToTrash('note', id, note, note.title);
    db.prepare(`UPDATE notes SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(id, userId);
    return { ok: true };
  });
};
