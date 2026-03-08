const $ = (id) => document.getElementById(id);

const els = {
  configPath: $('configPath'),
  cloudStatus: $('cloudStatus'),
  apps: $('apps'),
  logBox: $('logBox'),
  logFilters: $('logFilters'),
  btnLoadConfig: $('btnLoadConfig'),
  btnOpenFolder: $('btnOpenFolder'),
  btnCloudStart: $('btnCloudStart'),
  btnCloudStop: $('btnCloudStop'),
  btnCloudRestart: $('btnCloudRestart'),
  btnStartSelected: $('btnStartSelected'),
  btnStopSelected: $('btnStopSelected'),
  btnStartAll: $('btnStartAll'),
  btnStopAll: $('btnStopAll'),
  btnClearLogs: $('btnClearLogs')
};

const logEntries = [];
const logSources = new Set(['全部']);
let activeLogSource = '全部';

function renderLogFilters() {
  els.logFilters.innerHTML = '';
  for (const src of logSources) {
    const chip = document.createElement('button');
    chip.className = `chip ${src === activeLogSource ? 'active' : ''}`;
    chip.textContent = src;
    chip.onclick = () => {
      activeLogSource = src;
      renderLogFilters();
      renderLogs();
    };
    els.logFilters.appendChild(chip);
  }
}

function setCloudStatus(running) {
  els.cloudStatus.textContent = running ? '运行中' : '已停止';
  els.cloudStatus.className = `status ${running ? 'running' : 'stopped'}`;
}

function appItemTpl(app) {
  const root = document.createElement('div');
  root.className = 'app-item';

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = !!app.enabled;
  check.addEventListener('change', async () => {
    await window.managerApi.setEnabled(app.id, check.checked);
  });

  const meta = document.createElement('div');
  meta.className = 'app-meta';
  meta.innerHTML = `
    <strong>${app.name}</strong>
    <div class="cmd">${Array.isArray(app.command) ? app.command.join(' ') : (app.command || '')}</div>
  `;

  const status = document.createElement('span');
  status.className = `status ${app.running ? 'running' : 'stopped'}`;
  status.textContent = app.running ? '运行中' : '已停止';

  const actions = document.createElement('div');
  actions.className = 'row actions';
  const startBtn = document.createElement('button');
  startBtn.className = 'btn primary';
  startBtn.textContent = '启动';
  startBtn.onclick = () => window.managerApi.startApp(app.id);

  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn';
  stopBtn.textContent = '停止';
  stopBtn.onclick = () => window.managerApi.stopApp(app.id);

  actions.append(startBtn, stopBtn);
  root.append(check, meta, status, actions);
  return root;
}

function renderStatus(status) {
  els.configPath.textContent = status.configPath || '';
  setCloudStatus(status.cloudflaredRunning);
  els.apps.innerHTML = '';
  for (const app of status.apps || []) {
    els.apps.appendChild(appItemTpl(app));
  }
}

function renderLogs() {
  const lines = logEntries
    .filter((e) => activeLogSource === '全部' || e.source === activeLogSource)
    .map((e) => e.line);
  els.logBox.textContent = lines.join('\n');
  els.logBox.scrollTop = els.logBox.scrollHeight;
}

function appendLog(payload) {
  const line = typeof payload === 'string' ? payload : payload.line;
  const source = typeof payload === 'string' ? '系统' : (payload.source || '系统');
  logEntries.push({ source, line });
  logSources.add(source);
  renderLogFilters();
  renderLogs();
}

async function init() {
  const status = await window.managerApi.getStatus();
  renderStatus(status);

  window.managerApi.onStatus((s) => renderStatus(s));
  window.managerApi.onLog((line) => appendLog(line));

  els.btnLoadConfig.onclick = async () => {
    const s = await window.managerApi.loadConfig();
    renderStatus(s);
  };
  els.btnOpenFolder.onclick = () => window.managerApi.openFolder();
  els.btnCloudStart.onclick = () => window.managerApi.startCloudflared();
  els.btnCloudStop.onclick = () => window.managerApi.stopCloudflared();
  els.btnCloudRestart.onclick = () => window.managerApi.restartCloudflared();
  els.btnStartSelected.onclick = () => window.managerApi.startSelected();
  els.btnStopSelected.onclick = () => window.managerApi.stopSelected();
  els.btnStartAll.onclick = () => window.managerApi.startAll();
  els.btnStopAll.onclick = () => window.managerApi.stopAll();
  els.btnClearLogs.onclick = () => {
    logEntries.length = 0;
    logSources.clear();
    logSources.add('全部');
    activeLogSource = '全部';
    renderLogFilters();
    renderLogs();
  };

  renderLogFilters();
}

init();
