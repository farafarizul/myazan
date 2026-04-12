import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { AppInfo, SaveSettingsPayload } from '../../shared/types';
import { APP_NAME, APP_VERSION, APP_AUTHOR, APP_EMAIL, APP_PHONE } from '../../shared/constants';
import { fetchAllZones } from '../services/zones';
import { getSettings, saveSettings, setActiveZoneCode, SettingsValidationError } from '../services/settings';

/**
 * Daftarkan semua IPC handler untuk komunikasi renderer ↔ main.
 * Hanya channel yang disenaraikan di IPC_CHANNELS dibenarkan.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, (): AppInfo => {
    return {
      name: APP_NAME,
      version: APP_VERSION,
      author: APP_AUTHOR,
      email: APP_EMAIL,
      phone: APP_PHONE,
      objective:
        'Aplikasi azan automatik untuk Windows 10/11 yang memainkan azan berdasarkan waktu solat JAKIM.',
      license: 'Perisian Proprietari — Hak cipta terpelihara.',
    };
  });

  ipcMain.handle(IPC_CHANNELS.GET_ZONES, () => {
    return fetchAllZones();
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SAVE_SETTINGS,
    (_event, payload: SaveSettingsPayload) => {
      try {
        saveSettings(payload);
        return { ok: true };
      } catch (err) {
        if (err instanceof SettingsValidationError) {
          return { ok: false, error: err.message };
        }
        throw err;
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_ACTIVE_ZONE,
    (_event, zoneCode: string) => {
      setActiveZoneCode(zoneCode);
      return { ok: true };
    },
  );

  // TODO: Fasa 4 — SELECT_AUDIO_FILE, SELECT_AUDIO_FOLDER
  // TODO: Fasa 4 — GET_PLAYBACK_STATUS
}
