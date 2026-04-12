import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { AppInfo, AppSettings, SaveSettingsPayload, Zone } from '../shared/types';

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

  // TODO: Fasa 4 — selectAudioFile, selectAudioFolder
  // TODO: Fasa 4 — getPlaybackStatus
});
