import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';

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

// 1. Google Gemini (可选云端备用)
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI();
  } catch (err) {
    console.warn('Gemini client warning:', err);
  }
}

// 2. 本地 llama-server 进程管理
let llamaProcess: ChildProcess | null = null;

function startLocalLlamaServer() {
  const llamaBin = path.resolve(__dirname, 'bin', 'llama', 'llama-server.exe');
  const modelPath = path.resolve(__dirname, 'models', 'llm', 'qwen2.5-1.5b-instruct-q4_k_m.gguf');

  if (!fs.existsSync(llamaBin) || !fs.existsSync(modelPath)) {
    console.log('[LLM] Local llama-server or GGUF model not found, skipping local LLM daemon.');
    return;
  }

  try {
    console.log(`[LLM] Launching local llama-server on port ${LLAMA_PORT}...`);
    llamaProcess = spawn(llamaBin, [
      '-m', modelPath,
      '--port', String(LLAMA_PORT),
      '--host', '127.0.0.1',
      '-c', '2048',
      '-ngl', '0',
      '--threads', '4',
      '--log-disable',
    ], {
      stdio: 'ignore',
      detached: false,
    });

    llamaProcess.on('error', (err) => {
      console.warn('[LLM] Failed to start llama-server:', err.message);
    });

    process.on('exit', () => {
      if (llamaProcess) llamaProcess.kill();
    });
  } catch (e: any) {
    console.warn('[LLM] Start failed:', e.message);
  }
}

startLocalLlamaServer();

// 3. 执行本地 RapidOCR (独立免安装二进制优先，系统 Python 作为开发 fallback)
async function runLocalRapidOcr(imageBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const standaloneOcrExe = path.resolve(__dirname, 'bin', 'ocr', 'ocr_service.exe');
    const hasStandalone = fs.existsSync(standaloneOcrExe);

    const execCmd = hasStandalone ? standaloneOcrExe : (process.env.PYTHON_PATH || 'python');
    const execArgs = hasStandalone ? [] : [path.resolve(__dirname, 'scripts', 'ocr_engine.py')];
    const detModel = path.resolve(__dirname, 'models', 'ocr', 'ch_PP-OCRv3_det_infer.onnx');
    const recModel = path.resolve(__dirname, 'models', 'ocr', 'ch_PP-OCRv3_rec_infer.onnx');
    const clsModel = path.resolve(__dirname, 'models', 'ocr', 'ch_ppocr_mobile_v2.0_cls_infer.onnx');

    const py = spawn(execCmd, execArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    py.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    py.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    py.on('close', (code) => {
      const stdoutBuf = Buffer.concat(stdoutChunks);
      const stderrBuf = Buffer.concat(stderrChunks);

      // 智能解码：优先以 UTF-8 解码，若包含非法字符或解析失败则回退至 GBK
      let decodedText = '';
      try {
        decodedText = new TextDecoder('utf-8', { fatal: true }).decode(stdoutBuf).trim();
      } catch {
        try {
          decodedText = new TextDecoder('gbk').decode(stdoutBuf).trim();
        } catch {
          decodedText = stdoutBuf.toString('utf-8').trim();
        }
      }

      const stderrText = stderrBuf.toString('utf-8').trim();

      try {
        if (decodedText) {
          const parsed = JSON.parse(decodedText);
          if (parsed.success) {
            return resolve(parsed.raw_text || '');
          }
          if (parsed.error) {
            return reject(new Error(parsed.error));
          }
        }
      } catch (err) {
        // ignore JSON parse error
      }

      if (code !== 0) {
        return reject(new Error(`RapidOCR exited with code ${code}: ${stderrText || decodedText}`));
      }
      resolve('');
    });

    const payload = JSON.stringify({
      imageBase64,
      detModel: fs.existsSync(detModel) ? detModel.replace(/\\/g, '/') : undefined,
      recModel: fs.existsSync(recModel) ? recModel.replace(/\\/g, '/') : undefined,
      clsModel: fs.existsSync(clsModel) ? clsModel.replace(/\\/g, '/') : undefined,
    });

    py.stdin.write(payload);
    py.stdin.end();
  });
}

// 4. 调用本地 Qwen2.5-1.5B 抽取结构化名片 JSON
async function extractCardDataWithLocalLlm(rawText: string): Promise<any> {
  const prompt = `<|im_start|>system
你是一个专业的数据中心客户关系管理 (CRM) 名片与人物资料解析助手。请根据提供的名片OCR识别文本，提取字段并仅返回标准 JSON 对象，禁止返回任何 markdown 标记或额外解释。格式如下：
{
  "name": "姓名",
  "title": "职位头衔",
  "company": "公司或机构名称",
  "phone": "联系电话",
  "email": "电子邮箱",
  "bio": "核心职责与业务背景摘要 (50字以内)",
  "tags": ["标签1", "标签2", "本地CPU识别"]
}
<|im_end|>
<|im_start|>user
名片原始文本内容如下：
${rawText}
<|im_end|>
<|im_start|>assistant
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`http://127.0.0.1:${LLAMA_PORT}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        n_predict: 512,
        temperature: 0.1,
        stop: ['<|im_end|>', '<|endoftext|>'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`llama-server responded with HTTP ${res.status}`);

    const data: any = await res.json();
    const content = data.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('No JSON found in model output');
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * OCR / Image Parsing API endpoint (两阶段纯本地 CPU 方案 + 云端 fallback)
 */
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    // 阶段 1: 尝试本地纯 CPU RapidOCR
    let rawText = '';
    try {
      rawText = await runLocalRapidOcr(cleanBase64);
      console.log('[OCR] RapidOCR text extracted, length:', rawText.length);
    } catch (ocrErr: any) {
      console.warn('[OCR] Local RapidOCR failed or not ready:', ocrErr.message);
    }

    // 阶段 2: 若提取到文本，尝试本地 1.5B LLM 解析
    if (rawText && rawText.trim().length > 0) {
      try {
        const structuredData = await extractCardDataWithLocalLlm(rawText);
        console.log('[OCR] Local LLM extraction succeeded!');
        return res.json({
          success: true,
          provider: 'local-cpu-llm',
          data: structuredData,
          rawText,
        });
      } catch (llmErr: any) {
        console.warn('[OCR] Local LLM extraction failed or timed out:', llmErr.message);
      }
    }

    // 阶段 3: 云端 Gemini 备用
    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
                {
                  text: `请识别图片中的名片信息，并仅返回严格的 JSON 对象：
{
  "name": "姓名",
  "title": "职位头衔",
  "company": "公司或机构名称",
  "phone": "联系电话",
  "email": "电子邮箱",
  "bio": "核心职责与业务背景摘要",
  "tags": ["标签1", "标签2", "Gemini识别"]
}`,
                },
              ],
            },
          ],
        });

        const textOutput = response.text || '';
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return res.json({
            success: true,
            provider: 'gemini-ai',
            data: JSON.parse(jsonMatch[0]),
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini fallback failed:', geminiErr);
      }
    }

    // 阶段 4: 前端纯启发式规则兜底 (带原始识别文本)
    return res.json({
      success: true,
      provider: 'local-fallback',
      rawText: rawText || null,
      data: null,
    });
  } catch (error: any) {
    console.error('Server OCR error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal OCR processing error',
    });
  }
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
