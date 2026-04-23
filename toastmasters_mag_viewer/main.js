const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const Database = require('better-sqlite3');
const pdfParseLib = require('pdf-parse');
const { PDFParse } = pdfParseLib;

let mainWindow;
let db = null;
let logFile = null;
let debugEnabled = false;

// Check for debug flag in command line arguments
if (process.argv.includes('--debug') || process.argv.includes('-d')) {
  debugEnabled = true;
}

// Log to file for debugging portable exe (only if --debug flag passed)
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  console.log(message);
  
  if (!debugEnabled) return;
  
  try {
    if (!logFile) {
      const appDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
      logFile = path.join(appDir, 'debug.log');
    }
    fsSync.appendFileSync(logFile, logMessage);
  } catch (err) {
    // Ignore log errors
  }
}

// Get the app's base directory (works for both dev and packaged)
function getAppDirectory() {
  // In production, use the directory containing the executable
  // In development, use __dirname
  const appDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
  log(`App directory: ${appDir}`);
  log(`Is packaged: ${app.isPackaged}`);
  log(`execPath: ${process.execPath}`);
  return appDir;
}

// Initialize SQLite database with FTS5 in local data folder for portability
async function initDatabase() {
  try {
    // Store database in local data folder (relative to app executable)
    const appDir = getAppDirectory();
    const dataDir = path.join(appDir, 'data');
    
    log(`Creating data directory: ${dataDir}`);
    
    // Create data folder if it doesn't exist
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      log(`Failed to create data directory: ${err.message}`);
    }
    
    const dbPath = path.join(dataDir, 'magazine-index.db');
    log(`Database path: ${dbPath}`);
    db = new Database(dbPath);
    log('Database initialized successfully');
  
    // Create FTS5 table for full-text search
    db.exec(`
      CREATE TABLE IF NOT EXISTS magazines_fts (
      filename TEXT PRIMARY KEY,
      content TEXT,
      year INTEGER,
      month INTEGER,
      file_mtime INTEGER
    );
    
    CREATE VIRTUAL TABLE IF NOT EXISTS magazines_search USING fts5(
      filename,
      content,
      year UNINDEXED,
      month UNINDEXED,
      content='magazines_fts',
      content_rowid='rowid'
    );
    
    CREATE TRIGGER IF NOT EXISTS magazines_fts_ai AFTER INSERT ON magazines_fts BEGIN
      INSERT INTO magazines_search(rowid, filename, content, year, month)
      VALUES (new.rowid, new.filename, new.content, new.year, new.month);
    END;
    
    CREATE TRIGGER IF NOT EXISTS magazines_fts_ad AFTER DELETE ON magazines_fts BEGIN
      DELETE FROM magazines_search WHERE rowid = old.rowid;
    END;
    
    CREATE TRIGGER IF NOT EXISTS magazines_fts_au AFTER UPDATE ON magazines_fts BEGIN
      UPDATE magazines_search SET filename = new.filename, content = new.content, 
                                  year = new.year, month = new.month
      WHERE rowid = old.rowid;
    END;
  `);
  
    log('Database initialized at: ' + dbPath);
  } catch (error) {
    log(`Database initialization error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${error.message}`);
    throw error;
  }
}

// Extract text from PDF
async function extractPdfText(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error(`Error extracting text from ${path.basename(pdfPath)}:`, error.message);
    return null;
  }
}

// Index a single PDF
async function indexPdf(filename, year, month) {
  const appDir = getAppDirectory();
  const magazinesPath = path.join(appDir, 'magazines');
  const pdfPath = path.join(magazinesPath, filename);
  
  try {
    const stats = await fs.stat(pdfPath);
    const fileMtime = Math.floor(stats.mtimeMs);
    
    // Check if already indexed and up to date
    const existing = db.prepare('SELECT file_mtime FROM magazines_fts WHERE filename = ?').get(filename);
    if (existing && existing.file_mtime === fileMtime) {
      return { indexed: false, cached: true };
    }
    
    // Extract text
    const content = await extractPdfText(pdfPath);
    if (!content) {
      return { indexed: false, error: 'Failed to extract text' };
    }
    
    // Insert or update
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO magazines_fts (filename, content, year, month, file_mtime)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(filename, content, year, month, fileMtime);
    
    return { indexed: true };
  } catch (error) {
    console.error(`Error indexing ${filename}:`, error.message);
    return { indexed: false, error: error.message };
  }
}

// Index all PDFs with progress reporting
async function indexAllPdfs(magazines, alreadyIndexed = []) {
  let indexed = 0;
  let cached = 0;
  let errors = 0;
  
  // Convert to Set for O(1) lookups
  const indexedSet = new Set(alreadyIndexed);
  
  for (let i = 0; i < magazines.length; i++) {
    const mag = magazines[i];
    
    // Skip if already indexed
    if (indexedSet.has(mag.filename)) {
      cached++;
      // Send progress update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('indexing-progress', {
          current: i + 1,
          total: magazines.length,
          indexed,
          cached,
          errors
        });
      }
      continue;
    }
    
    const result = await indexPdf(mag.filename, mag.year, mag.month);
    
    if (result.indexed) {
      indexed++;
    } else if (result.cached) {
      cached++;
    } else {
      errors++;
    }
    
    // Send progress update
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('indexing-progress', {
        current: i + 1,
        total: magazines.length,
        indexed,
        cached,
        errors
      });
    }
  }
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('indexing-complete', { indexed, cached, errors });
  }
  
  return { indexed, cached, errors };
}

// Search indexed content
ipcMain.handle('search-indexed-content', async (event, searchQuery) => {
  if (!db) return [];
  
  try {
    const stmt = db.prepare(`
      SELECT filename, 
             snippet(magazines_search, 1, '<mark>', '</mark>', '...', 30) as snippet,
             rank
      FROM magazines_search
      WHERE magazines_search MATCH ?
      ORDER BY rank
      LIMIT 100
    `);
    
    const results = stmt.all(searchQuery);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
});

// Start indexing process
ipcMain.handle('start-indexing', async (event, magazines, alreadyIndexed) => {
  return await indexAllPdfs(magazines, alreadyIndexed);
});

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
            const appDir = getAppDirectory();
            const magazinesPath = path.join(appDir, 'magazines');
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

app.whenReady().then(async () => {
  try {
    log('App starting...');
    await initDatabase();
    createWindow();
  } catch (error) {
    log(`Startup error: ${error.message}`);
    dialog.showErrorBox('Startup Error', `Failed to start application: ${error.message}`);
    app.quit();
  }
});

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

// Get all existing thumbnail filenames (without extensions) in bulk
async function getExistingThumbnails() {
  try {
    const appDir = getAppDirectory();
    const thumbsDir = path.join(appDir, 'thumbnails');
    
    try {
      const files = await fs.readdir(thumbsDir);
      // Return set of filenames without .jpg extension for fast lookup
      return new Set(files.map(f => path.basename(f, path.extname(f))));
    } catch {
      // Directory doesn't exist yet
      return new Set();
    }
  } catch (error) {
    log(`Error reading thumbnails: ${error.message}`);
    return new Set();
  }
}

// Get all already-indexed filenames in bulk from database
function getIndexedFilenames() {
  try {
    if (!db) return new Set();
    
    const stmt = db.prepare(`SELECT filename FROM magazines_fts`);
    const results = stmt.all();
    return new Set(results.map(row => row.filename));
  } catch (error) {
    log(`Error querying indexed files: ${error.message}`);
    return new Set();
  }
}

// Scan magazines folder for PDFs
ipcMain.handle('scan-magazines', async () => {
  try {
    // Look for magazines folder relative to the app executable
    const appDir = getAppDirectory();
    const magazinesPath = path.join(appDir, 'magazines');
    
    // Check if folder exists
    try {
      await fs.access(magazinesPath);
    } catch {
      return { success: false, error: 'Magazines folder not found. Please create a "magazines" folder next to the application.' };
    }

    const files = await fs.readdir(magazinesPath);
    const magazines = [];

    // Parse each PDF file to extract metadata for robust sorting
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.pdf')) continue;
      
      // Split filename on dashes and spaces to identify numeric prefix
      const words = file.split(/[-\s]+/);
      let startsWithNumber = false;
      let sortKey = '';
      let year = null;
      let month = null;
      let day = null;
      
      // Extract numeric prefix (up to first 3 numeric "words")
      for (let i = 0; i < words.length && i < 3; i++) {
        const word = words[i];
        const isNumber = !Number.isNaN(Number(word));
        
        if (isNumber) {
          startsWithNumber = true;
          // Pad numbers to 4 digits for proper numeric sorting
          sortKey += String(word).padStart(4, '0');
          
          // Try to extract year/month from first two numbers
          if (i === 0) year = parseInt(word, 10);
          if (i === 1) month = parseInt(word, 10);
          if (i === 2) day = parseInt(word, 10);
        } else {
          // Non-numeric word found, append rest of filename
          if (sortKey.length > 0) {
            sortKey += ' ';
          }
          sortKey += words.slice(i).join(' ');
          break;
        }
      }
      
      // If we went through 3 numbers with no break, append nothing more
      if (sortKey.length > 0 && !sortKey.includes(' ')) {
        // Check if there are more words after the numbers
        let numberCount = 0;
        for (let i = 0; i < words.length && i < 3; i++) {
          if (!Number.isNaN(Number(words[i]))) {
            numberCount++;
          } else {
            break;
          }
        }
        if (numberCount > 0 && numberCount < words.length) {
          sortKey += ' ' + words.slice(numberCount).join(' ');
        }
      }
      
      magazines.push({
        filename: file,
        year,
        month,
        day,
        startsWithNumber,
        sortKey,
        path: path.join(magazinesPath, file)
      });
    }

    // Sort with robust algorithm:
    // 1. Files starting with numbers first (descending by sortKey)
    // 2. Files starting with letters (ascending alphabetically)
    magazines.sort((a, b) => {
      if (a.startsWithNumber && !b.startsWithNumber) return -1;
      if (!a.startsWithNumber && b.startsWithNumber) return 1;
      
      if (a.startsWithNumber && b.startsWithNumber) {
        // Both start with numbers: sort descending (newest first)
        return b.sortKey.localeCompare(a.sortKey, undefined, { sensitivity: 'base' });
      }
      
      // Neither starts with numbers: sort ascending (alphabetically)
      return a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: 'base' });
    });

    // Get bulk lists of existing thumbnails and indexed files for faster startup
    const existingThumbnails = await getExistingThumbnails();
    const indexedFilenames = getIndexedFilenames();

    return { 
      success: true, 
      magazines,
      existingThumbnails: Array.from(existingThumbnails),
      indexedFilenames: Array.from(indexedFilenames)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get PDF file path for loading
ipcMain.handle('get-pdf-path', async (event, filename) => {
  const appDir = getAppDirectory();
  const magazinesPath = path.join(appDir, 'magazines');
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
    const appDir = getAppDirectory();
    const thumbsDir = path.join(appDir, 'thumbnails');
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
    const appDir = getAppDirectory();
    const thumbsDir = path.join(appDir, 'thumbnails');
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
  let hiddenWindow = null;
  try {
    const appDir = getAppDirectory();
    const magazinesPath = path.join(appDir, 'magazines');
    const thumbnailsDir = path.join(appDir, 'thumbnails');
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
      return { success: true, thumbnailPath: thumbnailPath, cached: true };
    } catch {
      // Doesn't exist, will generate
    }
    
    // Create a hidden window to render the PDF
    hiddenWindow = new BrowserWindow({
      width: 400,
      height: 560,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false,
        offscreen: true,
        sandbox: true
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
              window.renderSuccess = true;
            } catch (error) {
              window.thumbError = error.message;
              window.renderSuccess = false;
            }
          })();
        </script>
      </body>
      </html>
    `;

    await hiddenWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent));

    // Wait until the canvas is rendered and data URL is available (or error/timeout)
    let dataUrl = null;
    let renderSuccess = false;
    await new Promise(resolve => {
      const started = Date.now();
      const check = async () => {
        try {
          const result = await hiddenWindow.webContents.executeJavaScript('({ dataUrl: window.thumbDataUrl, success: window.renderSuccess, error: window.thumbError })');
          if (result.success === true && result.dataUrl) {
            dataUrl = result.dataUrl;
            renderSuccess = true;
            resolve();
            return;
          }
          if (result.success === false && result.error) {
            console.error(`PDF render error for ${filename}: ${result.error}`);
            resolve();
            return;
          }
          if (Date.now() - started > 10000) { // 10s timeout
            console.warn(`Timeout rendering ${filename}`);
            resolve();
            return;
          }
        } catch {}
        setTimeout(check, 100);
      };
      check();
    });

    // Only save if rendering was successful - don't save white/blank thumbnails
    if (renderSuccess && dataUrl && dataUrl.startsWith('data:image')) {
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        await fs.writeFile(thumbnailPath, Buffer.from(base64, 'base64'));
        return { success: true, thumbnailPath: thumbnailPath, cached: false };
      }
    }
    
    // If render failed, don't save anything - return error
    return { success: false, error: 'Failed to render PDF' };
    
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return { success: false, error: error.message };
  } finally {
    // Always destroy the window to clean up resources
    if (hiddenWindow && !hiddenWindow.isDestroyed()) {
      try {
        hiddenWindow.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  }
});
