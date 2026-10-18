import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface SqliteDbManager {
  saveItem: (key: string, value: any) => void;
  loadItem: <T = any>(key: string, defaultValue?: T) => T;
  getAll: () => Record<string, any>;
  saveBatch: (items: Record<string, any>) => void;
  close: () => void;
}

export async function createSqliteStorage(dbFilePath: string): Promise<SqliteDbManager> {
  const SQL = await initSqlJs();
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let db: any;
  if (fs.existsSync(dbFilePath)) {
    try {
      const buffer = fs.readFileSync(dbFilePath);
      db = new SQL.Database(buffer);
    } catch (e) {
      console.warn('[SQLite] Failed to load existing db, creating fresh one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  function persist() {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbFilePath, buffer);
    } catch (err) {
      console.error('[SQLite] Failed to write database file:', err);
    }
  }

  return {
    saveItem(key: string, value: any) {
      const serialized = JSON.stringify(value);
      const now = Date.now();
      db.run(
        `INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, serialized, now]
      );
      persist();
    },
    loadItem<T = any>(key: string, defaultValue?: T): T {
      const stmt = db.prepare('SELECT value FROM kv_store WHERE key = ? LIMIT 1');
      stmt.bind([key]);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        try {
          return JSON.parse(row.value);
        } catch {
          return row.value as unknown as T;
        }
      }
      stmt.free();
      return defaultValue as T;
    },
    getAll(): Record<string, any> {
      const result: Record<string, any> = {};
      const stmt = db.prepare('SELECT key, value FROM kv_store');
      while (stmt.step()) {
        const row = stmt.getAsObject();
        try {
          result[row.key] = JSON.parse(row.value);
        } catch {
          result[row.key] = row.value;
        }
      }
      stmt.free();
      return result;
    },
    saveBatch(items: Record<string, any>) {
      const now = Date.now();
      db.run('BEGIN TRANSACTION;');
      for (const [key, value] of Object.entries(items)) {
        const serialized = JSON.stringify(value);
        db.run(
          `INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, serialized, now]
        );
      }
      db.run('COMMIT;');
      persist();
    },
    close() {
      persist();
      db.close();
    }
  };
}
