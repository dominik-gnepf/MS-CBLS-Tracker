import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
log.transports.file.level = 'info';

// Disable auto-download - we'll let the user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Check for updates on startup (with delay to not block app launch)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Error checking for updates:', err);
    });
  }, 3000);

  // Update available
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  });

  // No update available
  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available. Current version:', info.version);
    mainWindow?.webContents.send('update-not-available');
  });

  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  // Error handling
  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    mainWindow?.webContents.send('update-error', err.message);
  });
}

export function setupUpdaterIpc(): void {
  // Check for updates manually
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo.version };
    } catch (error) {
      log.error('Check for updates failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Start downloading the update
  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error('Download update failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Quit and install the update
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
