import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createSqliteStorage, SqliteDbManager } from './src/server/sqlite-db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 初始化 SQLite 本地持久化数据库
const DB_PATH = process.env.SQLITE_DB_PATH || path.resolve(__dirname, 'data', 'datacenter_crm.db');
let sqliteManager: SqliteDbManager | null = null;
createSqliteStorage(DB_PATH)
  .then((mgr) => {
    sqliteManager = mgr;
    console.log(`[Lite SQLite] Database initialized at ${DB_PATH}`);
  })
  .catch((err) => {
    console.warn('[Lite SQLite] Failed to initialize SQLite storage:', err);
  });

// 精简版健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    edition: 'lite',
    storage: 'sqlite',
    message: 'DataCenter CRM Lite Edition is running with SQLite persistence',
  });
});

// SQLite REST API 路由
app.get('/api/storage/all', (_req, res) => {
  if (!sqliteManager) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const allData = sqliteManager.getAll();
  return res.json({ success: true, data: allData });
});

app.get('/api/storage/:key', (req, res) => {
  if (!sqliteManager) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const item = sqliteManager.loadItem(req.params.key, null);
  return res.json({ success: true, key: req.params.key, data: item });
});

app.post('/api/storage/save', (req, res) => {
  if (!sqliteManager) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'Missing key' });
  }
  sqliteManager.saveItem(key, value);
  return res.json({ success: true, key });
});

app.post('/api/storage/batch-save', (req, res) => {
  if (!sqliteManager) {
    return res.status(503).json({ success: false, error: 'SQLite not ready' });
  }
  const { items } = req.body;
  if (!items || typeof items !== 'object') {
    return res.status(400).json({ success: false, error: 'Missing items object' });
  }
  sqliteManager.saveBatch(items);
  return res.json({ success: true, count: Object.keys(items).length });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Lite] DataCenter CRM running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
