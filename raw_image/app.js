const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlButton = document.getElementById('loadUrlButton');
const urlHint = document.getElementById('urlHint');
const renderButton = document.getElementById('renderButton');
const clearButton = document.getElementById('clearButton');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const formatInput = document.getElementById('formatInput');
const invertInput = document.getElementById('invertInput');
const canvas = document.getElementById('canvas');
const statusElement = document.getElementById('status');
const metadataElement = document.getElementById('metadata');

const context = canvas.getContext('2d', { willReadFrequently: true });
const isFileProtocol = window.location.protocol === 'file:';

let lastBuffer = null;
let lastSourceLabel = 'No image loaded.';

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('error', isError);
}

function getDimensions() {
  const width = Number.parseInt(widthInput.value, 10);
  const height = Number.parseInt(heightInput.value, 10);

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('Width and height must be positive numbers.');
  }

  return { width, height };
}

function getBytesPerPixel(format) {
  switch (format) {
    case 'mono1':
      return 1 / 8;
    case 'gray8':
      return 1;
    case 'rgb24':
      return 3;
    case 'rgba32':
      return 4;
    default:
      throw new Error(`Unsupported byte format: ${format}`);
  }
}

function transformChannel(value) {
  return invertInput.checked ? 255 - value : value;
}

function bitIsSet(byteValue, bitIndex) {
  return (byteValue & (1 << bitIndex)) !== 0;
}

function bufferToImageData(buffer, width, height, format) {
  const expectedLength = format === 'mono1'
    ? Math.ceil((width * height) / 8)
    : width * height * getBytesPerPixel(format);

  if (buffer.byteLength < expectedLength) {
    throw new Error(`Buffer is too small. Expected at least ${expectedLength} bytes, got ${buffer.byteLength}.`);
  }

  const source = new Uint8Array(buffer, 0, expectedLength);
  const pixels = new Uint8ClampedArray(width * height * 4);

  let sourceIndex = 0;
  let targetIndex = 0;

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    if (format === 'mono1') {
      const byteValue = source[sourceIndex];
      const bitIndex = 7 - (pixelIndex % 8);
      const bitOn = bitIsSet(byteValue, bitIndex);
      const gray = transformChannel(bitOn ? 0 : 255);

      pixels[targetIndex] = gray;
      pixels[targetIndex + 1] = gray;
      pixels[targetIndex + 2] = gray;
      pixels[targetIndex + 3] = 255;

      if (pixelIndex % 8 === 7) {
        sourceIndex += 1;
      }
    } else if (format === 'gray8') {
      const gray = transformChannel(source[sourceIndex]);
      pixels[targetIndex] = gray;
      pixels[targetIndex + 1] = gray;
      pixels[targetIndex + 2] = gray;
      pixels[targetIndex + 3] = 255;
      sourceIndex += 1;
    } else if (format === 'rgb24') {
      pixels[targetIndex] = transformChannel(source[sourceIndex]);
      pixels[targetIndex + 1] = transformChannel(source[sourceIndex + 1]);
      pixels[targetIndex + 2] = transformChannel(source[sourceIndex + 2]);
      pixels[targetIndex + 3] = 255;
      sourceIndex += 3;
    } else {
      pixels[targetIndex] = transformChannel(source[sourceIndex]);
      pixels[targetIndex + 1] = transformChannel(source[sourceIndex + 1]);
      pixels[targetIndex + 2] = transformChannel(source[sourceIndex + 2]);
      pixels[targetIndex + 3] = source[sourceIndex + 3];
      sourceIndex += 4;
    }

    targetIndex += 4;
  }

  if (format === 'mono1' && width * height % 8 !== 0) {
    sourceIndex += 1;
  }

  return new ImageData(pixels, width, height);
}

function renderBuffer(buffer, sourceLabel) {
  const { width, height } = getDimensions();
  const format = formatInput.value;
  const imageData = bufferToImageData(buffer, width, height, format);

  canvas.width = width;
  canvas.height = height;
  context.putImageData(imageData, 0, 0);

  lastBuffer = buffer.slice(0);
  lastSourceLabel = sourceLabel;
  metadataElement.textContent = `${sourceLabel} • ${width} × ${height} • ${format} • ${buffer.byteLength.toLocaleString()} bytes`;
  setStatus(`Rendered ${width} × ${height} image from ${sourceLabel}.`);
}

async function renderSelectedFile() {
  const file = fileInput.files?.[0];

  if (!file) {
    throw new Error('Select a raw file first.');
  }

  const buffer = await file.arrayBuffer();
  renderBuffer(buffer, `File: ${file.name}`);
}

async function loadFromUrl() {
  const url = urlInput.value.trim();

  if (!url) {
    throw new Error('Enter a URL first.');
  }

  if (isFileProtocol) {
    throw new Error('URL loading is disabled on file:// pages. Serve this app over http(s) and ensure the target endpoint sends Access-Control-Allow-Origin.');
  }

  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Network/CORS error while fetching URL. The endpoint must allow this app\'s origin via Access-Control-Allow-Origin.');
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  const buffer = await response.arrayBuffer();
  renderBuffer(buffer, `URL: ${url}`);
}

function clearViewer() {
  lastBuffer = null;
  lastSourceLabel = 'No image loaded.';
  canvas.width = 1;
  canvas.height = 1;
  context.clearRect(0, 0, canvas.width, canvas.height);
  metadataElement.textContent = 'No image loaded.';
  setStatus('Cleared the preview.');
}

function initializeUrlLoaderState() {
  if (!isFileProtocol) {
    return;
  }

  urlInput.disabled = true;
  loadUrlButton.disabled = true;
  urlHint.textContent = 'URL loading is disabled when opened as file:// because browsers block cross-origin fetch from origin null. To enable it, serve this page over http(s) and allow CORS on the target endpoint.';
}

function rerenderLastBuffer() {
  if (!lastBuffer) {
    return;
  }

  try {
    renderBuffer(lastBuffer, lastSourceLabel);
  } catch (error) {
    setStatus(error.message, true);
  }
}

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) {
    setStatus(`Selected ${fileInput.files[0].name}. Click Render image to view it.`);
  }
});

renderButton.addEventListener('click', async () => {
  try {
    setStatus('Rendering...');
    await renderSelectedFile();
  } catch (error) {
    setStatus(error.message, true);
  }
});

loadUrlButton.addEventListener('click', async () => {
  try {
    setStatus('Fetching...');
    await loadFromUrl();
  } catch (error) {
    setStatus(error.message, true);
  }
});

clearButton.addEventListener('click', clearViewer);

[invertInput, widthInput, heightInput, formatInput].forEach((element) => {
  element.addEventListener('change', rerenderLastBuffer);
});

urlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    loadUrlButton.click();
  }
});

initializeUrlLoaderState();

setStatus('Choose a file or URL, then render it.');
