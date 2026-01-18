const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  downloadFile: (url, folderPath, filename) => 
    ipcRenderer.invoke('download-file', { url, folderPath, filename }),
  
  downloadBatch: (magazines, folderPath) => 
    ipcRenderer.invoke('download-batch', { magazines, folderPath }),
  
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  
  onGenerateProgress: (callback) => {
    ipcRenderer.on('generate-progress', (event, data) => callback(data));
  },
  
  generateIndex: (folderPath) => 
    ipcRenderer.invoke('generate-index', { folderPath })
});
