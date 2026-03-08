const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('managerApi', {
  getStatus: () => ipcRenderer.invoke('manager:get-status'),
  getConfigPath: () => ipcRenderer.invoke('manager:get-config-path'),
  loadConfig: () => ipcRenderer.invoke('manager:load-config'),
  openFolder: () => ipcRenderer.invoke('manager:open-folder'),
  setEnabled: (id, enabled) => ipcRenderer.invoke('manager:set-enabled', { id, enabled }),
  startCloudflared: () => ipcRenderer.invoke('manager:start-cloudflared'),
  stopCloudflared: () => ipcRenderer.invoke('manager:stop-cloudflared'),
  restartCloudflared: () => ipcRenderer.invoke('manager:restart-cloudflared'),
  startApp: (id) => ipcRenderer.invoke('manager:start-app', id),
  stopApp: (id) => ipcRenderer.invoke('manager:stop-app', id),
  startSelected: () => ipcRenderer.invoke('manager:start-selected'),
  stopSelected: () => ipcRenderer.invoke('manager:stop-selected'),
  startAll: () => ipcRenderer.invoke('manager:start-all'),
  stopAll: () => ipcRenderer.invoke('manager:stop-all'),
  onLog: (handler) => ipcRenderer.on('manager:log', (_, line) => handler(line)),
  onStatus: (handler) => ipcRenderer.on('manager:status', (_, status) => handler(status))
});
