import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import {
  AppInfo,
  SaveSettingsPayload,
  SyncPrayerTimesPayload,
  SyncResult,
  PrayerTimeForDate,
} from '../../shared/types';
import { APP_NAME, APP_VERSION, APP_AUTHOR, APP_EMAIL, APP_PHONE } from '../../shared/constants';
import { fetchAllZones } from '../services/zones';
import { getSettings, saveSettings, setActiveZoneCode, SettingsValidationError } from '../services/settings';
import {
  ensurePrayerTimesAvailable,
  getPrayerTimesForDate,
  PrayerTimeSyncError,
} from '../services/prayer-time';

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

  /**
   * Muat turun dan cache data waktu solat untuk zon + tahun tertentu (atau tahun semasa).
   * Elak download semula jika data sudah ada.
   */
  ipcMain.handle(
    IPC_CHANNELS.SYNC_PRAYER_TIMES,
    async (_event, payload: SyncPrayerTimesPayload): Promise<SyncResult> => {
      try {
        const year = payload.year ?? new Date().getFullYear();
        await ensurePrayerTimesAvailable(payload.zoneCode, year);
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof PrayerTimeSyncError || err instanceof Error
            ? err.message
            : String(err);
        return { ok: false, error: message };
      }
    },
  );

  /**
   * Dapatkan waktu solat daripada cache lokal untuk tarikh tertentu.
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_PRAYER_TIMES_FOR_DATE,
    async (_event, zoneCode: string, date: string): Promise<PrayerTimeForDate | null> => {
      const row = getPrayerTimesForDate(zoneCode, date);
      if (!row) return null;
      return {
        zoneCode: row.zone_code,
        date: row.date,
        hijri: row.hijri,
        dayLabel: row.day_label,
        imsak: row.imsak,
        fajr: row.fajr,
        syuruk: row.syuruk,
        dhuha: row.dhuha,
        dhuhr: row.dhuhr,
        asr: row.asr,
        maghrib: row.maghrib,
        isha: row.isha,
      };
    },
  );

  // TODO: Fasa 4 — SELECT_AUDIO_FILE, SELECT_AUDIO_FOLDER
  // TODO: Fasa 4 — GET_PLAYBACK_STATUS
}
