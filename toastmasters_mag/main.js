const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  
  if (result.canceled) {
    return null;
  }
  
  return result.filePaths[0];
});

// Handle file download
ipcMain.handle('download-file', async (event, { url, folderPath, filename }) => {
  return new Promise(async (resolve, reject) => {
    const filePath = path.join(folderPath, filename);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      // File exists, skip download
      resolve({ success: true, filePath, skipped: true });
      return;
    } catch {
      // File doesn't exist, proceed with download
    }
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(filePath, buffer);
          resolve({ success: true, filePath });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
});

// Handle batch download
ipcMain.handle('download-batch', async (event, { magazines, folderPath }) => {
  const results = [];
  
  for (const magazine of magazines) {
    try {
      // Check if file already exists
      const filePath = path.join(folderPath, magazine.filename);
      try {
        await fs.access(filePath);
        // File exists, skip download
        const result = { success: true, filename: magazine.filename, filePath, skipped: true };
        results.push(result);
        event.sender.send('download-progress', {
          current: results.length,
          total: magazines.length,
          lastFile: result
        });
        continue;
      } catch {
        // File doesn't exist, proceed with download
      }
      
      const result = await new Promise((resolve, reject) => {
        https.get(magazine.url, (response) => {
          if (response.statusCode !== 200) {
            resolve({ success: false, filename: magazine.filename, error: `HTTP ${response.statusCode}` });
            return;
          }

          const chunks = [];
          
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          response.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              await fs.writeFile(filePath, buffer);
              resolve({ success: true, filename: magazine.filename, filePath });
            } catch (error) {
              resolve({ success: false, filename: magazine.filename, error: error.message });
            }
          });
        }).on('error', (error) => {
          resolve({ success: false, filename: magazine.filename, error: error.message });
        });
      });
      
      results.push(result);
      
      // Send progress update
      event.sender.send('download-progress', {
        current: results.length,
        total: magazines.length,
        lastFile: result
      });
      
    } catch (error) {
      results.push({ success: false, filename: magazine.filename, error: error.message });
    }
  }
  
  return results;
});

// Handle index.html generation
ipcMain.handle('generate-index', async (event, { folderPath }) => {
  try {
    // Scan folder for PDF files
    const files = await fs.readdir(folderPath);
    const pdfFiles = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .sort();
    
    if (pdfFiles.length === 0) {
      return { success: false, error: 'No PDF files found in folder' };
    }
    
    // Parse filenames to extract metadata
    const magazines = pdfFiles.map(filename => {
      const match = filename.match(/^(\d{4})-(\d{2})/);
      let year = 'Unknown';
      let month = '';
      let monthNum = '00';
      
      if (match) {
        year = match[1];
        monthNum = match[2];
        const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        month = months[parseInt(monthNum)];
      }
      
      return {
        filename,
        year,
        month,
        sortKey: `${year}-${monthNum}`
      };
    });
    
    // Generate magazines.json
    const jsonPath = path.join(folderPath, 'magazines.json');
    await fs.writeFile(jsonPath, JSON.stringify(magazines, null, 2), 'utf8');
    
    // Generate HTML with embedded PDF.js
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Toastmasters Magazine Archive</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .search-box {
      margin-bottom: 30px;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .search-box input {
      flex: 1;
      padding: 12px 20px;
      font-size: 16px;
      border: 2px solid #ddd;
      border-radius: 5px;
      transition: border-color 0.3s;
    }
    .search-box input:focus {
      outline: none;
      border-color: #667eea;
    }
    .search-info {
      color: #999;
      font-size: 0.9em;
      margin-top: -20px;
      margin-bottom: 20px;
    }
    .stats {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
      color: #555;
    }
    .magazine-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .magazine-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
    }
    .magazine-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      border-color: #667eea;
    }
    .magazine-card.hidden {
      display: none;
    }
    .magazine-card.searching {
      opacity: 0.5;
    }
    .magazine-card canvas {
      width: 100%;
      max-width: 150px;
      height: auto;
      margin: 0 auto 10px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: block;
    }
    .magazine-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
      font-size: 1.1em;
    }
    .magazine-date {
      color: #666;
      font-size: 0.9em;
    }
    .search-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #ffc107;
      color: #333;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.8em;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }
    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: #999;
      font-size: 1.2em;
      display: none;
    }
    .no-results.visible {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 Toastmasters Magazine Archive</h1>
    <p class="subtitle" id="subtitle">Loading magazines...</p>
    
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search by year, month, filename, or PDF content..." disabled />
    </div>
    <p class="search-info">Content search will search inside PDF files (may take a moment per PDF)</p>
    
    <div class="stats">
      <span id="showingCount">0</span> of <span id="totalCount">0</span> magazines
    </div>
    
    <div id="loading" class="loading">Loading magazine covers...</div>
    <div class="magazine-grid" id="magazineGrid" style="display: none;"></div>
    
    <div class="no-results" id="noResults">
      No magazines found matching your search.
    </div>
  </div>
  
  <script>
    // Configure PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Embedded magazine data
    const magazines = ${JSON.stringify(magazines)};
    let searchTimeout = null;
    
    const elements = {
      subtitle: document.getElementById('subtitle'),
      searchInput: document.getElementById('searchInput'),
      magazineGrid: document.getElementById('magazineGrid'),
      showingCount: document.getElementById('showingCount'),
      totalCount: document.getElementById('totalCount'),
      loading: document.getElementById('loading'),
      noResults: document.getElementById('noResults')
    };
    
    // Load magazines
    async function loadMagazines() {
      try {
        elements.subtitle.textContent = \`Browse and search \${magazines.length} magazines\`;
        elements.totalCount.textContent = magazines.length;
        elements.showingCount.textContent = magazines.length;
        elements.searchInput.disabled = false;
        
        // Render magazine cards
        for (const mag of magazines) {
          const card = createMagazineCard(mag);
          elements.magazineGrid.appendChild(card);
          
          // Load thumbnail
          loadThumbnail(mag.filename, card.querySelector('canvas'));
        }
        
        elements.loading.style.display = 'none';
        elements.magazineGrid.style.display = 'grid';
        
      } catch (error) {
        elements.loading.textContent = 'Error loading magazines: ' + error.message;
      }
    }
    
    function createMagazineCard(mag) {
      const card = document.createElement('div');
      card.className = 'magazine-card';
      card.dataset.filename = mag.filename;
      card.dataset.year = mag.year;
      card.dataset.month = mag.month.toLowerCase();
      card.dataset.searchText = '';
      
      card.innerHTML = \`
        <a href="\${mag.filename}" target="_blank" style="text-decoration: none; color: inherit;">
          <canvas width="150" height="200"></canvas>
          <div class="magazine-title">\${mag.month} \${mag.year}</div>
          <div class="magazine-date">\${mag.filename}</div>
        </a>
      \`;
      
      return card;
    }
    
    async function loadThumbnail(filename, canvas) {
      try {
        const loadingTask = pdfjsLib.getDocument(filename);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(150 / viewport.width, 200 / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise;
        
        pdf.destroy();
      } catch (error) {
        // Show fallback icon if thumbnail fails
        const ctx = canvas.getContext('2d');
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📄', canvas.width / 2, canvas.height / 2);
      }
    }
    
    // Search functionality
    elements.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performSearch, 500);
    });
    
    async function performSearch() {
      const query = elements.searchInput.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.magazine-card');
      
      if (!query) {
        // Show all cards
        cards.forEach(card => {
          card.classList.remove('hidden');
          const badge = card.querySelector('.search-badge');
          if (badge) badge.remove();
        });
        elements.showingCount.textContent = cards.length;
        elements.magazineGrid.style.display = 'grid';
        elements.noResults.classList.remove('visible');
        return;
      }
      
      let visibleCount = 0;
      
      for (const card of cards) {
        // Quick search: filename, year, month
        const quickSearch = \`\${card.dataset.filename} \${card.dataset.year} \${card.dataset.month}\`.toLowerCase();
        
        if (quickSearch.includes(query)) {
          card.classList.remove('hidden');
          visibleCount++;
          continue;
        }
        
        // Deep search: PDF content
        card.classList.add('searching');
        const found = await searchInPDF(card.dataset.filename, query);
        card.classList.remove('searching');
        
        if (found) {
          card.classList.remove('hidden');
          visibleCount++;
          // Add search badge
          if (!card.querySelector('.search-badge')) {
            const badge = document.createElement('div');
            badge.className = 'search-badge';
            badge.textContent = '★ Match';
            card.appendChild(badge);
          }
        } else {
          card.classList.add('hidden');
          const badge = card.querySelector('.search-badge');
          if (badge) badge.remove();
        }
      }
      
      elements.showingCount.textContent = visibleCount;
      
      if (visibleCount === 0) {
        elements.magazineGrid.style.display = 'none';
        elements.noResults.classList.add('visible');
      } else {
        elements.magazineGrid.style.display = 'grid';
        elements.noResults.classList.remove('visible');
      }
    }
    
    async function searchInPDF(filename, query) {
      try {
        const loadingTask = pdfjsLib.getDocument(filename);
        const pdf = await loadingTask.promise;
        const numPages = Math.min(pdf.numPages, 50); // Search first 50 pages
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
          
          if (pageText.includes(query)) {
            pdf.destroy();
            return true;
          }
        }
        
        pdf.destroy();
        return false;
      } catch (error) {
        console.error('Error searching PDF:', error);
        return false;
      }
    }
    
    // Load magazines on page load
    loadMagazines();
  </script>
</body>
</html>`;
    
    // Write HTML file
    const indexPath = path.join(folderPath, 'index.html');
    await fs.writeFile(indexPath, html, 'utf8');
    
    return { success: true, count: pdfFiles.length };
  } catch (error) {
    console.error('Error generating index:', error);
    return { success: false, error: error.message };
  }
});
