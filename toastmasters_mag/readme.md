# Toastmasters Magazine Archive - Desktop Application

A desktop application for browsing, searching, and downloading Toastmasters Magazine archives from 1924 to present.

![Toastmasters Magazine Archive](https://img.shields.io/badge/Electron-v28.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green)

## Features

✨ **Browse Magazine Covers** - View thumbnail previews of magazine covers by date range

🔍 **Full-Text Search** - Search through PDF content to find specific topics or keywords

📥 **Individual Downloads** - Download single magazines with one click

📦 **Batch Download** - Download multiple magazines to a selected folder without browser prompts

🏷️ **Smart Naming** - Automatically names files as `YYYY-MM original-filename.pdf` for easy organization

⭐ **Search Indicators** - Visual badges show which magazines contain your search terms

🚫 **No Browser Prompts** - Direct file saving to your chosen folder (desktop app only)

## Table of Contents

- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Usage](#usage)
- [Building Executables](#building-executables)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Troubleshooting](#troubleshooting)
- [About Toastmasters Magazine](#about-toastmasters-magazine)

## Installation

### Prerequisites

1. **Install Node.js** (version 16 or higher)
   - Download from [https://nodejs.org/](https://nodejs.org/)
   - Verify installation: `node --version`

### Setup

1. **Navigate to the project folder**
   ```bash
   cd toastmasters_mag
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install:
   - Electron (desktop application framework)
   - Electron Builder (for creating installers)
   - All required dependencies

## Running the Application

### Development Mode

Start the application in development mode:

```bash
npm start
```

The application window will open automatically.

### Debug Mode

To enable Developer Tools for debugging:

1. Open `main.js`
2. Uncomment the line: `// mainWindow.webContents.openDevTools();`
3. Run `npm start`

## Usage

### Basic Workflow

1. **Select Download Folder** (first time only)
   - Click the "Select Folder" button
   - Choose where you want magazines to be saved
   - This folder will be remembered for the session

2. **Set Date Range**
   - Choose **Start Month** and **Start Year**
   - Choose **End Month** and **End Year**
   - Example: May 1965 to December 1975

3. **Optional: Add Search Terms**
   - Enter text in the "Search Text" field
   - The app will search through all pages of loaded magazines
   - Matching magazines will show a gold star (★) badge

4. **Load Magazines**
   - Click "Load Magazines"
   - Thumbnails will appear as they load
   - Progress bar shows loading status

5. **Download Options**
   - **Individual**: Click "Download" button on any magazine
   - **Batch**: Click "Download All to Folder" to save all loaded magazines

### File Naming Convention

Downloaded files are automatically named using the pattern:

