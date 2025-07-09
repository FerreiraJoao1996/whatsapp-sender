const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onReady: (callback) => ipcRenderer.on('puppeteer-ready', callback),
  onFail: (callback) => ipcRenderer.on('puppeteer-failed', callback),
  sendMessages: (payload) => ipcRenderer.invoke('send-whatsapp-messages', payload)
});
