import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';

export type TrashItem = {
  id: string;
  entityType: string;
  entityId: string;
  title: string | null;
  deletedAt: string;
  createdAt: string;
  updatedAt: string;
};

const trashSelect = `SELECT id, entity_type as entityType, entity_id as entityId, title, deleted_at as deletedAt, created_at as createdAt, updated_at as updatedAt FROM trash`;

const mapTrashItem = (row: any): TrashItem => ({
  id: row.id,
  entityType: row.entityType,
  entityId: row.entityId,
  title: row.title,
  deletedAt: row.deletedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

export class TrashService {
  constructor(
    private readonly db: AppDatabase,
    private readonly auth: AuthService
  ) {}

  /**
   * Move an item to trash
   */
  async moveToTrash(entityType: string, entityId: string, entityData: any, title?: string | null): Promise<TrashItem> {
    const userId = this.auth.getCurrentUserId();
    const id = randomUUID();
    const now = new Date().toISOString();
    
    this.db.prepare(
      `INSERT INTO trash (id, user_id, entity_type, entity_id, entity_data, title, deleted_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, userId, entityType, entityId, JSON.stringify(entityData), title || null, now, now, now
    );
    
    return mapTrashItem(this.db.prepare(`${trashSelect} WHERE id = ?`).get(id) as any);
  }

  /**
   * Get all trash items for the current user
   */
  async getTrashItems(): Promise<TrashItem[]> {
    const userId = this.auth.getCurrentUserId();
    this.purgeExpiredTrash(userId);
    const rows = this.db.prepare(`${trashSelect} WHERE user_id = ? ORDER BY deleted_at DESC`).all(userId) as any[];
    return rows.map(mapTrashItem);
  }

  /**
   * Restore an item from trash
   */
  async restoreFromTrash(trashId: string): Promise<{ ok: true; entityType: string; entityId: string; data: any }> {
    const userId = this.auth.getCurrentUserId();
    const trashItem = this.db.prepare(`SELECT entity_type, entity_id, entity_data FROM trash WHERE id = ? AND user_id = ?`).get(trashId, userId) as any;
    
    if (!trashItem) throw new Error('Trash item not found');
    
    const data = JSON.parse(trashItem.entity_data);
    this.restoreEntity(userId, trashItem.entity_type, data);
    this.db.prepare(`DELETE FROM trash WHERE id = ? AND user_id = ?`).run(trashId, userId);
    
    return {
      ok: true,
      entityType: trashItem.entity_type,
      entityId: trashItem.entity_id,
      data
    };
  }

  setRetentionDays(days: number): { ok: true; days: number } {
    const normalized = [30, 60, 90].includes(days) ? days : 30;
    this.db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('trash.retentionDays', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    ).run(JSON.stringify(normalized));
    return { ok: true, days: normalized };
  }

  private getRetentionDays(): number {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = 'trash.retentionDays'`).get() as { value: string } | undefined;
    if (!row) return 30;
    try {
      const days = Number(JSON.parse(row.value));
      return [30, 60, 90].includes(days) ? days : 30;
    } catch {
      return 30;
    }
  }

  private purgeExpiredTrash(userId: string): void {
    const cutoff = new Date(Date.now() - this.getRetentionDays() * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare(`DELETE FROM trash WHERE user_id = ? AND deleted_at < ?`).run(userId, cutoff);
  }

  private restoreEntity(userId: string, entityType: string, data: any): void {
    const now = new Date().toISOString();
    if (entityType === 'note') {
      this.db.prepare(`UPDATE notes SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(data.id, userId);
      return;
    }
    if (entityType === 'task') {
      this.db.prepare(`UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(data.status === 'archived' ? 'inbox' : data.status ?? 'inbox', data.id, userId);
      return;
    }
    if (entityType === 'reminder') {
      this.db.prepare(
        `INSERT OR REPLACE INTO reminders (id, user_id, title, body, remind_at, recurrence_rule, custom_recurrence_pattern, mode, event_kind, date_of_birth, notify_like_alarm, snoozed_until, category, priority, last_notified_at, is_completed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(data.id, userId, data.title, data.body ?? null, data.remindAt, data.recurrenceRule ?? 'none', data.customRecurrencePattern ?? null, data.mode ?? 'standard', data.eventKind ?? null, data.dateOfBirth ?? null, data.notifyLikeAlarm ? 1 : 0, data.snoozedUntil ?? null, data.category ?? null, data.priority ?? 'normal', data.lastNotifiedAt ?? null, data.isCompleted ? 1 : 0, data.createdAt ?? now, now);
      return;
    }
    if (entityType === 'trip') {
      this.db.prepare(`INSERT OR REPLACE INTO trips (id, user_id, title, destination, starts_at, ends_at, cover_media_id, notes, favorite_moment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(data.id, userId, data.title, data.destination ?? null, data.startsAt ?? null, data.endsAt ?? null, data.coverMediaId ?? null, data.notes ?? null, data.favoriteMoment ?? null, data.createdAt ?? now, now);
      for (const day of data.days ?? []) this.restoreEntity(userId, 'trip_day', day);
      return;
    }
    if (entityType === 'trip_day') {
      this.db.prepare(
        `INSERT OR REPLACE INTO trip_days (id, user_id, trip_id, day_date, title, entry_json, activities_text, plans_text, places_visited, food_tried, highlights, notes_text, expenses_json, packing_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(data.id, userId, data.tripId, data.dayDate, data.title ?? null, JSON.stringify(data.entry ?? { text: '' }), data.activities ?? null, data.plans ?? null, JSON.stringify(data.placesVisited ?? []), JSON.stringify(data.foodTried ?? []), data.highlights ?? null, data.notes ?? null, JSON.stringify(data.expenses ?? []), JSON.stringify(data.packing ?? []), data.createdAt ?? now, now);
      return;
    }
    if (entityType === 'journal') {
      this.db.prepare(`INSERT OR REPLACE INTO journals (id, user_id, title, kind, cover_media_id, cover_color, template_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(data.id, userId, data.title, data.kind ?? 'daily', data.coverMediaId ?? null, data.coverColor ?? null, data.templateId ?? null, data.createdAt ?? now, now);
      return;
    }
    if (entityType === 'journal_entry') {
      this.db.prepare(
        `INSERT OR REPLACE INTO journal_entries (id, user_id, journal_id, entry_date, title, content_json, mood, weather, location_label, layout_json, is_favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(data.id, userId, data.journalId, data.entryDate, data.title ?? null, JSON.stringify({ text: data.text ?? '' }), data.mood ?? null, data.weather ?? null, data.locationLabel ?? null, JSON.stringify(data.layout ?? { blocks: data.blocks ?? [] }), data.isFavorite ? 1 : 0, data.createdAt ?? now, now);
      return;
    }
    if (entityType === 'memory') {
      this.db.prepare(
        `INSERT OR REPLACE INTO memories (id, user_id, title, memory_date, year, category, content_json, emotional_tags, cover_media_id, is_favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(data.id, userId, data.title, data.memoryDate ?? null, data.year ?? null, data.category ?? null, JSON.stringify(data.content ?? { text: '' }), JSON.stringify(data.emotionalTags ?? []), data.coverMediaId ?? null, data.isFavorite ? 1 : 0, data.createdAt ?? now, now);
    }
  }

  /**
   * Permanently delete an item from trash
   */
  async permanentlyDelete(trashId: string): Promise<{ ok: true }> {
    const userId = this.auth.getCurrentUserId();
    this.db.prepare(`DELETE FROM trash WHERE id = ? AND user_id = ?`).run(trashId, userId);
    return { ok: true };
  }

  /**
   * Empty entire trash for current user
   */
  async emptyTrash(): Promise<{ ok: true }> {
    const userId = this.auth.getCurrentUserId();
    this.db.prepare(`DELETE FROM trash WHERE user_id = ?`).run(userId);
    return { ok: true };
  }
}

export const registerTrashIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService): TrashService => {
  const trashService = new TrashService(db, auth);

  ipcMain.handle('trash:list', async (): Promise<TrashItem[]> => {
    return trashService.getTrashItems();
  });

  ipcMain.handle('trash:add', async (_event, entityType: string, entityId: string, entityData: any, title?: string | null): Promise<TrashItem> => {
    return trashService.moveToTrash(entityType, entityId, entityData, title);
  });

  ipcMain.handle('trash:restore', async (_event, trashId: string): Promise<{ ok: true; entityType: string; entityId: string; data: any }> => {
    return trashService.restoreFromTrash(trashId);
  });

  ipcMain.handle('trash:delete', async (_event, trashId: string): Promise<{ ok: true }> => {
    return trashService.permanentlyDelete(trashId);
  });

  ipcMain.handle('trash:empty', async (): Promise<{ ok: true }> => {
    return trashService.emptyTrash();
  });

  ipcMain.handle('trash:set-retention-days', async (_event, days: number): Promise<{ ok: true; days: number }> => {
    return trashService.setRetentionDays(days);
  });

  return trashService;
};
