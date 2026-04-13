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

  // ── Azan player ──────────────────────────────────────────────
  azanEl.addEventListener('ended', () => {
    ipcRenderer.send(AUDIO_IPC.AZAN_ENDED);
  });
  azanEl.addEventListener('error', () => {
    ipcRenderer.send(AUDIO_IPC.AZAN_ERROR, azanEl.error?.message ?? 'ralat audio azan');
  });

  ipcRenderer.on(AUDIO_IPC.PLAY_AZAN, (_event: unknown, filePath: string) => {
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

  ipcRenderer.on(AUDIO_IPC.PLAY_NOTIFICATION, (_event: unknown, filePath: string) => {
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
    ipcRenderer.send(AUDIO_IPC.IDLE_ERROR, idleEl.error?.message ?? 'ralat audio idle');
  });

  ipcRenderer.on(AUDIO_IPC.PLAY_IDLE, (_event: unknown, filePath: string) => {
    idleEl.src = toFileUrl(filePath);
    idleEl.load();
    idleEl.play().catch((err: unknown) => {
      ipcRenderer.send(AUDIO_IPC.IDLE_ERROR, String(err));
    });
  });

  ipcRenderer.on(AUDIO_IPC.PAUSE_IDLE, () => {
    idleEl.pause();
  });

  ipcRenderer.on(AUDIO_IPC.RESUME_IDLE, () => {
    idleEl.play().catch((err: unknown) => {
      ipcRenderer.send(AUDIO_IPC.IDLE_ERROR, String(err));
    });
  });

  ipcRenderer.on(AUDIO_IPC.STOP_IDLE, () => {
    idleEl.pause();
    idleEl.src = '';
  });
});
