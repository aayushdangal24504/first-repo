import type { IpcMain } from 'electron';
import type { AppSnapshot, LocalPaths } from '../../src/types/ipc';

export const registerAppIpc = (ipcMain: IpcMain, paths: LocalPaths): void => {
  ipcMain.handle('app:get-local-paths', async () => paths);

  ipcMain.handle('app:get-snapshot', async (): Promise<AppSnapshot> => ({
    appName: 'Avyukta Life',
    storageMode: 'fully-local',
    localPaths: paths,
    phase: 'Phase 1 - Foundation'
  }));
};
