import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'path';
import http from 'http';
import fs from 'fs';
import os from 'os';
import { spawn, ChildProcess } from 'child_process';

// ── Must be set BEFORE requiring the server, so tts.ts / export.ts pick them up ──

// User-writable data directory (voiceovers, exported videos)
const PEX_DATA_DIR = (() => {
  switch (process.platform) {
    case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support', '码帧 TutorReel');
    case 'win32':  return path.join(process.env.APPDATA ?? os.homedir(), '码帧 TutorReel');
    default:       return path.join(os.homedir(), '.config', 'tutorreel');
  }
})();

process.env.PEX_DATA_DIR = PEX_DATA_DIR;
process.env.PEX_APP_DIR  = app.isPackaged
  ? process.resourcesPath
  : path.resolve(__dirname, '..');

process.env.PEX_REMOTION_BUNDLE_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'remotion-bundle')
  : path.join(process.env.PEX_APP_DIR, 'build');

process.env.PORT = process.env.PORT ?? '3001';

// Create writable dirs upfront
fs.mkdirSync(path.join(PEX_DATA_DIR, 'public', 'voiceover'), { recursive: true });
fs.mkdirSync(path.join(PEX_DATA_DIR, 'out'), { recursive: true });

// ── Single-instance lock (prevents double-launch and port conflicts) ──
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });
}

// ── Start Express server ──
let devServerProc: ChildProcess | null = null;

function startServer() {
  if (app.isPackaged) {
    // Production: load the pre-bundled server directly in this process
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(path.join(__dirname, 'server.cjs'));
  } else {
    // Dev: spawn a tsx process so the server TypeScript is compiled on-the-fly
    const projectRoot = path.resolve(__dirname, '..');
    devServerProc = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
      shell: true,
    });
    devServerProc.on('error', (e) => console.error('[electron] server spawn error:', e));
  }
}

function waitForServer(retries = 40): Promise<void> {
  return new Promise((resolve, reject) => {
    let count = 0;
    function attempt() {
      const port = process.env.PORT ?? '3001';
      http.get(`http://localhost:${port}/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      }).on('error', retry);
    }
    function retry() {
      if (++count >= retries) return reject(new Error('Server did not start in time'));
      setTimeout(attempt, 500);
    }
    attempt();
  });
}

// ── Electron window ──
let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  const splash = new BrowserWindow({
    width: 420, height: 260,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: { nodeIntegration: false },
  });

  splash.loadURL('data:text/html,' + encodeURIComponent(`
    <html>
    <body style="margin:0;background:#0f172a;display:flex;align-items:center;
                 justify-content:center;height:100vh;border-radius:16px;
                 font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="text-align:center;color:#e2e8f0">
        <div style="font-size:2.5rem;margin-bottom:1rem;font-weight:700;
                    background:linear-gradient(135deg,#22B8CF,#0891B2);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent">
          码帧 · TutorReel
        </div>
        <div style="font-size:0.95rem;color:#94a3b8">正在启动服务…</div>
      </div>
    </body></html>
  `));

  try {
    await waitForServer();
  } catch {
    dialog.showErrorBox(
      '启动失败',
      '后端服务未能在 20 秒内就绪。\n请重新打开应用，如仍失败请检查防火墙是否阻止了本地网络访问。'
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const PORT = process.env.PORT ?? '3001';
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    splash.close();
    mainWindow!.show();
  });

  // Open external URLs in the system browser, not in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

startServer();

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  devServerProc?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
