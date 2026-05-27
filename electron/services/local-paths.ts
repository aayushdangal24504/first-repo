import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { LocalPaths } from '../../src/types/ipc';

export const ensureLocalFolders = (userDataPath: string): LocalPaths => {
  const rootPath = join(userDataPath, 'local-data');
  const databasePath = join(rootPath, 'avyukta-life.sqlite');
  const mediaPath = join(rootPath, 'media');
  const backupsPath = join(rootPath, 'backups');
  const exportsPath = join(rootPath, 'exports');
  const tempPath = join(rootPath, 'temp');

  [rootPath, mediaPath, backupsPath, exportsPath, tempPath].forEach((path) => {
    mkdirSync(path, { recursive: true });
  });

  return { rootPath, databasePath, mediaPath, backupsPath, exportsPath, tempPath };
};
