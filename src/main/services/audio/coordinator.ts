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
import { ipcMain, IpcMainEvent, powerMonitor } from 'electron';
import { onSchedulerTrigger } from '../scheduler';
import type { SchedulerEvent } from '../scheduler';
import { getAudioSettings, getAllNotificationSettings } from '../../database';
import { AUDIO_IPC, sendToAudioWindow } from './audio-window';
import type { IdlePlaybackCommand, IdlePlaybackResult, PlaybackStatus } from '../../../shared/types';
import { crossedIdleWakeTime, isIdleQuietTime } from '../../../shared/idle-schedule';
import { readIdlePlaylist } from './playlist';

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
  manualPaused: boolean;
  quiet: boolean;
  preservePosition: boolean;
  loaded: boolean;
  error: string | null;
}

let state: CoordinatorState = {
  activePriority: 'none',
  idlePlaylist: [],
  idleIndex: 0,
  currentIdleTrack: null,
  idlePaused: false,
  manualPaused: false,
  quiet: false,
  preservePosition: false,
  loaded: false,
  error: null,
};

let appliedSettings: ReturnType<typeof getAudioSettings>;
let scheduleTimer: ReturnType<typeof setInterval> | null = null;
let lastScheduleCheck = new Date();
const failedTracks = new Set<string>();

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
  if (scheduleTimer) return;
  registerIpcListeners();
  unsubscribeScheduler = onSchedulerTrigger(handleSchedulerTrigger);
  console.log('[audio-coordinator] Dimulakan.');
  applySettingsChange();
  scheduleTimer = setInterval(checkIdleSchedule, 1000);
  powerMonitor.on('resume', checkIdleSchedule);
}

/**
 * Hentikan coordinator: buang pendengar dan hentikan semua playback.
 */
export function stopCoordinator(): void {
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = null;
  powerMonitor.removeListener('resume', checkIdleSchedule);
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
  const settings = getAudioSettings();
  const idleState: PlaybackStatus['idleState'] = !settings?.idle_enabled ? 'disabled'
    : state.quiet ? 'scheduled'
    : state.error ? 'error'
    : state.idlePlaylist.length === 0 ? 'empty'
    : state.manualPaused ? 'paused'
    : isHigherPriorityActive() ? 'interrupted'
    : state.activePriority === 'idle' ? 'playing' : 'ready';
  return {
    activePriority: state.activePriority,
    idleTrack: state.currentIdleTrack,
    idleState,
    idleTrackCount: state.idlePlaylist.length,
    idleFolderPath: settings?.idle_folder_path ?? null,
    idleError: state.error,
  };
}

/**
 * Pakai semula tetapan terkini dari pangkalan data.
 * Dipanggil selepas pengguna menyimpan tetapan supaya audio
 * segera mencerminkan perubahan (contoh: nyahaktif idle).
 */
export function applySettingsChange(): void {
  const settings = getAudioSettings();
  const playlistChanged = !appliedSettings
    || settings?.idle_folder_path !== appliedSettings.idle_folder_path;
  const enabledChanged = settings?.idle_enabled !== appliedSettings?.idle_enabled;
  const scheduleChanged = !appliedSettings
    || settings?.idle_schedule_enabled !== appliedSettings.idle_schedule_enabled
    || settings?.idle_sleep_time !== appliedSettings.idle_sleep_time
    || settings?.idle_wake_time !== appliedSettings.idle_wake_time;
  if (playlistChanged || enabledChanged) {
    stopIdle();
    state.manualPaused = false;
    state.preservePosition = false;
    state.error = null;
    failedTracks.clear();
    state.idlePlaylist = readIdlePlaylist(settings?.idle_folder_path ?? null);
    state.idleIndex = 0;
    state.currentIdleTrack = state.idlePlaylist[0] ? path.basename(state.idlePlaylist[0]) : null;
  } else {
    const playlist = readIdlePlaylist(settings?.idle_folder_path ?? null);
    const currentFile = state.idlePlaylist[state.idleIndex];
    if (playlist.join('\n') !== state.idlePlaylist.join('\n')) {
      const currentIndex = currentFile ? playlist.indexOf(currentFile) : -1;
      if (currentIndex === -1) stopIdle();
      state.idlePlaylist = playlist;
      state.idleIndex = Math.max(0, currentIndex);
      state.currentIdleTrack = playlist[state.idleIndex] ? path.basename(playlist[state.idleIndex]) : null;
      state.error = null;
      failedTracks.clear();
    }
  }
  sendToAudioWindow(AUDIO_IPC.SET_IDLE_VOLUME, settings?.idle_volume ?? 100);
  appliedSettings = settings ? { ...settings } : undefined;
  if (scheduleChanged) lastScheduleCheck = new Date();
  checkIdleSchedule();
  startIdleIfEnabled();
}

/** Arahan pengguna tidak boleh memintas waktu senyap atau audio solat. */
export function controlIdle(command: IdlePlaybackCommand): IdlePlaybackResult {
  checkIdleSchedule();
  const fail = (error: string): IdlePlaybackResult => ({ ok: false, error, status: getPlaybackStatus() });
  if (!['play', 'pause', 'next', 'previous'].includes(command)) return fail('Arahan audio tidak sah.');
  if (!getAudioSettings()?.idle_enabled) return fail('Aktifkan Audio Idle dan simpan tetapan dahulu.');
  if (command === 'pause') {
    state.manualPaused = true;
    state.preservePosition = true;
    pauseIdlePlayer();
  } else {
    if (state.quiet) return fail('Jadual senyap sedang aktif. Ubah atau matikan jadual dan simpan untuk bermain sekarang.');
    if (isHigherPriorityActive()) return fail('Tunggu sehingga azan atau notifikasi selesai.');
    if (command === 'play' && (state.error || state.idlePlaylist.length === 0)) {
      state.idlePlaylist = readIdlePlaylist(getAudioSettings()?.idle_folder_path ?? null);
      state.idleIndex = Math.min(state.idleIndex, Math.max(0, state.idlePlaylist.length - 1));
      state.error = null;
      failedTracks.clear();
    }
    if (state.idlePlaylist.length === 0) return fail('Tiada fail MP3 yang boleh dimainkan dalam folder ini.');
    if (command === 'play') {
      state.manualPaused = false;
      startIdleIfEnabled();
    } else {
      state.error = null;
      failedTracks.clear();
      stopIdle();
      const direction = command === 'next' ? 1 : -1;
      state.idleIndex = (state.idleIndex + direction + state.idlePlaylist.length) % state.idlePlaylist.length;
      state.currentIdleTrack = path.basename(state.idlePlaylist[state.idleIndex]);
      startIdleIfEnabled();
    }
  }
  return { ok: !state.error, ...(state.error ? { error: state.error } : {}), status: getPlaybackStatus() };
}

function isHigherPriorityActive(): boolean {
  return state.activePriority === 'azan' || state.activePriority === 'notification';
}

/** Timer main process kekal berjalan apabila tetingkap utama diminimumkan. */
function checkIdleSchedule(): void {
  const settings = getAudioSettings();
  const now = new Date();
  const quiet = !!settings?.idle_schedule_enabled
    && isIdleQuietTime(now, settings.idle_sleep_time, settings.idle_wake_time);
  const reachedWake = !!settings?.idle_schedule_enabled
    && crossedIdleWakeTime(lastScheduleCheck, now, settings.idle_wake_time);
  const wasQuiet = state.quiet;
  lastScheduleCheck = now;
  state.quiet = quiet;
  if (quiet) {
    state.preservePosition = true;
    pauseIdlePlayer();
  } else if (wasQuiet || reachedWake) {
    if (reachedWake) state.manualPaused = false;
    startIdleIfEnabled();
  }
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

  const volume = settings?.azan_volume ?? 100;

  console.log(`[audio-coordinator] Main azan '${event.eventName}' — ${filePath}`);

  // Keutamaan tinggi: hentikan notification dan idle
  stopNotificationPlayer();
  pauseIdlePlayer();

  state.activePriority = 'azan';

  sendToAudioWindow(AUDIO_IPC.PLAY_AZAN, filePath, volume);
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

  // Gunakan kelantangan notifikasi global; guna per-event jika ada
  const globalSettings = getAudioSettings();
  const volume = notif.volume ?? globalSettings?.notification_volume ?? 100;

  // Jeda idle
  pauseIdlePlayer();

  state.activePriority = 'notification';

  sendToAudioWindow(AUDIO_IPC.PLAY_NOTIFICATION, notif.audio_file_path, volume);
}

// ============================================================
// Pengendalian IPC dari tetingkap audio
// ============================================================

function onAzanEnded(): void {
  if (state.activePriority !== 'azan') return;
  console.log('[audio-coordinator] Azan selesai.');
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onAzanError(_event: IpcMainEvent, errorMsg: string): void {
  if (state.activePriority !== 'azan') return;
  console.warn(`[audio-coordinator] Ralat azan: ${errorMsg}`);
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onNotificationEnded(): void {
  if (state.activePriority !== 'notification') return;
  console.log('[audio-coordinator] Notifikasi selesai.');
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onNotificationError(_event: IpcMainEvent, errorMsg: string): void {
  if (state.activePriority !== 'notification') return;
  console.warn(`[audio-coordinator] Ralat notifikasi: ${errorMsg}`);
  state.activePriority = 'none';
  resumeIdleAfterInterruption();
}

function onIdleEnded(): void {
  // Hanya proses jika idle masih aktif (bukan terputus oleh azan/notifikasi)
  if (state.activePriority !== 'idle') return;

  failedTracks.clear();
  advanceIdleTrack();
}

function onIdleError(_event: IpcMainEvent, errorMsg: string): void {
  if (state.activePriority !== 'idle') return;

  console.warn(`[audio-coordinator] Ralat idle — langkau ke trek seterusnya: ${errorMsg}`);
  failedTracks.add(state.idlePlaylist[state.idleIndex]);
  state.loaded = false;
  advanceIdleTrack();
}

// ============================================================
// Pengurusan pendaftaran IPC dalaman
// ============================================================

type IpcHandler = Parameters<typeof ipcMain.on>[1];
const ipcHandlers: Array<[string, IpcHandler]> = [];

function registerIpcListeners(): void {
  addIpcHandler(AUDIO_IPC.AZAN_ENDED, onAzanEnded);
  addIpcHandler(AUDIO_IPC.AZAN_ERROR, onAzanError);
  addIpcHandler(AUDIO_IPC.NOTIFICATION_ENDED, onNotificationEnded);
  addIpcHandler(AUDIO_IPC.NOTIFICATION_ERROR, onNotificationError);
  addIpcHandler(AUDIO_IPC.IDLE_ENDED, onIdleEnded);
  addIpcHandler(AUDIO_IPC.IDLE_ERROR, onIdleError);
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
 * Mulakan atau sambung audio hanya apabila semua syarat playback dipenuhi.
 */
function startIdleIfEnabled(): void {
  const settings = getAudioSettings();
  if (!settings?.idle_enabled || state.quiet || state.manualPaused || state.error
    || isHigherPriorityActive() || state.activePriority === 'idle' || state.idlePlaylist.length === 0) return;
  if (state.loaded && state.idlePaused) {
    state.activePriority = 'idle';
    state.idlePaused = false;
    state.preservePosition = false;
    sendToAudioWindow(AUDIO_IPC.RESUME_IDLE);
  } else {
    playCurrentIdleTrack();
  }
}

/**
 * Main trek idle pada indeks semasa.
 */
function playCurrentIdleTrack(): void {
  if (state.quiet || state.manualPaused || isHigherPriorityActive()) return;
  // Hadkan percubaan supaya playlist hilang/rosak tidak menyebabkan rekursi atau gelung tanpa henti.
  for (let attempt = 0; attempt < state.idlePlaylist.length; attempt++) {
    const filePath = state.idlePlaylist[state.idleIndex];
    if (filePath && !failedTracks.has(filePath) && isValidFilePath(filePath)) {
      state.activePriority = 'idle';
      state.currentIdleTrack = path.basename(filePath);
      state.idlePaused = false;
      state.loaded = true;
      state.preservePosition = false;
      sendToAudioWindow(AUDIO_IPC.PLAY_IDLE, filePath, getAudioSettings()?.idle_volume ?? 100);
      return;
    }
    state.idleIndex = (state.idleIndex + 1) % state.idlePlaylist.length;
  }
  stopIdle();
  state.error = 'Fail MP3 tidak dapat dimainkan. Semak folder dan tekan Play untuk cuba semula.';
}

/**
 * Maju ke trek idle seterusnya (atau kembali ke permulaan playlist).
 */
function advanceIdleTrack(): void {
  checkIdleSchedule();
  state.loaded = false;
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
    state.idlePaused = state.loaded;
    state.activePriority = 'none';
  }
}

function stopIdle(): void {
  sendToAudioWindow(AUDIO_IPC.STOP_IDLE);
  if (state.activePriority === 'idle') state.activePriority = 'none';
  state.loaded = false;
  state.idlePaused = false;
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
  state.loaded = false;
  state.manualPaused = false;
  state.quiet = false;
  state.preservePosition = false;
  state.error = null;
  state.idlePlaylist = [];
  appliedSettings = undefined;
  failedTracks.clear();
}

/**
 * Sambung semula idle selepas azan atau notifikasi selesai.
 * Mengambil kira idleResumeMode daripada tetapan.
 */
function resumeIdleAfterInterruption(): void {
  checkIdleSchedule();
  const settings = getAudioSettings();
  if (!settings?.idle_enabled || state.quiet || state.manualPaused || state.activePriority === 'idle') return;
  // Pause manual/jadual sentiasa mengekalkan posisi, walaupun azan berlaku ketika senyap.
  if (state.loaded && !state.preservePosition && settings.idle_resume_mode !== 'resume_track') {
    stopIdle();
    if (settings.idle_resume_mode !== 'restart_track') state.idleIndex = 0;
  }
  startIdleIfEnabled();
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
