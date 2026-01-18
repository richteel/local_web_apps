console.log('=== app.js START ===');

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

console.log('PDF.js configured');

// Cache DOM elements
const elements = {
  picsContainer: document.getElementById("pics"),
  downloadFolderInput: document.getElementById("downloadFolder"),
  selectFolderBtn: document.getElementById("selectFolderBtn"),
  startMonthSelect: document.getElementById("startMonth"),
  startYearInput: document.getElementById("startYear"),
  endMonthSelect: document.getElementById("endMonth"),
  endYearInput: document.getElementById("endYear"),
  searchTextInput: document.getElementById("searchText"),
  loadBtn: document.getElementById("loadBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  downloadAllBtn: document.getElementById("downloadAllBtn"),
  generateIndexBtn: document.getElementById("generateIndexBtn"),
  errorMessage: document.getElementById("errorMessage"),
  progressBar: document.getElementById("progressBar"),
  progressBarFill: document.getElementById("progressBarFill")
};

// Constants
const THUMBNAIL_SIZE = 200;
const CONCURRENT_LOADS = 5;
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth();
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 
                'july', 'august', 'september', 'october', 'november', 'december'];

// State
let abortController = null;
let loadedCount = 0;
let totalCount = 0;
let loadedMagazines = [];
let selectedFolder = null;
let magazineUrlCache = null; // Cache of scraped URLs from archive page
let cacheTimestamp = null; // When cache was last fetched

console.log('State variables initialized');

// Helper functions
function capitalizeMonth(month) {
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function getMonthIndex(monthName) {
  return MONTHS.indexOf(monthName.toLowerCase());
}

function getMonthNumber(monthName) {
  const monthIndex = getMonthIndex(monthName);
  return String(monthIndex + 1).padStart(2, '0');
}

function getDownloadFilename(month, year) {
  const monthNum = getMonthNumber(month);
  return `${year}-${monthNum} Toastmasters Magazine.pdf`;
}

console.log('Helper functions defined');

// Scrape magazine URLs from the archive page
async function fetchMagazineUrls() {
  try {
    const response = await fetch('https://www.toastmasters.org/magazine/issues');
    const html = await response.text();
    
    // Parse the HTML to extract magazine URLs
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const urlMap = {};
    
    // Find all h3 headings with month/year format
    const headings = doc.querySelectorAll('h3');
    
    headings.forEach(heading => {
      const headingText = heading.textContent.trim();
      // Parse heading like "February 2025" or "January 2025"
      const match = headingText.match(/^(\w+)\s+(\d{4})$/);
      
      if (match) {
        const month = match[1].toLowerCase();
        const year = parseInt(match[2]);
        const key = `${year}-${month}`;
        
        // Look for the first link after this heading (either .pdf or .ashx)
        let nextEl = heading.nextElementSibling;
        while (nextEl) {
          const link = nextEl.tagName === 'A' ? nextEl : nextEl.querySelector('a[href*=".pdf"], a[href*=".ashx"]');
          if (link) {
            let url = link.getAttribute('href');
            // Accept URLs that contain .pdf or .ashx
            if (url && (url.includes('.pdf') || url.includes('.ashx'))) {
              // Convert relative URLs to absolute URLs
              if (url.startsWith('/')) {
                url = 'https://www.toastmasters.org' + url;
              }
              // Only accept URLs that now start with http (absolute or converted)
              if (url.startsWith('http')) {
                // Store the URL (only first one per month/year)
                if (!urlMap[key]) {
                  urlMap[key] = url;
                }
                break;
              }
            }
          }
          nextEl = nextEl.nextElementSibling;
          // Stop after checking a few elements
          if (!nextEl || nextEl.tagName === 'H3') break;
        }
      }
    });
    
    return urlMap;
  } catch (error) {
    console.error('Error fetching magazine URLs:', error);
    return null;
  }
}

// Get magazine URL from cache or fetch if needed
async function getMagazineUrlFromCache(month, year) {
  // Check if cache needs refresh (null or older than 1 hour)
  const now = Date.now();
  const cacheAge = cacheTimestamp ? now - cacheTimestamp : Infinity;
  
  if (!magazineUrlCache || cacheAge > 3600000) {
    console.log('Fetching magazine archive page...');
    magazineUrlCache = await fetchMagazineUrls();
    cacheTimestamp = now;
    
    if (magazineUrlCache) {
      console.log(`Cached ${Object.keys(magazineUrlCache).length} magazine URLs`);
    }
  }
  
  if (!magazineUrlCache) {
    return null; // Fall back to old method if scraping fails
  }
  
  const key = `${year}-${month.toLowerCase()}`;
  return magazineUrlCache[key] || null;
}

async function checkUrlExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

console.log('checkUrlExists defined');

async function getWorkingMagazineUrl(month, year) {
  // First, try to get URL from scraped cache
  const cachedUrl = await getMagazineUrlFromCache(month, year);
  if (cachedUrl) {
    return cachedUrl;
  }
  
  // Fallback to old pattern-based approach if scraping failed or URL not found
  console.log(`URL not found in cache for ${month} ${year}, trying fallback patterns...`);
  
  // For pre-2012 magazines, use old URL format
  if (year < 2012) {
    return `https://content.toastmasters.org/image/upload/toastmaster-magazine-${month}-${year}.pdf`;
  }
  
  // Try common patterns for 2012+
  const patterns = [
    `https://ccdn.toastmasters.org/medias/files/department-documents/magazine/magazine-pdfs/${year}-magazine-pdfs/toastmaster-${month}-${year}.pdf`,
    `https://ccdn.toastmasters.org/medias/files/department-documents/magazine/magazine-pdfs/${year}-magazine-pdfs/toastmaster--${month}-${year}.pdf`,
    `https://ccdn.toastmasters.org/medias/files/department-documents/magazine/magazine-pdfs/${year}-magazine-pdfs/toastmaster---${month}-${year}.pdf`,
  ];
  
  for (const url of patterns) {
    const works = await checkUrlExists(url);
    if (works) {
      return url;
    }
  }
  
  // Return first pattern as fallback
  return patterns[0];
}

function getMonthYearRange(startMonth, startYear, endMonth, endYear) {
  const range = [];
  const startMonthIndex = getMonthIndex(startMonth);
  const endMonthIndex = getMonthIndex(endMonth);
  
  for (let year = startYear; year <= endYear; year++) {
    const firstMonth = (year === startYear) ? startMonthIndex : 0;
    const lastMonth = (year === endYear) ? endMonthIndex : 11;
    
    for (let monthIndex = firstMonth; monthIndex <= lastMonth; monthIndex++) {
      range.push({
        month: MONTHS[monthIndex],
        year: year
      });
    }
  }
  
  return range;
}

function validateInputs() {
  const startYear = parseInt(elements.startYearInput.value);
  const endYear = parseInt(elements.endYearInput.value);
  const startMonth = elements.startMonthSelect.value;
  const endMonth = elements.endMonthSelect.value;

  elements.errorMessage.textContent = "";

  if (isNaN(startYear) || isNaN(endYear)) {
    elements.errorMessage.textContent = "Please enter valid years.";
    return false;
  }

  if (startYear < 1924 || endYear < 1924) {
    elements.errorMessage.textContent = "Years must be 1924 or later.";
    return false;
  }

  if (startYear > CURRENT_YEAR || endYear > CURRENT_YEAR) {
    elements.errorMessage.textContent = `Years cannot exceed ${CURRENT_YEAR}.`;
    return false;
  }

  if (endYear === CURRENT_YEAR && getMonthIndex(endMonth) > CURRENT_MONTH) {
    elements.errorMessage.textContent = `End month cannot exceed ${capitalizeMonth(MONTHS[CURRENT_MONTH])} ${CURRENT_YEAR}.`;
    return false;
  }

  if (startYear > endYear) {
    elements.errorMessage.textContent = "Start year must be less than or equal to end year.";
    return false;
  }

  if (startYear === endYear && getMonthIndex(startMonth) > getMonthIndex(endMonth)) {
    elements.errorMessage.textContent = "Start month must be before or equal to end month in the same year.";
    return false;
  }

  const range = getMonthYearRange(startMonth, startYear, endMonth, endYear);
  if (range.length > 1200) {
    elements.errorMessage.textContent = "Please limit your selection to 1200 magazines or less (100 years).";
    return false;
  }

  return true;
}

function updateProgress() {
  const percentage = Math.round((loadedCount / totalCount) * 100);
  elements.progressBarFill.style.width = `${percentage}%`;
  elements.progressBarFill.textContent = `${loadedCount} / ${totalCount} (${percentage}%)`;
}

async function renderPDFThumbnail(url, canvas, signal) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      url: url,
      stopAtErrors: false
    });

    if (signal.aborted) {
      loadingTask.destroy();
      throw new Error("Aborted");
    }

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    if (signal.aborted) {
      pdf.destroy();
      throw new Error("Aborted");
    }

    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(THUMBNAIL_SIZE / viewport.width, THUMBNAIL_SIZE / viewport.height);
    const scaledViewport = page.getViewport({ scale: scale });

    const context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;

    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;

    pdf.destroy();
    return true;
  } catch (error) {
    if (error.message === "Aborted") {
      throw error;
    }
    console.error('Error loading PDF:', error);
    return false;
  }
}

async function searchInPDF(url, searchQuery, signal) {
  if (!searchQuery || searchQuery.trim() === "") {
    return false;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      url: url,
      stopAtErrors: false
    });

    if (signal.aborted) {
      loadingTask.destroy();
      throw new Error("Aborted");
    }

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const searchLower = searchQuery.toLowerCase();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (signal.aborted) {
        pdf.destroy();
        throw new Error("Aborted");
      }

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .toLowerCase();

      if (pageText.includes(searchLower)) {
        pdf.destroy();
        return true;
      }
    }

    pdf.destroy();
    return false;
  } catch (error) {
    if (error.message === "Aborted") {
      throw error;
    }
    console.error('Error searching PDF:', error);
    return false;
  }
}

// Folder selection
async function selectFolder() {
  const folder = await window.electronAPI.selectFolder();
  if (folder) {
    selectedFolder = folder;
    elements.downloadFolderInput.value = folder;
  }
}

// Generate index.html in download folder
async function generateIndexHTML() {
  if (!selectedFolder) {
    elements.errorMessage.textContent = "Please select a download folder first.";
    setTimeout(() => {
      elements.errorMessage.textContent = "";
    }, 3000);
    return;
  }

  try {
    elements.generateIndexBtn.disabled = true;
    elements.generateIndexBtn.textContent = "Generating...";
    elements.progressBar.style.display = "block";
    elements.progressBarFill.style.width = "0%";
    elements.progressBarFill.textContent = "0%";
    
    // Listen for progress updates
    window.electronAPI.onGenerateProgress((data) => {
      const percentage = Math.round((data.current / data.total) * 100);
      elements.progressBarFill.style.width = `${percentage}%`;
      elements.progressBarFill.textContent = `Processing ${data.current}/${data.total} (${percentage}%)`;
    });
    
    const result = await window.electronAPI.generateIndex(selectedFolder);
    
    elements.generateIndexBtn.disabled = false;
    elements.generateIndexBtn.textContent = "Generate Index";
    elements.progressBar.style.display = "none";
    
    if (result.success) {
      elements.errorMessage.style.color = "#28a745";
      elements.errorMessage.textContent = `✓ Generated index.html with ${result.count} magazines in ${selectedFolder}`;
    } else {
      elements.errorMessage.style.color = "#dc3545";
      elements.errorMessage.textContent = "Failed to generate index.html: " + result.error;
    }
    
    setTimeout(() => {
      elements.errorMessage.textContent = "";
      elements.errorMessage.style.color = "#dc3545";
    }, 5000);
  } catch (error) {
    console.error('Generate index error:', error);
    elements.generateIndexBtn.disabled = false;
    elements.generateIndexBtn.textContent = "Generate Index";
    elements.progressBar.style.display = "none";
    elements.errorMessage.textContent = "Failed to generate index.html: " + error.message;
  }
}

// Download single file (for individual download buttons)
async function downloadPDF(url, filename, downloadLink) {
  if (!selectedFolder) {
    elements.errorMessage.textContent = "Please select a download folder first.";
    setTimeout(() => {
      elements.errorMessage.textContent = "";
    }, 3000);
    return;
  }

  try {
    downloadLink.textContent = "Downloading...";
    downloadLink.classList.add("disabled");

    await window.electronAPI.downloadFile(url, selectedFolder, filename);

    downloadLink.textContent = "✓ Downloaded";
    setTimeout(() => {
      downloadLink.textContent = "Download";
      downloadLink.classList.remove("disabled");
    }, 2000);
  } catch (error) {
    console.error('Download error:', error);
    downloadLink.textContent = "Download Failed";
    setTimeout(() => {
      downloadLink.textContent = "Download";
      downloadLink.classList.remove("disabled");
    }, 2000);
  }
}

// Download all magazines
async function downloadAllMagazines() {
  if (loadedMagazines.length === 0) {
    elements.errorMessage.textContent = "No magazines to download.";
    setTimeout(() => {
      elements.errorMessage.textContent = "";
    }, 3000);
    return;
  }

  if (!selectedFolder) {
    elements.errorMessage.textContent = "Please select a download folder first.";
    setTimeout(() => {
      elements.errorMessage.textContent = "";
    }, 3000);
    return;
  }

  elements.downloadAllBtn.disabled = true;
  elements.downloadAllBtn.textContent = `Downloading 0/${loadedMagazines.length}...`;
  elements.progressBar.style.display = "block";
  elements.errorMessage.textContent = "";

  // Listen for progress updates
  window.electronAPI.onDownloadProgress((data) => {
    const percentage = Math.round((data.current / data.total) * 100);
    elements.progressBarFill.style.width = `${percentage}%`;
    elements.progressBarFill.textContent = `${data.current} / ${data.total} (${percentage}%)`;
    elements.downloadAllBtn.textContent = `Downloading ${data.current}/${data.total}...`;
  });

  try {
    const results = await window.electronAPI.downloadBatch(loadedMagazines, selectedFolder);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    elements.downloadAllBtn.disabled = false;
    elements.downloadAllBtn.textContent = "Download All to Folder";
    
    if (failCount === 0) {
      elements.errorMessage.style.color = "#28a745";
      elements.errorMessage.textContent = `✓ All ${successCount} magazines downloaded successfully to ${selectedFolder}`;
    } else {
      elements.errorMessage.style.color = "#ffc107";
      elements.errorMessage.textContent = `⚠ Downloaded ${successCount} magazines. ${failCount} failed.`;
    }

    setTimeout(() => {
      elements.progressBar.style.display = "none";
      elements.errorMessage.textContent = "";
      elements.errorMessage.style.color = "#dc3545";
    }, 8000);
  } catch (error) {
    console.error('Batch download error:', error);
    elements.downloadAllBtn.disabled = false;
    elements.downloadAllBtn.textContent = "Download All to Folder";
    elements.errorMessage.textContent = "Download failed: " + error.message;
  }
}

async function loadMagazinesThrottled(urls, searchQuery) {
  const queue = [...urls];
  loadedMagazines = [];

  async function processNext() {
    if (queue.length === 0 || abortController.signal.aborted) {
      return;
    }

    const { url, year, month, box, canvas, para } = queue.shift();

    try {
      const success = await renderPDFThumbnail(url, canvas, abortController.signal);

      if (success) {
        para.textContent = `${capitalizeMonth(month)} ${year}`;
        para.classList.remove("loading");

        const filename = getDownloadFilename(month, year);

        loadedMagazines.push({ url, filename, month, year });

        const downloadLink = document.createElement("a");
        downloadLink.href = "#";
        downloadLink.classList.add("download-link");
        downloadLink.textContent = "Download";
        downloadLink.title = `Download as ${filename}`;
        downloadLink.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          downloadPDF(url, filename, downloadLink);
        });
        box.appendChild(downloadLink);

        if (searchQuery && searchQuery.trim() !== "") {
          const found = await searchInPDF(url, searchQuery, abortController.signal);
          if (found) {
            const badge = document.createElement("div");
            badge.classList.add("search-badge");
            badge.textContent = "★";
            badge.title = `Contains: "${searchQuery}"`;
            box.appendChild(badge);
          }
        }
      } else {
        para.textContent = `${capitalizeMonth(month)} ${year} - Not Available`;
        para.classList.remove("loading");
        para.classList.add("error");
        canvas.style.display = "none";
      }
    } catch (error) {
      if (error.message === "Aborted") {
        box.remove();
        return;
      }
    }

    loadedCount++;
    updateProgress();

    return processNext();
  }

  const workers = Array(Math.min(CONCURRENT_LOADS, urls.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
}

async function loadMagazines() {
  if (!validateInputs()) {
    return;
  }

  while (elements.picsContainer.firstChild) {
    elements.picsContainer.removeChild(elements.picsContainer.firstChild);
  }

  elements.downloadAllBtn.style.display = "none";
  loadedMagazines = [];

  abortController = new AbortController();

  elements.loadBtn.disabled = true;
  elements.cancelBtn.style.display = "inline-block";
  elements.progressBar.style.display = "block";

  const startYear = parseInt(elements.startYearInput.value);
  const endYear = parseInt(elements.endYearInput.value);
  const startMonth = elements.startMonthSelect.value;
  const endMonth = elements.endMonthSelect.value;
  const searchQuery = elements.searchTextInput.value.trim();

  const dateRange = getMonthYearRange(startMonth, startYear, endMonth, endYear);

  loadedCount = 0;
  totalCount = dateRange.length;
  updateProgress();

  const urls = [];
  for (const { month, year } of dateRange) {
    const url = await getWorkingMagazineUrl(month, year);

    const newBox = document.createElement("div");
    newBox.classList.add("content_box");

    const newLink = document.createElement("a");
    newLink.href = url;
    newLink.target = "_blank";

    const canvas = document.createElement("canvas");
    canvas.style.maxWidth = `${THUMBNAIL_SIZE}px`;
    canvas.style.maxHeight = `${THUMBNAIL_SIZE}px`;

    const newPara = document.createElement("p");
    newPara.textContent = `Loading ${capitalizeMonth(month)} ${year}...`;
    newPara.classList.add("loading");

    newLink.appendChild(canvas);
    newLink.appendChild(newPara);
    newBox.appendChild(newLink);
    elements.picsContainer.appendChild(newBox);

    urls.push({ url, year, month, box: newBox, canvas, para: newPara });
  }

  try {
    await loadMagazinesThrottled(urls, searchQuery);
  } catch (error) {
    console.error("Loading cancelled:", error);
  }

  elements.loadBtn.disabled = false;
  elements.cancelBtn.style.display = "none";
  
  if (loadedMagazines.length > 0) {
    elements.downloadAllBtn.style.display = "inline-block";
  }
  
  setTimeout(() => {
    elements.progressBar.style.display = "none";
  }, 2000);
}

function cancelLoading() {
  if (abortController) {
    abortController.abort();
    elements.loadBtn.disabled = false;
    elements.cancelBtn.style.display = "none";
    elements.errorMessage.textContent = "Loading cancelled.";
    setTimeout(() => {
      elements.errorMessage.textContent = "";
    }, 3000);
  }
}

// Event listeners
elements.selectFolderBtn.addEventListener("click", selectFolder);
elements.loadBtn.addEventListener("click", loadMagazines);
elements.cancelBtn.addEventListener("click", cancelLoading);
elements.downloadAllBtn.addEventListener("click", downloadAllMagazines);
elements.generateIndexBtn.addEventListener("click", generateIndexHTML);

elements.startYearInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") loadMagazines();
});
elements.endYearInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") loadMagazines();
});
elements.searchTextInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") loadMagazines();
});

// Initialize
console.log('app.js loaded, elements:', elements);
console.log('electronAPI available:', window.electronAPI);

// Set dynamic max year
elements.startYearInput.max = CURRENT_YEAR;
elements.endYearInput.max = CURRENT_YEAR;
