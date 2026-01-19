const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanMagazines: () => ipcRenderer.invoke('scan-magazines'),
  getPdfPath: (filename) => ipcRenderer.invoke('get-pdf-path', filename),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  getThumbnailPath: (filename) => ipcRenderer.invoke('get-thumbnail-path', filename),
  saveThumbnail: (payload) => ipcRenderer.invoke('save-thumbnail', payload),
  generateThumbnail: (filename) => ipcRenderer.invoke('generate-thumbnail', filename),
  startIndexing: (magazines) => ipcRenderer.invoke('start-indexing', magazines),
  searchIndexedContent: (query) => ipcRenderer.invoke('search-indexed-content', query),
  onIndexingProgress: (callback) => ipcRenderer.on('indexing-progress', (event, data) => callback(data)),
  onIndexingComplete: (callback) => ipcRenderer.on('indexing-complete', (event, data) => callback(data))
});

