import { app, BrowserWindow } from 'electron';
import path from 'path';
import { bootstrap } from './bootstrap';
import { registerIpcHandlers } from './ipc';
import { closeDatabase } from './database';
import { stopScheduler } from './services/scheduler';
import { stopAudioEngine } from './services/audio';

let mainWindow: BrowserWindow | null = null;

function getAppIcon(): string {
  const assetsDir = path.join(__dirname, '../assets/icons');
  if (process.platform === 'win32') {
    return path.join(assetsDir, 'icon.ico');
  }
  if (process.platform === 'linux') {
    return path.join(assetsDir, '512x512.png');
  }
  // macOS: icon is handled by electron-builder; fall back to PNG for dev
  return path.join(assetsDir, 'icon.png');
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 720,
    minHeight: 560,
    title: 'myAzan',
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers(() => mainWindow);
  await bootstrap();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAudioEngine();
  stopScheduler();
  closeDatabase();
});
