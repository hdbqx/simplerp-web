const electron = require("electron");
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;
if (!app) {
  throw new Error("Electron app API is unavailable. Please unset ELECTRON_RUN_AS_NODE before launch.");
}

const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn, execFileSync } = require("child_process");

const BASE_DIR = __dirname;
const DEFAULT_CONFIG_PATH = path.join(BASE_DIR, "tunnel_manager.config.json");
const STATE_PATH = path.join(BASE_DIR, "tunnel_manager.state.json");

let mainWindow = null;
let configPath = DEFAULT_CONFIG_PATH;
let config = null;
let state = { enabled: {}, configPath: DEFAULT_CONFIG_PATH };

class ManagedProcess {
  constructor(key, spec, logFn) {
    this.key = key;
    this.spec = spec || {};
    this.log = logFn;
    this.proc = null;
  }

  get name() {
    return this.spec.name || this.key;
  }

  isRunning() {
    return !!this.proc && this.proc.exitCode === null;
  }

  start() {
    if (this.isRunning()) {
      this.log(this.name, "已在运行");
      return;
    }

    const command = this.spec.command;
    if (!command) {
      this.log(this.name, "配置缺少 command");
      return;
    }

    const cwd = this.spec.cwd || undefined;
    const env = { ...process.env, ...(this.spec.env || {}) };
    const options = {
      cwd,
      env,
      shell: !Array.isArray(command),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    };

    try {
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

    this.log(this.name, `已启动, PID=${this.proc.pid}`);

    this.proc.stdout?.on("data", (buf) => {
      String(buf)
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => this.log(this.name, line));
    });

    this.proc.stderr?.on("data", (buf) => {
      String(buf)
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => this.log(this.name, line));
    });

    this.proc.on("exit", (code, signal) => {
      this.log(this.name, `进程退出 code=${code ?? "null"} signal=${signal ?? "null"}`);
      this.proc = null;
      pushStatus();
    });
  }

  forceStopTree() {
    if (!this.proc || this.proc.exitCode !== null) return;
    const pid = this.proc.pid;
    this.log(this.name, `停止进程树 PID=${pid}`);
    try {
      if (process.platform === "win32") {
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      } else {
        this.proc.kill("SIGTERM");
      }
    } catch {
      try {
        this.proc.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
  }
}

const processes = new Map();

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function pushLog(source, text) {
  const timestamp = nowTime();
  const line = `[${timestamp}] [${source}] ${text}`;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("manager:log", { source, timestamp, text, line });
  }
}

function ensureDefaultConfig() {
  if (fs.existsSync(DEFAULT_CONFIG_PATH)) return;
  const demo = {
    start_cloudflared_on_launch: false,
    cloudflared: {
      name: "cloudflared",
      command: ".\\cloudflared.exe tunnel run --token %CF_TUNNEL_TOKEN%",
      cwd: "E:\\SdWebUi",
      env: {
        CF_TUNNEL_TOKEN: "请替换为你的Cloudflare Tunnel Token",
      },
    },
    apps: [
      {
        id: "ollama",
        name: "Ollama",
        enabled: true,
        requires_cloudflared: true,
        check_port: 11434,
        command: "ollama serve",
        cwd: "C:\\",
      },
      {
        id: "sdwebui",
        name: "SD WebUI",
        enabled: true,
        requires_cloudflared: true,
        command: "start.bat",
        cwd: "E:\\SdWebUi",
      },
    ],
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
  for (const [, proc] of processes) {
    proc.forceStopTree();
  }
  processes.clear();
}

function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`配置文件不存在: ${filePath}`);
  const parsed = readJson(filePath, null);
  if (!parsed) throw new Error("配置解析失败");

  configPath = filePath;
  config = parsed;
  clearProcesses();

  processes.set("cloudflared", new ManagedProcess("cloudflared", config.cloudflared || {}, pushLog));
  for (const appDef of config.apps || []) {
    if (!appDef.id) continue;
    processes.set(appDef.id, new ManagedProcess(appDef.id, appDef, pushLog));
    if (state.enabled[appDef.id] === undefined) {
      state.enabled[appDef.id] = !!appDef.enabled;
    }
  }

  pushLog("系统", `已加载配置: ${filePath}`);
  pushStatus();
}

function getStatus() {
  const cloud = processes.get("cloudflared");
  const apps = [];
  for (const appDef of config?.apps || []) {
    const proc = processes.get(appDef.id);
    apps.push({
      id: appDef.id,
      name: appDef.name || appDef.id,
      command: appDef.command,
      enabled: !!state.enabled[appDef.id],
      requires_cloudflared: appDef.requires_cloudflared !== false,
      running: proc?.isRunning() || false,
    });
  }
  return {
    configPath,
    cloudflaredRunning: cloud?.isRunning() || false,
    apps,
  };
}

function pushStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("manager:status", getStatus());
  }
}

function startCloudflared() {
  const proc = processes.get("cloudflared");
  proc?.start();
  pushStatus();
}

function stopCloudflared() {
  const proc = processes.get("cloudflared");
  proc?.forceStopTree();
  pushStatus();
}

function resolveCheckPort(appDef) {
  if (typeof appDef.check_port === "number") return appDef.check_port;
  if (appDef.id === "ollama") return 11434;
  return null;
}

function isPortOccupied(port, host = "127.0.0.1", timeoutMs = 900) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (occupied) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(occupied);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

async function startApp(id) {
  const appDef = (config?.apps || []).find((a) => a.id === id);
  const proc = processes.get(id);
  if (!appDef || !proc) return;

  if (appDef.requires_cloudflared !== false) {
    const cloud = processes.get("cloudflared");
    if (cloud && !cloud.isRunning()) {
      pushLog("系统", `应用 ${appDef.name || appDef.id} 依赖 cloudflared，请先手动启动 cloudflared`);
      return;
    }
  }

  const checkPort = resolveCheckPort(appDef);
  if (checkPort) {
    const occupied = await isPortOccupied(checkPort);
    if (occupied && !proc.isRunning()) {
      pushLog("系统", `端口 ${checkPort} 已被占用，疑似已有 ${appDef.name || appDef.id} 在运行。已取消重复启动。`);
      return;
    }
  }

  proc.start();
  pushStatus();
}

function stopApp(id) {
  const proc = processes.get(id);
  proc?.forceStopTree();
  pushStatus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 760,
    minWidth: 980,
    minHeight: 620,
    title: "Tunnel 管理器",
    backgroundColor: "#f6f8ff",
    webPreferences: {
      preload: path.join(BASE_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(BASE_DIR, "renderer", "index.html"));
  mainWindow.on("closed", () => {
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

app.on("before-quit", () => {
  clearProcesses();
  saveState();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});

ipcMain.handle("manager:get-status", () => getStatus());
ipcMain.handle("manager:get-config-path", () => configPath);

ipcMain.handle("manager:load-config", async () => {
  const ret = await dialog.showOpenDialog({
    title: "选择配置文件",
    defaultPath: BASE_DIR,
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (ret.canceled || !ret.filePaths[0]) return getStatus();
  loadConfig(ret.filePaths[0]);
  saveState();
  return getStatus();
});

ipcMain.handle("manager:open-folder", async () => {
  await shell.openPath(BASE_DIR);
  return true;
});

ipcMain.handle("manager:set-enabled", (_, payload) => {
  state.enabled[payload.id] = !!payload.enabled;
  saveState();
  pushStatus();
  return true;
});

ipcMain.handle("manager:start-cloudflared", () => {
  startCloudflared();
  return true;
});
ipcMain.handle("manager:stop-cloudflared", () => {
  stopCloudflared();
  return true;
});
ipcMain.handle("manager:restart-cloudflared", () => {
  stopCloudflared();
  setTimeout(startCloudflared, 500);
  return true;
});

ipcMain.handle("manager:start-app", async (_, id) => {
  await startApp(id);
  return true;
});
ipcMain.handle("manager:stop-app", (_, id) => {
  stopApp(id);
  return true;
});

ipcMain.handle("manager:start-selected", async () => {
  for (const appDef of config?.apps || []) {
    if (state.enabled[appDef.id]) {
      // eslint-disable-next-line no-await-in-loop
      await startApp(appDef.id);
    }
  }
  return true;
});

ipcMain.handle("manager:stop-selected", () => {
  for (const appDef of config?.apps || []) {
    if (state.enabled[appDef.id]) stopApp(appDef.id);
  }
  return true;
});

ipcMain.handle("manager:start-all", async () => {
  for (const appDef of config?.apps || []) {
    // eslint-disable-next-line no-await-in-loop
    await startApp(appDef.id);
  }
  return true;
});

ipcMain.handle("manager:stop-all", () => {
  for (const appDef of config?.apps || []) stopApp(appDef.id);
  return true;
});
