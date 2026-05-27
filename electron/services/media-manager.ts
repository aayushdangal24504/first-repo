import { BrowserWindow, dialog } from 'electron';
import { randomUUID, createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { MediaFile } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';

const imageMimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
};

type MediaRow = {
  id: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

const fileToDataUrl = (absolutePath: string, mimeType: string): string | null => {
  try {
    return `data:${mimeType};base64,${readFileSync(absolutePath).toString('base64')}`;
  } catch {
    return null;
  }
};

export const mediaRowToFile = (row: MediaRow, mediaRoot: string): MediaFile => ({
  id: row.id,
  originalName: row.originalName,
  storedName: row.storedName,
  relativePath: row.relativePath,
  fileUrl: pathToFileURL(join(mediaRoot, row.relativePath)).toString(),
  dataUrl: fileToDataUrl(join(mediaRoot, row.relativePath), row.mimeType),
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  width: row.width,
  height: row.height,
  createdAt: row.createdAt
});

export class MediaManager {
  constructor(private readonly db: AppDatabase, private readonly mediaRoot: string) {}

  listImages(userId: string): MediaFile[] {
    const rows = this.db.prepare(
      `SELECT id, original_name as originalName, stored_name as storedName, relative_path as relativePath,
              mime_type as mimeType, size_bytes as sizeBytes, width, height, created_at as createdAt
       FROM media_files
       WHERE mime_type LIKE 'image/%' AND user_id = ?
       ORDER BY created_at DESC`
    ).all(userId) as MediaRow[];

    return rows.map((row) => mediaRowToFile(row, this.mediaRoot));
  }

  async importImages(userId: string): Promise<MediaFile[]> {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(window, {
      title: 'Add photos to journal page',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return [];

    return result.filePaths.map((sourcePath) => this.importImageFile(sourcePath, userId));
  }

  private importImageFile(sourcePath: string, userId: string): MediaFile {
    const extension = extname(sourcePath).toLowerCase();
    const mimeType = imageMimeTypes[extension] ?? 'application/octet-stream';
    const id = randomUUID();
    const storedName = `${id}${extension || '.image'}`;
    const monthFolder = new Date().toISOString().slice(0, 7);
    const relativePath = join('images', monthFolder, storedName);
    const targetFolder = join(this.mediaRoot, 'images', monthFolder);
    const targetPath = join(this.mediaRoot, relativePath);

    mkdirSync(targetFolder, { recursive: true });
    copyFileSync(sourcePath, targetPath);

    const stat = statSync(targetPath);
    const checksum = createHash('sha256').update(`${sourcePath}:${stat.size}:${stat.mtimeMs}`).digest('hex');
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO media_files (id, user_id, original_name, stored_name, relative_path, mime_type, size_bytes, width, height, checksum, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`
    ).run(id, userId, basename(sourcePath), storedName, relativePath, mimeType, stat.size, checksum, now);

    return {
      id,
      originalName: basename(sourcePath),
      storedName,
      relativePath,
      fileUrl: pathToFileURL(targetPath).toString(),
      dataUrl: fileToDataUrl(targetPath, mimeType),
      mimeType,
      sizeBytes: stat.size,
      width: null,
      height: null,
      createdAt: now
    };
  }
}
