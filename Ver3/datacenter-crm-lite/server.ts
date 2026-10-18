import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { createSqliteStorage, type SqliteDbManager } from './src/server/sqlite-db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const LLAMA_PORT = Number(process.env.LLAMA_PORT) || 8088;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 初始化 SQLite 本地持久化数据库
const DB_PATH = process.env.SQLITE_DB_PATH || path.resolve(__dirname, 'data', 'datacenter_crm.db');
let sqliteManager: SqliteDbManager | null = null;
const sqliteInitPromise = createSqliteStorage(DB_PATH)
  .then((mgr) => {
    sqliteManager = mgr;
    console.log(`[SQLite] Database initialized at ${DB_PATH}`);
    return mgr;
  })
  .catch((err) => {
    console.warn('[SQLite] Failed to initialize SQLite storage:', err);
    return null;
  });

// SQLite REST API 路由
app.get('/api/storage/all', async (_req, res) => {
  const mgr = sqliteManager || (await sqliteInitPromise);
  if (!mgr) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const allData = mgr.getAll();
  return res.json({ success: true, data: allData });
});

app.get('/api/storage/:key', async (req, res) => {
  const mgr = sqliteManager || (await sqliteInitPromise);
  if (!mgr) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const item = mgr.loadItem(req.params.key, null);
  return res.json({ success: true, key: req.params.key, data: item });
});

app.post('/api/storage/save', async (req, res) => {
  const mgr = sqliteManager || (await sqliteInitPromise);
  if (!mgr) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'Missing key' });
  }
  mgr.saveItem(key, value);
  return res.json({ success: true, key });
});

app.post('/api/storage/batch-save', async (req, res) => {
  const mgr = sqliteManager || (await sqliteInitPromise);
  if (!mgr) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const { items } = req.body;
  if (!items || typeof items !== 'object') {
    return res.status(400).json({ success: false, error: 'Missing items object' });
  }
  mgr.saveBatch(items);
  return res.json({ success: true, count: Object.keys(items).length });
});



async function startServer() {
  const distPath = fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(process.cwd(), 'dist');

  console.log(`[Server] Serving static files from: ${distPath}`);

  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CRM Server running at http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
