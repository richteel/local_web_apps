[TOC]

# Toastmasters Magazine Viewer

Toastmasters was founded on 22 October 1924 by Dr. Ralph C. Smedley to help people improve their public speaking and leadership skills.

The Gavel was the first magazine published for Toastmasters members starting in 1930, later renamed to *The Toastmaster* in April 1933. In 2004, the magazine was rebranded as *Toastmasters Magazine* to better reflect its purpose and audience. More information about the history of the magazine can be found at [toastmasters.org](https://www.toastmasters.org/magazine/magazine-issues/2024/apr/magazine-history).



## Launching the Viewer

If the ToastmastersViewer.exe file is in the folder, double click the file to launch the viewer.

If you need to generate a debug log file, run the executable with the debug flag.
```ToastmastersViewer.exe --debug```

### Using the Viewer

![image-20260118144900241](.\resources\image-20260118144900241.png)



## Building the Viewer

If the ToastmastersViewer.exe file is not present, follow these steps to build it.

1. Open a command window
   ![image-20260118143834240](.\resources\image-20260118143834240.png)

2. Change to toastmasters_mag_viewer folder.

   ```shell
   cd <Path to Viewer Folder>\toastmasters_mag_viewer
   ```

3. Install dependencies by running the following command.

   ```shell
   npm install
   ```

4. Build the Electron Application by running the following command.

   ```shell
   npm run build
   ```

5. A new folder will be added named "dist". The executable will be included in this folder.



### Building/Editing/Debugging

**Prerequisites:**

Before you can build, edit, or debug this project, you need to install the following:

1. **Node.js** (version 14.x or higher recommended)
   
   **Installation Steps:**
   
   - **Windows:**
     - Visit [nodejs.org](https://nodejs.org/)
     - Download the LTS (Long Term Support) version installer
     - Run the installer and follow the installation wizard
     - Accept the default settings (this will also install npm - Node Package Manager)
     - Restart your command prompt/terminal after installation
   
   - **Verify Installation:**
     Open a command prompt and run:
     ```shell
     node --version
     npm --version
     ```
     You should see version numbers displayed for both commands.

2. **Project Dependencies**
   
   After Node.js is installed, navigate to the project folder and install the required dependencies:
   ```shell
   cd <Path to Viewer Folder>\toastmasters_mag_viewer
   npm install
   ```
   
   This will install all packages defined in the `package.json` file, including:
   - Electron (for building desktop applications)
   - Electron Builder (for packaging the application)
   - Any other project dependencies

**Run the code:**

- Open a command window

- Navigate to the folder for the code

  - Downloader is in the ***toastmasters_mag*** folder
  - Viewer is in the ***toastmasters_mag_viewer*** folder

- At the command prompt, enter the following command to run the code.

  ```shell
  npm start
  ```

  

### Creating the Distributable USB Drive

Build the executable using the steps above. Once built, copy `ToastmastersViewer.exe` plus the magazines folder to the USB drive root. Users just double-click the `.exe`.