const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;

// 防止多开实例
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function startBackendServer() {
  const rootDir = path.resolve(__dirname, '..');
  const serverScript = path.join(rootDir, 'server.mjs');
  const fs = require('fs');
  const candidateNode = path.join(rootDir, 'bin', 'node', 'node.exe');
  const nodeExe = fs.existsSync(candidateNode) ? candidateNode : process.execPath;
  const logPath = path.join(rootDir, 'server_startup.log');

  try {
    fs.appendFileSync(logPath, `[Electron ${new Date().toISOString()}] Launching server: ${serverScript} via ${nodeExe}\n`);
    
    serverProcess = spawn(nodeExe, [serverScript], {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (d) => {
        try { fs.appendFileSync(logPath, d.toString()); } catch (e) {}
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (d) => {
        try { fs.appendFileSync(logPath, `[Server ERR] ${d.toString()}`); } catch (e) {}
      });
    }

    serverProcess.on('error', (err) => {
      try { fs.appendFileSync(logPath, `[Electron Server Error] ${err.message}\n`); } catch (e) {}
    });

    serverProcess.on('close', (code) => {
      try { fs.appendFileSync(logPath, `[Electron Server Exit] Code ${code}\n`); } catch (e) {}
    });
  } catch (err) {
    try { fs.appendFileSync(logPath, `[Electron Spawn Error] ${err.message}\n`); } catch (e) {}
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '数据中心项目客户关系管理系统',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    backgroundColor: '#0F172A',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null); // 隐藏默认菜单栏

  const targetUrl = `http://127.0.0.1:${PORT}`;

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    try {
      const fs = require('fs');
      const logPath = path.join(__dirname, '..', 'server_startup.log');
      fs.appendFileSync(logPath, `[Electron Load Error] ${errorCode} ${errorDescription} ${validatedURL}\n`);
    } catch (e) {}
  });

  const loadAppWithRetry = (retries = 50) => {
    fetch(targetUrl)
      .then((res) => {
        if (res.ok) {
          mainWindow.loadURL(targetUrl);
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
        } else {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
      })
      .catch((e) => {
        if (retries > 0) {
          setTimeout(() => loadAppWithRetry(retries - 1), 300);
        } else {
          try {
            const fs = require('fs');
            const logPath = path.join(__dirname, '..', 'server_startup.log');
            fs.appendFileSync(logPath, `[Electron] Failed to connect: ${e.message}\n`);
          } catch (err) {}
          mainWindow.loadURL(targetUrl);
          mainWindow.show();
        }
      });
  };

  loadAppWithRetry();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanupSubprocesses() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
    serverProcess = null;
  }
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', cleanupSubprocesses);
app.on('will-quit', cleanupSubprocesses);
app.on('window-all-closed', () => {
  cleanupSubprocesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
