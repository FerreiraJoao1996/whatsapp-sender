const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendWhatsAppMessages: (data) => ipcRenderer.invoke('send-whatsapp-messages', data),
});
