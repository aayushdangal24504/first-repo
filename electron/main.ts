import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { createDatabase } from './database/client';
import { registerAppIpc } from './ipc/app';
import { registerAuthIpc } from './ipc/auth';
import { registerBackupIpc } from './ipc/backups';
import { registerCalendarIpc } from './ipc/calendar';
import { registerDashboardIpc } from './ipc/dashboard';
import { registerJournalIpc } from './ipc/journals';
import { registerMediaIpc } from './ipc/media';
import { registerMemoryIpc } from './ipc/memories';
import { registerMoodIpc } from './ipc/mood';
import { registerNoteIpc } from './ipc/notes';
import { registerReminderIpc } from './ipc/reminders';
import { registerTaskIpc } from './ipc/tasks';
import { registerTravelIpc } from './ipc/travel';
import { ensureLocalFolders } from './services/local-paths';
import { MediaManager } from './services/media-manager';
import { ReminderScheduler } from './services/reminder-scheduler';
import { AuthService } from './services/auth-service';

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: 'Avyukta Life',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#111312' : '#f6f1e8',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

app.whenReady().then(() => {
  const paths = ensureLocalFolders(app.getPath('userData'));
  const database = createDatabase(paths.databasePath);
  const authService = new AuthService(database);
  const mediaManager = new MediaManager(database, paths.mediaPath);
  const reminderScheduler = new ReminderScheduler(database);

  registerAppIpc(ipcMain, paths);
  registerAuthIpc(ipcMain, authService);
  registerBackupIpc(ipcMain, database, paths, authService);
  registerCalendarIpc(ipcMain, database, authService);
  registerDashboardIpc(ipcMain, database, authService);
  registerJournalIpc(ipcMain, database, mediaManager, paths.mediaPath, authService);
  registerMediaIpc(ipcMain, mediaManager, authService);
  registerMemoryIpc(ipcMain, database, authService);
  registerMoodIpc(ipcMain, database, authService);
  registerNoteIpc(ipcMain, database, authService);
  registerReminderIpc(ipcMain, database, reminderScheduler, authService);
  registerTaskIpc(ipcMain, database, authService);
  registerTravelIpc(ipcMain, database, authService);
  reminderScheduler.start();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
