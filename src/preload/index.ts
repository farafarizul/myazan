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

  // TODO: Fasa 4 — selectAudioFile, selectAudioFolder
  // TODO: Fasa 4 — getPlaybackStatus
});
