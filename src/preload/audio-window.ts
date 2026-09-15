/// <reference lib="dom" />
/**
 * Preload untuk tetingkap audio tersembunyi.
 * Mengawal tiga elemen audio (azan, notifikasi, idle) melalui IPC dalaman.
 * Tidak mendedahkan sebarang API kepada window JS.
 */
import { ipcRenderer } from 'electron';
import { pathToFileURL } from 'url';

/** Saluran IPC dalaman untuk audio engine. */
const AUDIO_IPC = {
  PLAY_AZAN: 'audio-internal:play-azan',
  STOP_AZAN: 'audio-internal:stop-azan',
  PLAY_NOTIFICATION: 'audio-internal:play-notification',
  STOP_NOTIFICATION: 'audio-internal:stop-notification',
  PLAY_IDLE: 'audio-internal:play-idle',
  PAUSE_IDLE: 'audio-internal:pause-idle',
  RESUME_IDLE: 'audio-internal:resume-idle',
  STOP_IDLE: 'audio-internal:stop-idle',
  SET_IDLE_VOLUME: 'audio-internal:set-idle-volume',
  AZAN_ENDED: 'audio-internal:azan-ended',
  NOTIFICATION_ENDED: 'audio-internal:notification-ended',
  IDLE_ENDED: 'audio-internal:idle-ended',
  AZAN_ERROR: 'audio-internal:azan-error',
  NOTIFICATION_ERROR: 'audio-internal:notification-error',
  IDLE_ERROR: 'audio-internal:idle-error',
} as const;

/** Tukar laluan fail tempatan ke URL file:// yang sah. */
function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

window.addEventListener('DOMContentLoaded', () => {
  const azanEl = document.getElementById('azan-player') as HTMLAudioElement;
  const notifEl = document.getElementById('notification-player') as HTMLAudioElement;
  const idleEl = document.getElementById('idle-player') as HTMLAudioElement;
  let idleRequest = 0;

  function playIdle(): void {
    const request = ++idleRequest;
    idleEl.play().catch((err: unknown) => {
      // Pause, Next dan Previous boleh membatalkan play() yang masih menunggu.
      if (request !== idleRequest || (err instanceof Error && err.name === 'AbortError')) return;
      ipcRenderer.send(AUDIO_IPC.IDLE_ERROR, String(err));
    });
  }

  // ── Azan player ──────────────────────────────────────────────
  azanEl.addEventListener('ended', () => {
    ipcRenderer.send(AUDIO_IPC.AZAN_ENDED);
  });
  azanEl.addEventListener('error', () => {
    ipcRenderer.send(AUDIO_IPC.AZAN_ERROR, azanEl.error?.message ?? 'ralat audio azan');
  });

  ipcRenderer.on(AUDIO_IPC.PLAY_AZAN, (_event: unknown, filePath: string, volume: number) => {
    azanEl.volume = Math.max(0, Math.min(1, (volume ?? 100) / 100));
    azanEl.src = toFileUrl(filePath);
    azanEl.load();
    azanEl.play().catch((err: unknown) => {
      ipcRenderer.send(AUDIO_IPC.AZAN_ERROR, String(err));
    });
  });

  ipcRenderer.on(AUDIO_IPC.STOP_AZAN, () => {
    azanEl.pause();
    azanEl.src = '';
  });

  // ── Notification player ───────────────────────────────────────
  notifEl.addEventListener('ended', () => {
    ipcRenderer.send(AUDIO_IPC.NOTIFICATION_ENDED);
  });
  notifEl.addEventListener('error', () => {
    ipcRenderer.send(AUDIO_IPC.NOTIFICATION_ERROR, notifEl.error?.message ?? 'ralat audio notifikasi');
  });

  ipcRenderer.on(AUDIO_IPC.PLAY_NOTIFICATION, (_event: unknown, filePath: string, volume: number) => {
    notifEl.volume = Math.max(0, Math.min(1, (volume ?? 100) / 100));
    notifEl.src = toFileUrl(filePath);
    notifEl.load();
    notifEl.play().catch((err: unknown) => {
      ipcRenderer.send(AUDIO_IPC.NOTIFICATION_ERROR, String(err));
    });
  });

  ipcRenderer.on(AUDIO_IPC.STOP_NOTIFICATION, () => {
    notifEl.pause();
    notifEl.src = '';
  });

  // ── Idle player ───────────────────────────────────────────────
  idleEl.addEventListener('ended', () => {
    ipcRenderer.send(AUDIO_IPC.IDLE_ENDED);
  });
  idleEl.addEventListener('error', () => {
    if (idleEl.getAttribute('src') && idleEl.error) {
      ++idleRequest; // Elakkan penghantaran kedua daripada rejection play().
      ipcRenderer.send(AUDIO_IPC.IDLE_ERROR, idleEl.error.message || 'ralat audio idle');
    }
  });

  ipcRenderer.on(AUDIO_IPC.PLAY_IDLE, (_event: unknown, filePath: string, volume: number) => {
    ++idleRequest;
    idleEl.volume = Math.max(0, Math.min(1, (volume ?? 100) / 100));
    idleEl.src = toFileUrl(filePath);
    idleEl.load();
    playIdle();
  });

  ipcRenderer.on(AUDIO_IPC.PAUSE_IDLE, () => {
    ++idleRequest;
    idleEl.pause();
  });

  ipcRenderer.on(AUDIO_IPC.RESUME_IDLE, () => {
    playIdle();
  });

  ipcRenderer.on(AUDIO_IPC.STOP_IDLE, () => {
    ++idleRequest;
    idleEl.pause();
    idleEl.removeAttribute('src');
    idleEl.load();
  });

  ipcRenderer.on(AUDIO_IPC.SET_IDLE_VOLUME, (_event: unknown, volume: number) => {
    idleEl.volume = Math.max(0, Math.min(1, volume / 100));
  });
});
