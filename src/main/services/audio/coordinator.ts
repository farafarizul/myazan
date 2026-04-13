/**
 * AudioCoordinator — mengurus keutamaan audio antara tiga player.
 *
 * Keutamaan: azan > notification > idle
 *
 * Peraturan:
 * - Apabila azan bermula, hentikan notifikasi dan idle.
 * - Apabila notifikasi bermula, jeda/hentikan idle.
 * - Selepas azan atau notifikasi selesai, sambung semula idle jika diaktifkan.
 * - Tangani fail MP3 yang hilang atau laluan tidak sah dengan graceful.
 */
import fs from 'fs';
import path from 'path';
import { ipcMain, IpcMainEvent } from 'electron';
import { onSchedulerTrigger } from '../scheduler';
import type { SchedulerEvent } from '../scheduler';
import { getAudioSettings, getAllNotificationSettings } from '../../database';
import { AUDIO_IPC, sendToAudioWindow } from './audio-window';
import type { PlaybackStatus } from '../../../shared/types';

// ============================================================
// Jenis keutamaan audio dalaman
// ============================================================

type ActivePriority = 'azan' | 'notification' | 'idle' | 'none';

// ============================================================
// State dalaman
// ============================================================

interface CoordinatorState {
  /** Keutamaan audio yang sedang aktif. */
  activePriority: ActivePriority;
  /** Senarai fail MP3 dalam folder idle, ikut tertib nama fail. */
  idlePlaylist: string[];
  /** Indeks fail semasa dalam idlePlaylist. */
  idleIndex: number;
  /** Nama fail idle semasa (tanpa laluan penuh), atau null. */
  currentIdleTrack: string | null;
  /** Sama ada idle sedang dijeda (bukan dihentikan). */
  idlePaused: boolean;
}

let state: CoordinatorState = {
  activePriority: 'none',
  idlePlaylist: [],
  idleIndex: 0,
  currentIdleTrack: null,
  idlePaused: false,
};

/** Fungsi penyah-daftar pendengar scheduler. */
let unsubscribeScheduler: (() => void) | null = null;

// ============================================================
// API awam
// ============================================================

/**
 * Mulakan coordinator: daftar pendengar scheduler dan IPC.
 * Mulakan idle playback jika diaktifkan.
 */
export function startCoordinator(): void {
  registerIpcListeners();
  unsubscribeScheduler = onSchedulerTrigger(handleSchedulerTrigger);
  console.log('[audio-coordinator] Dimulakan.');
  startIdleIfEnabled();
}

/**
 * Hentikan coordinator: buang pendengar dan hentikan semua playback.
 */
export function stopCoordinator(): void {
  if (unsubscribeScheduler) {
    unsubscribeScheduler();
    unsubscribeScheduler = null;
  }
  removeIpcListeners();
  stopAll();
  console.log('[audio-coordinator] Dihentikan.');
}

/**
 * Dapatkan status playback semasa.
 */
export function getPlaybackStatus(): PlaybackStatus {
  return {
    activePriority: state.activePriority,
    idleTrack: state.currentIdleTrack,
  };
}

// ============================================================
// Pengendalian trigger scheduler
// ============================================================

function handleSchedulerTrigger(event: SchedulerEvent): void {
  if (event.triggerType === 'azan') {
    handleAzanTrigger(event);
  } else if (event.triggerType === 'notification') {
    handleNotificationTrigger(event);
  }
}

function handleAzanTrigger(event: SchedulerEvent): void {
  const settings = getAudioSettings();
  const filePath =
    event.eventName === 'fajr'
      ? settings?.azan_subuh_file_path
      : settings?.azan_other_file_path;

  if (!filePath || !isValidFilePath(filePath)) {
    console.warn(
      `[audio-coordinator] Fail azan tidak ditemui untuk '${event.eventName}': ${filePath ?? '(tiada)'}`,
    );
    return;
  }

  console.log(`[audio-coordinator] Main azan '${event.eventName}' — ${filePath}`);

  // Keutamaan tinggi: hentikan notification dan idle
  stopNotificationPlayer();
  pauseIdlePlayer();

  state.activePriority = 'azan';
  state.idlePaused = true;

  sendToAudioWindow(AUDIO_IPC.PLAY_AZAN, filePath);
}

function handleNotificationTrigger(event: SchedulerEvent): void {
  // Azan sedang bermain — notifikasi tidak dibenarkan
  if (state.activePriority === 'azan') {
    console.log(
      `[audio-coordinator] Notifikasi '${event.eventName}' diabaikan — azan sedang bermain.`,
    );
    return;
  }

  const notifSettings = getAllNotificationSettings();
  const notif = notifSettings.find((n) => n.event_name === event.eventName);

  if (!notif || !notif.enabled || !notif.audio_file_path) {
    return;
  }

  if (!isValidFilePath(notif.audio_file_path)) {
    console.warn(
      `[audio-coordinator] Fail notifikasi tidak ditemui untuk '${event.eventName}': ${notif.audio_file_path}`,
    );
    return;
  }

  console.log(
    `[audio-coordinator] Main notifikasi '${event.eventName}' — ${notif.audio_file_path}`,
  );

  // Jeda idle
  pauseIdlePlayer();

  state.activePriority = 'notification';
  state.idlePaused = true;

  sendToAudioWindow(AUDIO_IPC.PLAY_NOTIFICATION, notif.audio_file_path);
}

// ============================================================
// Pengendalian IPC dari tetingkap audio
// ============================================================

function onAzanEnded(): void {
  console.log('[audio-coordinator] Azan selesai.');
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onAzanError(_event: IpcMainEvent, errorMsg: string): void {
  console.warn(`[audio-coordinator] Ralat azan: ${errorMsg}`);
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onNotificationEnded(): void {
  console.log('[audio-coordinator] Notifikasi selesai.');
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onNotificationError(_event: IpcMainEvent, errorMsg: string): void {
  console.warn(`[audio-coordinator] Ralat notifikasi: ${errorMsg}`);
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onIdleEnded(): void {
  // Hanya proses jika idle masih aktif (bukan terputus oleh azan/notifikasi)
  if (state.activePriority !== 'idle') return;

  advanceIdleTrack();
}

function onIdleError(_event: IpcMainEvent, errorMsg: string): void {
  if (state.activePriority !== 'idle') return;

  console.warn(`[audio-coordinator] Ralat idle — langkau ke trek seterusnya: ${errorMsg}`);
  advanceIdleTrack();
}

// ============================================================
// Pengurusan pendaftaran IPC dalaman
// ============================================================

type IpcHandler = (event: IpcMainEvent, ...args: unknown[]) => void;
const ipcHandlers: Array<[string, IpcHandler]> = [];

function registerIpcListeners(): void {
  addIpcHandler(AUDIO_IPC.AZAN_ENDED, onAzanEnded as IpcHandler);
  addIpcHandler(AUDIO_IPC.AZAN_ERROR, onAzanError as unknown as IpcHandler);
  addIpcHandler(AUDIO_IPC.NOTIFICATION_ENDED, onNotificationEnded as IpcHandler);
  addIpcHandler(AUDIO_IPC.NOTIFICATION_ERROR, onNotificationError as unknown as IpcHandler);
  addIpcHandler(AUDIO_IPC.IDLE_ENDED, onIdleEnded as IpcHandler);
  addIpcHandler(AUDIO_IPC.IDLE_ERROR, onIdleError as unknown as IpcHandler);
}

function addIpcHandler(channel: string, handler: IpcHandler): void {
  ipcMain.on(channel, handler);
  ipcHandlers.push([channel, handler]);
}

function removeIpcListeners(): void {
  for (const [channel, handler] of ipcHandlers) {
    ipcMain.removeListener(channel, handler as Parameters<typeof ipcMain.removeListener>[1]);
  }
  ipcHandlers.length = 0;
}

// ============================================================
// Idle playlist
// ============================================================

/**
 * Bina senarai fail MP3 daripada folder idle.
 * Fail diisih mengikut nama fail secara menaik.
 */
function buildIdlePlaylist(folderPath: string): string[] {
  try {
    const entries = fs.readdirSync(folderPath) as string[];
    return entries
      .filter((f: string) => f.toLowerCase().endsWith('.mp3'))
      .sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((f: string) => path.join(folderPath, f));
  } catch (err) {
    console.warn(`[audio-coordinator] Gagal baca folder idle '${folderPath}': ${String(err)}`);
    return [];
  }
}

/**
 * Mulakan idle playback jika diaktifkan dalam tetapan.
 */
function startIdleIfEnabled(): void {
  const settings = getAudioSettings();
  if (!settings || !settings.idle_enabled || !settings.idle_folder_path) return;
  if (!isValidFolderPath(settings.idle_folder_path)) {
    console.warn(
      `[audio-coordinator] Folder idle tidak sah: ${settings.idle_folder_path}`,
    );
    return;
  }

  state.idlePlaylist = buildIdlePlaylist(settings.idle_folder_path);
  state.idleIndex = 0;

  if (state.idlePlaylist.length === 0) {
    console.warn('[audio-coordinator] Folder idle kosong — idle tidak dimulakan.');
    return;
  }

  playCurrentIdleTrack();
}

/**
 * Main trek idle pada indeks semasa.
 */
function playCurrentIdleTrack(): void {
  const filePath = state.idlePlaylist[state.idleIndex];
  if (!filePath || !isValidFilePath(filePath)) {
    console.warn(
      `[audio-coordinator] Fail idle tidak ditemui pada indeks ${state.idleIndex}: ${filePath ?? '(tiada)'}`,
    );
    advanceIdleTrack();
    return;
  }

  state.activePriority = 'idle';
  state.currentIdleTrack = path.basename(filePath);
  state.idlePaused = false;

  sendToAudioWindow(AUDIO_IPC.PLAY_IDLE, filePath);
}

/**
 * Maju ke trek idle seterusnya (atau kembali ke permulaan playlist).
 */
function advanceIdleTrack(): void {
  if (state.idlePlaylist.length === 0) return;

  state.idleIndex = (state.idleIndex + 1) % state.idlePlaylist.length;
  playCurrentIdleTrack();
}

/**
 * Jeda idle player semasa diganggu azan atau notifikasi.
 */
function pauseIdlePlayer(): void {
  if (state.activePriority === 'idle') {
    sendToAudioWindow(AUDIO_IPC.PAUSE_IDLE);
  }
}

/**
 * Hentikan notification player.
 */
function stopNotificationPlayer(): void {
  if (state.activePriority === 'notification') {
    sendToAudioWindow(AUDIO_IPC.STOP_NOTIFICATION);
  }
}

/**
 * Hentikan semua player.
 */
function stopAll(): void {
  sendToAudioWindow(AUDIO_IPC.STOP_AZAN);
  sendToAudioWindow(AUDIO_IPC.STOP_NOTIFICATION);
  sendToAudioWindow(AUDIO_IPC.STOP_IDLE);
  state.activePriority = 'none';
  state.currentIdleTrack = null;
  state.idlePaused = false;
}

/**
 * Sambung semula idle selepas azan atau notifikasi selesai.
 * Mengambil kira idleResumeMode daripada tetapan.
 */
function resumeIdleAfterInterruption(): void {
  const settings = getAudioSettings();
  if (!settings || !settings.idle_enabled) {
    state.idlePaused = false;
    return;
  }

  if (!state.idlePaused || state.idlePlaylist.length === 0) {
    // Idle tidak sedang dijeda atau tiada playlist — mulakan semula
    state.idlePaused = false;
    startIdleIfEnabled();
    return;
  }

  state.idlePaused = false;

  const resumeMode = settings.idle_resume_mode ?? 'restart_playlist';

  if (resumeMode === 'resume_track') {
    // Teruskan dari kedudukan semasa
    state.activePriority = 'idle';
    sendToAudioWindow(AUDIO_IPC.RESUME_IDLE);
  } else if (resumeMode === 'restart_track') {
    // Main semula trek semasa dari awal
    playCurrentIdleTrack();
  } else {
    // restart_playlist — kembali ke trek pertama
    state.idleIndex = 0;
    playCurrentIdleTrack();
  }
}

// ============================================================
// Pembantu pengesahan laluan
// ============================================================

function isValidFilePath(filePath: string | null | undefined): boolean {
  if (!filePath) return false;
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isValidFolderPath(folderPath: string | null | undefined): boolean {
  if (!folderPath) return false;
  try {
    return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}
