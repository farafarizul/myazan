import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { bootstrap } from './bootstrap';
import { registerIpcHandlers } from './ipc';
import { closeDatabase } from './database';
import { stopScheduler } from './services/scheduler';
import { stopAudioEngine } from './services/audio';

let mainWindow: BrowserWindow | null = null;
// Isytiharkan di peringkat global supaya tidak dipadam oleh garbage collector
let tray: Tray | null = null;
// Flag untuk membezakan antara operasi 'close' (sembunyikan) dan 'quit' (tutup sepenuhnya)
let isQuitting = false;

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

  // Apabila pengguna menekan butang 'X', sembunyikan tetingkap sahaja (bukan tutup)
  // kecuali aplikasi sedang dalam proses keluar sepenuhnya
  mainWindow.on('close', (event: { preventDefault(): void }) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = getAppIcon();
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('myAzan');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Tunjuk Aplikasi',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Keluar',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Klik pada ikon tray akan menunjukkan semula tetingkap
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers(() => mainWindow);
  await bootstrap();
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Jangan tutup aplikasi apabila semua tetingkap ditutup/disembunyikan —
// pengguna perlu menggunakan butang 'Keluar' dalam menu tray untuk keluar sepenuhnya.
// Nota: ini juga melumpuhkan tingkah laku lalai macOS di mana aplikasi keluar
// apabila semua tetingkap ditutup — ini disengajakan kerana myAzan kekal di tray.
app.on('window-all-closed', () => {
  // Tidak berbuat apa-apa; kawalan keluar diserahkan kepada menu tray
});

app.on('before-quit', () => {
  // Pastikan isQuitting = true walaupun quit dicetuskan dari luar (cth: sistem operasi
  // atau app.quit() daripada konteks lain) supaya handler 'close' tidak menghalang keluar
  isQuitting = true;
  stopAudioEngine();
  stopScheduler();
  closeDatabase();
});
