const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  downloadFile: (url, folderPath, filename) => 
    ipcRenderer.invoke('download-file', { url, folderPath, filename }),
  downloadBatch: (magazines, folderPath) => 
    ipcRenderer.invoke('download-batch', { magazines, folderPath }),
  onDownloadProgress: (callback) => 
    ipcRenderer.on('download-progress', (event, data) => callback(data))
});
