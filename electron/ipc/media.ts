import type { IpcMain } from 'electron';
import type { MediaFile } from '../../src/types/ipc';
import type { MediaManager } from '../services/media-manager';
import type { AuthService } from '../services/auth-service';

export const registerMediaIpc = (ipcMain: IpcMain, mediaManager: MediaManager, auth: AuthService): void => {
  ipcMain.handle('media:list', async (): Promise<MediaFile[]> => mediaManager.listImages(auth.getCurrentUserId()));
  ipcMain.handle('media:import-images', async (): Promise<MediaFile[]> => mediaManager.importImages(auth.getCurrentUserId()));
};
