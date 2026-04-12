import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { AppInfo } from '../shared/types';

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

  // TODO: Fasa 1 — getSettings, saveSettings
  // TODO: Fasa 1 — getZones, setActiveZone
  // TODO: Fasa 4 — selectAudioFile, selectAudioFolder
  // TODO: Fasa 4 — getPlaybackStatus
});
