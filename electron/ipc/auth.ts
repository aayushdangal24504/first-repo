import type { IpcMain } from 'electron';
import type { AuthService } from '../services/auth-service';

export const registerAuthIpc = (ipcMain: IpcMain, auth: AuthService): void => {
  ipcMain.handle('auth:get-session', async () => ({ user: auth.restoreSession() }));
  ipcMain.handle('auth:register', async (_event, input) => auth.register(input));
  ipcMain.handle('auth:login', async (_event, input) => auth.login(input));
  ipcMain.handle('auth:logout', async () => { auth.logout(); return { ok: true }; });
  ipcMain.handle('auth:request-password-reset', async (_event, email: string) => auth.requestPasswordReset(email));
  ipcMain.handle('auth:reset-password', async (_event, input) => auth.resetPassword(input));
};
