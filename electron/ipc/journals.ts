import type { IpcMain } from 'electron';
import { BrowserWindow, dialog } from 'electron';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import type {
  CreateJournalInput,
  ExportJournalInput,
  ExportJournalResult,
  ImportJournalImagesInput,
  Journal,
  JournalBook,
  JournalEntry,
  JournalEntryImage,
  JournalKind,
  JournalPageBlock,
  MediaFile,
  UpdateJournalEntryInput,
  UpdateJournalInput
} from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { MediaManager } from '../services/media-manager';
import type { AuthService } from '../services/auth-service';
import { mediaRowToFile } from '../services/media-manager';
import type { TrashService } from './trash';

type JournalRow = {
  id: string;
  title: string;
  kind: JournalKind;
  coverMediaId: string | null;
  coverColor: string | null;
  templateId: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

type JournalEntryRow = {
  id: string;
  journalId: string;
  entryDate: string;
  title: string | null;
  contentJson: string;
  mood: string | null;
  weather: string | null;
  locationLabel: string | null;
  layoutJson: string;
  isFavorite: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

type EntryImageRow = {
  id: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  sortOrder: number;
  caption: string | null;
};

const journalSelect = `SELECT j.id, j.title, j.kind, j.cover_media_id as coverMediaId, j.cover_color as coverColor,
                              j.template_id as templateId, j.created_at as createdAt, j.updated_at as updatedAt,
                              COUNT(e.id) as entryCount
                       FROM journals j
                       LEFT JOIN journal_entries e ON e.journal_id = j.id`;

const entrySelect = `SELECT id, journal_id as journalId, entry_date as entryDate, title,
                            content_json as contentJson, mood, weather, location_label as locationLabel,
                            layout_json as layoutJson, is_favorite as isFavorite,
                            created_at as createdAt, updated_at as updatedAt
                     FROM journal_entries`;

const safeJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cleanKind = (value?: JournalKind): JournalKind => {
  if (value === 'travel' || value === 'memory' || value === 'thoughts' || value === 'custom') return value;
  return 'daily';
};

const mapJournal = (row: JournalRow): Journal => ({
  id: row.id,
  title: row.title,
  kind: row.kind,
  coverMediaId: row.coverMediaId,
  coverColor: row.coverColor,
  templateId: row.templateId,
  entryCount: Number(row.entryCount),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const getEntryImages = (db: AppDatabase, mediaRoot: string, entryId: string): JournalEntryImage[] => {
  const rows = db.prepare(
    `SELECT m.id, m.original_name as originalName, m.stored_name as storedName, m.relative_path as relativePath,
            m.mime_type as mimeType, m.size_bytes as sizeBytes, m.width, m.height, m.created_at as createdAt,
            jem.sort_order as sortOrder, jem.caption
     FROM journal_entry_media jem
     INNER JOIN media_files m ON m.id = jem.media_id
     WHERE jem.entry_id = ?
     ORDER BY jem.sort_order ASC, jem.created_at ASC`
  ).all(entryId) as EntryImageRow[];

  return rows.map((row) => ({
    ...mediaRowToFile(row, mediaRoot),
    sortOrder: row.sortOrder,
    caption: row.caption
  }));
};

const hydrateBlocks = (blocks: JournalPageBlock[], images: JournalEntryImage[]): JournalPageBlock[] =>
  blocks.map((block) => {
    if (block.type !== 'image' || !block.mediaId) return block;
    const image = images.find((candidate) => candidate.id === block.mediaId);
    return image ? { ...block, image } : block;
  });

const mapEntry = (db: AppDatabase, mediaRoot: string, row: JournalEntryRow): JournalEntry => {
  const content = safeJson<{ text?: string }>(row.contentJson, {});
  const layout = safeJson<{ blocks?: JournalPageBlock[] } & Record<string, unknown>>(row.layoutJson, {});
  const images = getEntryImages(db, mediaRoot, row.id);

  return {
    id: row.id,
    journalId: row.journalId,
    entryDate: row.entryDate,
    title: row.title,
    text: content.text ?? '',
    mood: row.mood,
    weather: row.weather,
    locationLabel: row.locationLabel,
    layout,
    blocks: hydrateBlocks(layout.blocks ?? [], images),
    isFavorite: Boolean(row.isFavorite),
    images,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

const getJournal = (db: AppDatabase, userId: string, id: string): Journal => {
  const row = db.prepare(`${journalSelect} WHERE j.id = ? AND j.user_id = ? GROUP BY j.id`).get(id, userId) as JournalRow | undefined;
  if (!row) throw new Error('Journal not found');
  return mapJournal(row);
};

const getEntry = (db: AppDatabase, mediaRoot: string, userId: string, id: string): JournalEntry => {
  const row = db.prepare(`${entrySelect} WHERE id = ? AND user_id = ?`).get(id, userId) as JournalEntryRow | undefined;
  if (!row) throw new Error('Journal page not found');
  return mapEntry(db, mediaRoot, row);
};

const getBook = (db: AppDatabase, mediaRoot: string, userId: string, journalId: string): JournalBook => {
  const journal = getJournal(db, userId, journalId);
  const rows = db.prepare(`${entrySelect} WHERE journal_id = ? AND user_id = ? ORDER BY entry_date ASC, created_at ASC`).all(journalId, userId) as JournalEntryRow[];
  return { journal, entries: rows.map((row) => mapEntry(db, mediaRoot, row)) };
};

const createEntry = (db: AppDatabase, userId: string, journalId: string, pageNumber: number): JournalEntryRow => {
  const id = randomUUID();
  const now = new Date().toISOString();
  const title = pageNumber === 1 ? 'Blank Page' : `Page ${pageNumber}`;
  const starterBlocks: JournalPageBlock[] = [];

  db.prepare(
    `INSERT INTO journal_entries (id, user_id, journal_id, entry_date, title, content_json, layout_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, journalId, now, title, JSON.stringify({ text: '' }), JSON.stringify({ style: 'vintage-book-page', blocks: starterBlocks }), now, now);
  db.prepare(`UPDATE journals SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(journalId, userId);
  return db.prepare(`${entrySelect} WHERE id = ? AND user_id = ?`).get(id, userId) as JournalEntryRow;
};

const renderBookHtml = (book: JournalBook): string => {
  const pages = book.entries.map((entry, index) => {
    const blocks = entry.blocks.map((block) => {
      const style = `left:${block.x}px;top:${block.y}px;width:${block.width}px;min-height:${block.height}px;transform:rotate(${block.rotation}deg);z-index:${block.zIndex};`;
      if (block.type === 'image' && block.image) {
        return `<figure class="block photo" style="${style}"><img src="${block.image.dataUrl ?? block.image.fileUrl}" /></figure>`;
      }
      return `<div class="block text" style="${style}">${escapeHtml(block.text || '').replace(/\n/g, '<br/>')}</div>`;
    }).join('');
    return `<section class="page"><header><span>${escapeHtml(entry.title || `Page ${index + 1}`)}</span><small>${new Date(entry.entryDate).toLocaleDateString()}</small></header>${blocks}<footer>Page ${index + 1}</footer></section>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{margin:0;background:#3f3020;color:#31281d;font-family:Georgia,serif;}
    .cover{page-break-after:always;height:100vh;display:grid;place-items:center;background:#3f3020;color:#f6e7c6;text-align:center;}
    .cover h1{font-size:56px;margin:0;}
    .page{page-break-after:always;position:relative;width:900px;height:1180px;margin:0 auto;background:#ead6aa;overflow:hidden;padding:42px;box-sizing:border-box;}
    .page:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 10%,rgba(90,54,26,.18),transparent 210px),radial-gradient(circle at 80% 75%,rgba(90,54,26,.16),transparent 240px),linear-gradient(90deg,rgba(96,61,30,.16),transparent 90px);pointer-events:none;}
    header{position:relative;z-index:20;display:flex;justify-content:space-between;border-bottom:1px solid rgba(76,48,25,.25);padding-bottom:14px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;}
    footer{position:absolute;bottom:28px;right:42px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;}
    .block{position:absolute;box-sizing:border-box;}
    .text{font-size:20px;line-height:1.55;white-space:normal;padding:14px;background:rgba(255,246,218,.25);border-radius:14px;}
    .photo{background:#fff8e6;padding:10px;box-shadow:0 18px 38px rgba(54,31,14,.28);}
    .photo img{display:block;width:100%;height:100%;object-fit:cover;}
  </style></head><body><section class="cover"><div><h1>${escapeHtml(book.journal.title)}</h1><p>${escapeHtml(book.journal.kind)} journal</p></div></section>${pages}</body></html>`;
};

export const registerJournalIpc = (ipcMain: IpcMain, db: AppDatabase, mediaManager: MediaManager, mediaRoot: string, auth: AuthService, trashService: TrashService): void => {
  ipcMain.handle('journals:list', async (): Promise<Journal[]> => {
    const rows = db.prepare(`${journalSelect} WHERE j.user_id = ? GROUP BY j.id ORDER BY j.updated_at DESC`).all(auth.getCurrentUserId()) as JournalRow[];
    return rows.map(mapJournal);
  });

  ipcMain.handle('journals:create', async (_event, input: CreateJournalInput): Promise<JournalBook> => {
    const title = input.title.trim();
    if (!title) throw new Error('Journal title is required');

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO journals (id, user_id, title, kind, cover_color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, auth.getCurrentUserId(), title, cleanKind(input.kind), input.coverColor ?? '#8f7a5a', now, now);
    createEntry(db, auth.getCurrentUserId(), id, 1);
    return getBook(db, mediaRoot, auth.getCurrentUserId(), id);
  });

  ipcMain.handle('journals:update', async (_event, input: UpdateJournalInput): Promise<JournalBook> => {
    const current = getJournal(db, auth.getCurrentUserId(), input.id);
    db.prepare(
      `UPDATE journals SET title = ?, kind = ?, cover_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
    ).run(
      input.title?.trim() || current.title,
      input.kind ? cleanKind(input.kind) : current.kind,
      input.coverColor ?? current.coverColor,
      input.id,
      auth.getCurrentUserId()
    );
    return getBook(db, mediaRoot, auth.getCurrentUserId(), input.id);
  });

  ipcMain.handle('journals:get-book', async (_event, journalId: string): Promise<JournalBook> => getBook(db, mediaRoot, auth.getCurrentUserId(), journalId));

  ipcMain.handle('journals:delete', async (_event, journalId: string): Promise<{ ok: true }> => {
    const journal = getJournal(db, auth.getCurrentUserId(), journalId);
    await trashService.moveToTrash('journal', journalId, journal, journal.title);
    db.prepare('DELETE FROM journals WHERE id = ? AND user_id = ?').run(journalId, auth.getCurrentUserId());
    return { ok: true };
  });

  ipcMain.handle('journals:create-entry', async (_event, journalId: string): Promise<JournalEntry> => {
    getJournal(db, auth.getCurrentUserId(), journalId);
    const count = db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE journal_id = ? AND user_id = ?').get(journalId, auth.getCurrentUserId()) as { count: number };
    const row = createEntry(db, auth.getCurrentUserId(), journalId, Number(count.count) + 1);
    return mapEntry(db, mediaRoot, row);
  });

  ipcMain.handle('journals:delete-entry', async (_event, entryId: string): Promise<{ ok: true; journalId: string }> => {
    const existing = getEntry(db, mediaRoot, auth.getCurrentUserId(), entryId);
    const count = db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE journal_id = ? AND user_id = ?').get(existing.journalId, auth.getCurrentUserId()) as { count: number };
    if (Number(count.count) <= 1) {
      throw new Error('A journal needs at least one page. Delete the whole journal instead.');
    }
    await trashService.moveToTrash('journal_entry', entryId, existing, existing.title || `Entry from ${existing.entryDate}`);
    db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(entryId, auth.getCurrentUserId());
    db.prepare('UPDATE journals SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(existing.journalId, auth.getCurrentUserId());
    return { ok: true, journalId: existing.journalId };
  });

  ipcMain.handle('journals:update-entry', async (_event, input: UpdateJournalEntryInput): Promise<JournalEntry> => {
    const existing = getEntry(db, mediaRoot, auth.getCurrentUserId(), input.id);
    const nextText = input.text ?? existing.text;
    const nextTitle = input.title === undefined ? existing.title : input.title?.trim() || null;
    const nextEntryDate = input.entryDate ?? existing.entryDate;
    const nextLayout = { ...existing.layout, style: 'vintage-book-page', blocks: input.blocks ?? existing.blocks };

    db.prepare(
      `UPDATE journal_entries
       SET title = ?, entry_date = ?, content_json = ?, layout_json = ?, mood = ?, weather = ?, location_label = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).run(
      nextTitle,
      nextEntryDate,
      JSON.stringify({ text: nextText }),
      JSON.stringify(nextLayout),
      input.mood === undefined ? existing.mood : input.mood?.trim() || null,
      input.weather === undefined ? existing.weather : input.weather?.trim() || null,
      input.locationLabel === undefined ? existing.locationLabel : input.locationLabel?.trim() || null,
      input.isFavorite === undefined ? (existing.isFavorite ? 1 : 0) : input.isFavorite ? 1 : 0,
      input.id,
      auth.getCurrentUserId()
    );

    db.prepare(`UPDATE journals SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(existing.journalId, auth.getCurrentUserId());
    return getEntry(db, mediaRoot, auth.getCurrentUserId(), input.id);
  });

  ipcMain.handle('journals:import-images', async (_event, input: ImportJournalImagesInput): Promise<JournalEntry> => {
    const entry = getEntry(db, mediaRoot, auth.getCurrentUserId(), input.entryId);
    const mediaFiles: MediaFile[] = await mediaManager.importImages(auth.getCurrentUserId());
    const currentMax = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM journal_entry_media WHERE entry_id = ?').get(input.entryId) as { maxOrder: number };
    const insert = db.prepare(`INSERT OR IGNORE INTO journal_entry_media (entry_id, media_id, sort_order) VALUES (?, ?, ?)`);

    mediaFiles.forEach((mediaFile, index) => insert.run(input.entryId, mediaFile.id, Number(currentMax.maxOrder) + index + 1));

    const newBlocks: JournalPageBlock[] = mediaFiles.map((mediaFile, index) => ({
      id: randomUUID(),
      type: 'image',
      mediaId: mediaFile.id,
      x: 120 + index * 36,
      y: 250 + index * 28,
      width: 260,
      height: 210,
      rotation: index % 2 === 0 ? -3 : 3,
      zIndex: 10 + index
    }));

    db.prepare(`UPDATE journal_entries SET layout_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(
      JSON.stringify({ ...entry.layout, style: 'vintage-book-page', blocks: [...entry.blocks, ...newBlocks] }),
      input.entryId,
      auth.getCurrentUserId()
    );
    db.prepare(`UPDATE journals SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(entry.journalId, auth.getCurrentUserId());

    return getEntry(db, mediaRoot, auth.getCurrentUserId(), input.entryId);
  });

  ipcMain.handle('journals:export-book', async (_event, input: ExportJournalInput): Promise<ExportJournalResult> => {
    const book = getBook(db, mediaRoot, auth.getCurrentUserId(), input.journalId);
    const safeTitle = book.journal.title.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'journal';
    const extension = input.format === 'pdf' ? 'pdf' : 'docx';
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = focusedWindow
      ? await dialog.showSaveDialog(focusedWindow, {
      title: `Export ${book.journal.title}`,
      defaultPath: `${safeTitle}.${extension}`,
      filters: [{ name: input.format === 'pdf' ? 'PDF' : 'Word Document', extensions: [extension] }]
        })
      : await dialog.showSaveDialog({
          title: `Export ${book.journal.title}`,
          defaultPath: `${safeTitle}.${extension}`,
          filters: [{ name: input.format === 'pdf' ? 'PDF' : 'Word Document', extensions: [extension] }]
        });

    if (result.canceled || !result.filePath) throw new Error('Export cancelled');

    const targetPath = extname(result.filePath) ? result.filePath : `${result.filePath}.${extension}`;
    const html = renderBookHtml(book);

    if (input.format === 'docx') {
      writeFileSync(targetPath, html);
      return { ok: true, path: targetPath, format: input.format };
    }

    const exportWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
    await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await exportWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'none' } });
    writeFileSync(targetPath, pdf);
    exportWindow.destroy();
    return { ok: true, path: targetPath, format: input.format };
  });
};
