const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh Magazine List',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('refresh-magazines');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Toastmasters Magazine Viewer',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Toastmasters Magazine Viewer',
              detail: 'Version 1.0.0\n\nA portable viewer for Toastmasters Magazine archives.\n\nPlace PDF files in the "magazines" folder with format YYYY-MM-Title.pdf'
            });
          }
        },
        {
          label: 'How to Use',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'How to Use',
              message: 'Using the Magazine Viewer',
              detail: '1. Place PDF files in the "magazines" folder\n2. Use the format YYYY-MM-Title.pdf for automatic organization\n3. Use the search box to filter by year, month, or content\n4. Click any magazine to view it\n5. Press F5 to refresh the magazine list'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Open Magazines Folder',
          click: () => {
            const magazinesPath = path.join(process.cwd(), 'magazines');
            shell.openPath(magazinesPath);
          }
        },
        { type: 'separator' },
        {
          label: 'Toastmasters Magazine History',
          click: () => {
            shell.openExternal('https://www.toastmasters.org/magazine/magazine-issues/2024/apr/magazine-history');
          }
        },
        {
          label: 'Toastmasters Magazine Archive',
          click: () => {
            shell.openExternal('https://www.toastmasters.org/magazine/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'Visit Toastmasters.org',
          click: () => {
            shell.openExternal('https://www.toastmasters.org');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  createMenu();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Scan magazines folder for PDFs
ipcMain.handle('scan-magazines', async () => {
  try {
    // Look for magazines folder relative to the executable
    const magazinesPath = path.join(process.cwd(), 'magazines');
    
    // Check if folder exists
    try {
      await fs.access(magazinesPath);
    } catch {
      return { success: false, error: 'Magazines folder not found. Please create a "magazines" folder next to the application.' };
    }

    const files = await fs.readdir(magazinesPath);
    const magazines = [];

    // Filter for PDF files matching YYYY-MM pattern
    const pdfPattern = /^(\d{4})-(\d{2}).*\.pdf$/i;
    
    for (const file of files) {
      const match = file.match(pdfPattern);
      if (match) {
        const [, year, month] = match;
        magazines.push({
          filename: file,
          year: parseInt(year),
          month: parseInt(month),
          path: path.join(magazinesPath, file)
        });
      }
    }

    // Sort by year and month descending
    magazines.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return { success: true, magazines };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get PDF file path for loading
ipcMain.handle('get-pdf-path', async (event, filename) => {
  const magazinesPath = path.join(process.cwd(), 'magazines');
  return path.join(magazinesPath, filename);
});

// Open a file with the default system handler
ipcMain.handle('open-path', async (event, filePath) => {
  const { shell } = require('electron');
  return shell.openPath(filePath);
});

// Return cached thumbnail path if it exists
ipcMain.handle('get-thumbnail-path', async (_event, filename) => {
  try {
    const thumbsDir = path.join(process.cwd(), 'thumbnails');
    const base = path.parse(filename).name;
    const thumbPath = path.join(thumbsDir, base + '.jpg');
    await fs.access(thumbPath);
    return { exists: true, path: thumbPath };
  } catch {
    return { exists: false, path: null };
  }
});

// Save a thumbnail provided as a data URL (from renderer canvas)
ipcMain.handle('save-thumbnail', async (_event, { filename, dataUrl }) => {
  try {
    const thumbsDir = path.join(process.cwd(), 'thumbnails');
    await fs.mkdir(thumbsDir, { recursive: true });
    const base = path.parse(filename).name;
    const outPath = path.join(thumbsDir, base + '.jpg');
    const b64 = (dataUrl || '').split(',')[1];
    if (!b64) throw new Error('Invalid data URL');
    const buf = Buffer.from(b64, 'base64');
    await fs.writeFile(outPath, buf);
    return { ok: true, path: outPath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Generate thumbnail from PDF first page
ipcMain.handle('generate-thumbnail', async (event, filename) => {
  try {
    const magazinesPath = path.join(process.cwd(), 'magazines');
    const thumbnailsDir = path.join(process.cwd(), 'thumbnails');
    const pdfPath = path.join(magazinesPath, filename);
    const basename = path.basename(filename, path.extname(filename));
    const thumbnailPath = path.join(thumbnailsDir, `${basename}.jpg`);
    
    // Ensure thumbnails directory exists
    try {
      await fs.mkdir(thumbnailsDir, { recursive: true });
    } catch (e) {
      // Already exists
    }
    
    // Check if thumbnail already exists
    try {
      await fs.access(thumbnailPath);
      return { success: true, thumbnailPath: thumbnailPath };
    } catch {
      // Doesn't exist, will generate
    }
    
    // Create a hidden window to render the PDF
    const hiddenWindow = new BrowserWindow({
      width: 400,
      height: 560,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false
      }
    });

    // HTML that renders first PDF page to canvas and returns a data URL
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
        <style>
          html, body { margin: 0; padding: 0; background: #ffffff; overflow: hidden; }
          #canvas { display: block; }
        </style>
      </head>
      <body>
        <canvas id="canvas"></canvas>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdfPath = '${pdfPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}';
          (async function() {
            try {
              const pdf = await pdfjsLib.getDocument(pdfPath).promise;
              const page = await pdf.getPage(1);
              const canvas = document.getElementById('canvas');
              const viewport = page.getViewport({ scale: 1.2 });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              window.thumbDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            } catch (error) {
              window.thumbError = error.message;
            }
          })();
        </script>
      </body>
      </html>
    `;

    await hiddenWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent));

    // Wait until the canvas is rendered and data URL is available (or error/timeout)
    let dataUrl = null;
    await new Promise(resolve => {
      const started = Date.now();
      const check = async () => {
        try {
          const result = await hiddenWindow.webContents.executeJavaScript('window.thumbDataUrl || window.thumbError || null');
          if (result) {
            dataUrl = result.startsWith('data:image') ? result : null;
            resolve();
            return;
          }
          if (Date.now() - started > 10000) { // 10s timeout
            resolve();
            return;
          }
        } catch {}
        setTimeout(check, 100);
      };
      check();
    });

    // If we got a data URL, save it; otherwise fall back
    if (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      await fs.writeFile(thumbnailPath, Buffer.from(base64, 'base64'));
    } else {
      // Fallback: capture the page (may include scrollbar, but avoids failure)
      const image = await hiddenWindow.webContents.capturePage();
      await fs.writeFile(thumbnailPath, image.toJPEG(85));
    }

    hiddenWindow.destroy();
    
    return { success: true, thumbnailPath: thumbnailPath };
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return { success: false, error: error.message };
  }
});
