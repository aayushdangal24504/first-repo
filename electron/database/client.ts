import Database from 'better-sqlite3';
import { schemaStatements } from './schema';

export type AppDatabase = Database.Database;

const seedDatabase = (db: AppDatabase): void => {
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM local_profile').get() as { count: number };
  if (profileCount.count === 0) {
    db.prepare('INSERT INTO local_profile (id, display_name) VALUES (?, ?)').run('local', 'Aayush');
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insert.run('theme', JSON.stringify({ mode: 'system', accent: 'sage', density: 'comfortable' }));
    insert.run('dashboard.widgets', JSON.stringify(['overview', 'tasks', 'journal', 'mood', 'calendar']));
  }
};

const ensureColumn = (db: AppDatabase, tableName: string, columnName: string, definition: string): void => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const runLightweightMigrations = (db: AppDatabase): void => {
  [
    'folders',
    'tags',
    'tasks',
    'notes',
    'journals',
    'journal_entries',
    'trips',
    'trip_days',
    'memories',
    'reminders',
    'mood_logs',
    'media_files',
    'templates',
    'entity_tags'
  ].forEach((table) => ensureColumn(db, table, 'user_id', 'TEXT REFERENCES users(id) ON DELETE CASCADE'));
  ensureColumn(db, 'reminders', 'category', 'TEXT');
  ensureColumn(db, 'reminders', 'priority', `TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high'))`);
  ensureColumn(db, 'reminders', 'last_notified_at', 'TEXT');
  ensureColumn(db, 'memories', 'memory_date', 'TEXT');
  ensureColumn(db, 'memories', 'year', 'INTEGER');
  ensureColumn(db, 'memories', 'category', 'TEXT');
  ensureColumn(db, 'memories', 'content_json', `TEXT NOT NULL DEFAULT '{}'`);
  ensureColumn(db, 'memories', 'emotional_tags', `TEXT NOT NULL DEFAULT '[]'`);
  ensureColumn(db, 'memories', 'cover_media_id', 'TEXT');
  ensureColumn(db, 'memories', 'is_favorite', 'INTEGER NOT NULL DEFAULT 0');
};

export const createDatabase = (databasePath: string): AppDatabase => {
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const migrate = db.transaction(() => {
    schemaStatements.forEach((statement) => db.exec(statement));
    runLightweightMigrations(db);
    seedDatabase(db);
  });

  migrate();
  return db;
};
