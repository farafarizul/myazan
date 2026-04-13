import { ipcMain, dialog } from 'electron';
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
import { getPlaybackStatus, applySettingsChange } from '../services/audio';

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
    return fetchAllZones().map((z) => ({
      code: z.code,
      stateName: z.state_name,
      zoneName: z.zone_name,
      sortOrder: z.sort_order,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SAVE_SETTINGS,
    (_event, payload: SaveSettingsPayload) => {
      try {
        saveSettings(payload);
        // Pakai semula tetapan audio serta-merta supaya audio mencerminkan perubahan
        applySettingsChange();
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

  /**
   * Buka dialog pilih fail audio (MP3) untuk azan atau notifikasi.
   * Pulangkan laluan fail yang dipilih atau null jika pengguna membatal.
   */
  ipcMain.handle(IPC_CHANNELS.SELECT_AUDIO_FILE, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Pilih Fail Audio',
      filters: [{ name: 'Fail Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  /**
   * Buka dialog pilih folder audio untuk audio idle (al-Quran / zikir).
   * Pulangkan laluan folder yang dipilih atau null jika pengguna membatal.
   */
  ipcMain.handle(IPC_CHANNELS.SELECT_AUDIO_FOLDER, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Pilih Folder Audio Idle',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  /**
   * Dapatkan status playback audio semasa.
   */
  ipcMain.handle(IPC_CHANNELS.GET_PLAYBACK_STATUS, () => {
    return getPlaybackStatus();
  });
}
