/**
 * Mengurus tetingkap BrowserWindow tersembunyi untuk audio engine.
 * Tetingkap ini memuatkan audio.html dan mengawal tiga elemen audio melalui IPC.
 */
import { BrowserWindow, WebContents } from 'electron';
import path from 'path';

/** Saluran IPC dalaman untuk audio engine — sama seperti dalam audio-window preload. */
export const AUDIO_IPC = {
  PLAY_AZAN: 'audio-internal:play-azan',
  STOP_AZAN: 'audio-internal:stop-azan',
  PLAY_NOTIFICATION: 'audio-internal:play-notification',
  STOP_NOTIFICATION: 'audio-internal:stop-notification',
  PLAY_IDLE: 'audio-internal:play-idle',
  PAUSE_IDLE: 'audio-internal:pause-idle',
  RESUME_IDLE: 'audio-internal:resume-idle',
  STOP_IDLE: 'audio-internal:stop-idle',
  AZAN_ENDED: 'audio-internal:azan-ended',
  NOTIFICATION_ENDED: 'audio-internal:notification-ended',
  IDLE_ENDED: 'audio-internal:idle-ended',
  AZAN_ERROR: 'audio-internal:azan-error',
  NOTIFICATION_ERROR: 'audio-internal:notification-error',
  IDLE_ERROR: 'audio-internal:idle-error',
} as const;

let audioWindow: BrowserWindow | null = null;
let windowReady = false;
const pendingCommands: Array<() => void> = [];

/**
 * Cipta tetingkap audio tersembunyi dan muat audio.html.
 * Selamat dipanggil hanya sekali semasa bootstrap.
 */
export function createAudioWindow(): void {
  if (audioWindow !== null) {
    console.warn('[audio-window] Tetingkap audio sudah wujud — panggilan diabaikan.');
    return;
  }

  audioWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    skipTaskbar: true,
    title: 'myAzan Audio',
    webPreferences: {
      preload: path.join(__dirname, '../preload/audio-window.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  audioWindow.loadFile(path.join(__dirname, '../renderer/audio.html'));

  audioWindow.webContents.once('did-finish-load', () => {
    windowReady = true;
    console.log('[audio-window] Tetingkap audio sedia.');
    // Hantar arahan yang tertangguh semasa window belum siap
    for (const cmd of pendingCommands) {
      cmd();
    }
    pendingCommands.length = 0;
  });

  audioWindow.on('closed', () => {
    audioWindow = null;
    windowReady = false;
  });
}

/**
 * Tutup dan buang tetingkap audio.
 */
export function destroyAudioWindow(): void {
  if (audioWindow && !audioWindow.isDestroyed()) {
    audioWindow.destroy();
  }
  audioWindow = null;
  windowReady = false;
}

/**
 * Dapatkan WebContents tetingkap audio untuk menghantar arahan IPC.
 * Pulangkan null jika tetingkap belum sedia.
 */
export function getAudioWebContents(): WebContents | null {
  if (!audioWindow || audioWindow.isDestroyed()) return null;
  return audioWindow.webContents;
}

/**
 * Hantar arahan IPC ke tetingkap audio.
 * Jika window belum sedia, arahan akan dilambatkan sehingga sedia.
 */
export function sendToAudioWindow(channel: string, ...args: unknown[]): void {
  if (windowReady) {
    const wc = getAudioWebContents();
    if (wc) wc.send(channel, ...args);
  } else {
    pendingCommands.push(() => {
      const wc = getAudioWebContents();
      if (wc) wc.send(channel, ...args);
    });
  }
}
