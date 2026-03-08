const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;
if (!app) {
  // Usually caused by ELECTRON_RUN_AS_NODE=1.
  // Keep a clear error so launcher can surface it.
  throw new Error('Electron app API is unavailable. Please unset ELECTRON_RUN_AS_NODE before launch.');
}
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE_DIR = __dirname;
const DEFAULT_CONFIG_PATH = path.join(BASE_DIR, 'tunnel_manager.config.json');
const STATE_PATH = path.join(BASE_DIR, 'tunnel_manager.state.json');

let mainWindow = null;
let configPath = DEFAULT_CONFIG_PATH;
let config = null;
let state = { enabled: {}, configPath: DEFAULT_CONFIG_PATH };

class ManagedProcess {
  constructor(key, spec, logFn) {
    this.key = key;
    this.spec = spec;
    this.log = logFn;
    this.proc = null;
  }

  get name() {
    return this.spec?.name || this.key;
  }

  isRunning() {
    return !!this.proc && this.proc.exitCode === null;
  }

  start() {
    if (this.isRunning()) {
      this.log(this.name, '已在运行');
      return;
    }
    const command = this.spec?.command;
    if (!command) {
      this.log(this.name, '配置缺少 command');
      return;
    }
    const cwd = this.spec?.cwd || undefined;
    const env = { ...process.env, ...(this.spec?.env || {}) };
    try {
      const options = {
        cwd,
        env,
        shell: !Array.isArray(command),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      };
      if (Array.isArray(command)) {
        this.proc = spawn(command[0], command.slice(1), options);
      } else {
        this.proc = spawn(command, [], options);
      }
    } catch (err) {
      this.log(this.name, `启动失败: ${String(err?.message || err)}`);
      this.proc = null;
      return;
    }

    this.log(this.name, `已启动，PID=${this.proc.pid}`);
    this.proc.stdout?.on('data', (buf) => {
      const lines = String(buf).split(/\r?\n/).filter(Boolean);
      lines.forEach((line) => this.log(this.name, line));
    });
    this.proc.stderr?.on('data', (buf) => {
      const lines = String(buf).split(/\r?\n/).filter(Boolean);
      lines.forEach((line) => this.log(this.name, line));
    });
    this.proc.on('exit', (code, signal) => {
      this.log(this.name, `进程退出 code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      this.proc = null;
      pushStatus();
    });
  }

  stop() {
    if (!this.isRunning()) {
      this.log(this.name, '已停止');
      return;
    }
    this.log(this.name, '正在停止...');
    this.proc.kill('SIGTERM');
    setTimeout(() => {
      if (this.isRunning()) {
        this.log(this.name, '终止超时，强制结束');
        this.proc.kill('SIGKILL');
      }
    }, 8000);
  }
}

const processes = new Map();

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function readJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function pushLog(name, text) {
  const timestamp = nowTime();
  const line = `[${timestamp}] [${name}] ${text}`;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('manager:log', {
      source: name,
      timestamp,
      text,
      line
    });
  }
}

function ensureDefaultConfig() {
  if (fs.existsSync(DEFAULT_CONFIG_PATH)) return;
  const demo = {
    start_cloudflared_on_launch: false,
    cloudflared: {
      name: 'Cloudflared',
      command: 'C:\\\\path\\\\to\\\\cloudflared.exe tunnel run my-tunnel',
      cwd: 'C:\\\\path\\\\to\\\\cloudflared'
    },
    apps: [
      {
        id: 'ollama',
        name: 'Ollama',
        enabled: true,
        requires_cloudflared: true,
        command: 'ollama serve',
        cwd: 'C:\\\\'
      },
      {
        id: 'sdwebui',
        name: 'SD WebUI',
        enabled: false,
        requires_cloudflared: true,
        command: 'E:\\\\apps\\\\sdwebui\\\\start_all.bat',
        cwd: 'E:\\\\apps\\\\sdwebui'
      }
    ]
  };
  writeJson(DEFAULT_CONFIG_PATH, demo);
}

function loadState() {
  state = readJson(STATE_PATH, { enabled: {}, configPath: DEFAULT_CONFIG_PATH });
  if (state.configPath && fs.existsSync(state.configPath)) {
    configPath = state.configPath;
  }
}

function saveState() {
  state.configPath = configPath;
  writeJson(STATE_PATH, state);
}

function clearProcesses() {
  for (const [, p] of processes) {
    p.stop();
  }
  processes.clear();
}

function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`配置文件不存在: ${filePath}`);
  const parsed = readJson(filePath, null);
  if (!parsed) throw new Error('配置解析失败');
  configPath = filePath;
  config = parsed;
  clearProcesses();

  processes.set('cloudflared', new ManagedProcess('cloudflared', config.cloudflared || {}, pushLog));
  for (const appDef of config.apps || []) {
    if (!appDef.id) continue;
    processes.set(appDef.id, new ManagedProcess(appDef.id, appDef, pushLog));
    if (state.enabled[appDef.id] === undefined) {
      state.enabled[appDef.id] = !!appDef.enabled;
    }
  }

  pushLog('系统', `已加载配置: ${filePath}`);
  pushStatus();
}

function getStatus() {
  const cloud = processes.get('cloudflared');
  const apps = [];
  for (const appDef of config?.apps || []) {
    const proc = processes.get(appDef.id);
    apps.push({
      id: appDef.id,
      name: appDef.name || appDef.id,
      command: appDef.command,
      enabled: !!state.enabled[appDef.id],
      requires_cloudflared: appDef.requires_cloudflared !== false,
      running: proc?.isRunning() || false
    });
  }
  return {
    configPath,
    cloudflaredRunning: cloud?.isRunning() || false,
    apps
  };
}

function pushStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('manager:status', getStatus());
  }
}

function startCloudflared() {
  const p = processes.get('cloudflared');
  p?.start();
  pushStatus();
}

function stopCloudflared() {
  const p = processes.get('cloudflared');
  p?.stop();
  pushStatus();
}

function startApp(id) {
  const appDef = (config?.apps || []).find((a) => a.id === id);
  const proc = processes.get(id);
  if (!appDef || !proc) return;
  if (appDef.requires_cloudflared !== false) {
    const cloud = processes.get('cloudflared');
    if (cloud && !cloud.isRunning()) {
      pushLog('系统', `应用 ${appDef.name || appDef.id} 依赖 cloudflared，请先手动启动 cloudflared`);
      return;
    }
  }
  proc.start();
  pushStatus();
}

function stopApp(id) {
  const proc = processes.get(id);
  proc?.stop();
  pushStatus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 760,
    minWidth: 980,
    minHeight: 620,
    title: 'Tunnel 管理器',
    backgroundColor: '#f6f8ff',
    webPreferences: {
      preload: path.join(BASE_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(BASE_DIR, 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureDefaultConfig();
  loadState();
  loadConfig(configPath);
  createWindow();
  if (config?.start_cloudflared_on_launch) {
    setTimeout(startCloudflared, 300);
  }
});

app.on('window-all-closed', () => {
  clearProcesses();
  saveState();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

ipcMain.handle('manager:get-status', () => getStatus());
ipcMain.handle('manager:get-config-path', () => configPath);

ipcMain.handle('manager:load-config', async () => {
  const ret = await dialog.showOpenDialog({
    title: '选择配置文件',
    defaultPath: BASE_DIR,
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (ret.canceled || !ret.filePaths[0]) return getStatus();
  loadConfig(ret.filePaths[0]);
  saveState();
  return getStatus();
});

ipcMain.handle('manager:open-folder', async () => {
  await shell.openPath(BASE_DIR);
  return true;
});

ipcMain.handle('manager:set-enabled', (_, payload) => {
  state.enabled[payload.id] = !!payload.enabled;
  saveState();
  pushStatus();
  return true;
});

ipcMain.handle('manager:start-cloudflared', () => {
  startCloudflared();
  return true;
});
ipcMain.handle('manager:stop-cloudflared', () => {
  stopCloudflared();
  return true;
});
ipcMain.handle('manager:restart-cloudflared', () => {
  stopCloudflared();
  setTimeout(startCloudflared, 500);
  return true;
});

ipcMain.handle('manager:start-app', (_, id) => {
  startApp(id);
  return true;
});
ipcMain.handle('manager:stop-app', (_, id) => {
  stopApp(id);
  return true;
});

ipcMain.handle('manager:start-selected', () => {
  for (const appDef of config?.apps || []) {
    if (state.enabled[appDef.id]) startApp(appDef.id);
  }
  return true;
});

ipcMain.handle('manager:stop-selected', () => {
  for (const appDef of config?.apps || []) {
    if (state.enabled[appDef.id]) stopApp(appDef.id);
  }
  return true;
});

ipcMain.handle('manager:start-all', () => {
  for (const appDef of config?.apps || []) startApp(appDef.id);
  return true;
});

ipcMain.handle('manager:stop-all', () => {
  for (const appDef of config?.apps || []) stopApp(appDef.id);
  return true;
});
