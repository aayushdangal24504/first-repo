import type { IpcMain } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BackupResult, LocalPaths } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';

const exportTables = [
  'local_profile',
  'settings',
  'folders',
  'tags',
  'tasks',
  'notes',
  'journals',
  'journal_entries',
  'journal_entry_media',
  'trips',
  'trip_days',
  'memories',
  'reminders',
  'mood_logs',
  'media_files',
  'templates',
  'entity_tags'
];

const userScopedTables = new Set(exportTables.filter((table) => !['local_profile', 'settings'].includes(table)));

export const registerBackupIpc = (ipcMain: IpcMain, db: AppDatabase, paths: LocalPaths, auth: AuthService): void => {
  ipcMain.handle('backups:export-json', async (): Promise<BackupResult> => {
    const createdAt = new Date().toISOString();
    const user = auth.getCurrentUser();
    const userId = auth.getCurrentUserId();
    const payload = {
      app: 'Avyukta Life',
      version: 1,
      user: user ? { id: user.id, email: user.email, displayName: user.displayName } : null,
      createdAt,
      tables: Object.fromEntries(exportTables.map((table) => [
        table,
        userScopedTables.has(table) ? db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(userId) : db.prepare(`SELECT * FROM ${table}`).all()
      ]))
    };
    const fileName = `avyukta-backup-${createdAt.replace(/[:.]/g, '-')}.json`;
    const filePath = join(paths.exportsPath, fileName);
    writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return { ok: true, path: filePath, createdAt, tables: exportTables };
  });
};
