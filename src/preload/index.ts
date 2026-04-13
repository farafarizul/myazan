import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type {
  AppInfo,
  AppSettings,
  SaveSettingsPayload,
  Zone,
  SyncPrayerTimesPayload,
  SyncResult,
  PrayerTimeForDate,
  PlaybackStatus,
} from '../shared/types';

/**
 * Preload script mendedahkan API yang selamat kepada renderer melalui contextBridge.
 * Renderer TIDAK mempunyai akses langsung kepada Node.js atau Electron API.
 */
contextBridge.exposeInMainWorld('myAzan', {
  /**
   * Dapatkan maklumat aplikasi (nama, versi, pembangun, dsb.)
   */
  getAppInfo: (): Promise<AppInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_APP_INFO),

  /**
   * Dapatkan semua zon JAKIM yang tersedia.
   */
  getZones: (): Promise<Zone[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ZONES),

  /**
   * Dapatkan semua tetapan aplikasi semasa.
   */
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),

  /**
   * Simpan satu atau lebih tetapan aplikasi.
   * Pulangkan { ok: true } jika berjaya, atau { ok: false, error: string } jika gagal.
   */
  saveSettings: (
    payload: SaveSettingsPayload,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, payload),

  /**
   * Tetapkan zon aktif berdasarkan kod zon JAKIM.
   */
  setActiveZone: (zoneCode: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_ACTIVE_ZONE, zoneCode),

  /**
   * Muat turun dan cache data waktu solat untuk zon + tahun (default: tahun semasa).
   * Elak download semula jika data sudah ada secara lokal.
   */
  syncPrayerTimes: (payload: SyncPrayerTimesPayload): Promise<SyncResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_PRAYER_TIMES, payload),

  /**
   * Dapatkan waktu solat daripada cache lokal untuk tarikh tertentu (format: 'YYYY-MM-DD').
   * Pulangkan null jika tiada data.
   */
  getPrayerTimesForDate: (
    zoneCode: string,
    date: string,
  ): Promise<PrayerTimeForDate | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PRAYER_TIMES_FOR_DATE, zoneCode, date),

  /**
   * Buka dialog sistem untuk pilih fail audio (MP3/WAV/OGG/M4A).
   * Pulangkan laluan fail atau null jika pengguna membatal.
   */
  selectAudioFile: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_AUDIO_FILE),

  /**
   * Buka dialog sistem untuk pilih folder audio idle (al-Quran / zikir).
   * Pulangkan laluan folder atau null jika pengguna membatal.
   */
  selectAudioFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_AUDIO_FOLDER),

  /**
   * Dapatkan status playback audio semasa.
   */
  getPlaybackStatus: (): Promise<PlaybackStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PLAYBACK_STATUS),

  /**
   * Minimumkan tetingkap aplikasi.
   */
  windowMinimize: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),

  /**
   * Tutup tetingkap aplikasi.
   */
  windowClose: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
});
