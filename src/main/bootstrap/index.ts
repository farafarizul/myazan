import path from 'path';
import { APP_NAME, APP_VERSION } from '../../shared/constants';
import {
  openDatabase,
  runMigrations,
  getAudioSettings,
  saveAudioSettings,
  getAllNotificationSettings,
  saveNotificationSetting,
} from '../database';
import { getActiveZoneCode } from '../services/settings';
import { syncPrayerTimesForZone, PrayerTimeSyncError } from '../services/prayer-time';
import { startScheduler } from '../services/scheduler';
import { startAudioEngine } from '../services/audio';

/**
 * Tetapkan laluan fail/folder audio lalai yang dibundel bersama aplikasi,
 * hanya jika tetapan audio dalam database masih kosong (null).
 * Fail-fail ini disimpan dalam dist/assets/ semasa build.
 */
function setDefaultAudioPaths(): void {
  const audio = getAudioSettings();
  const assetsDir = path.join(__dirname, '../assets');
  const updates: Record<string, string> = {};

  if (!audio?.azan_subuh_file_path) {
    updates['azan_subuh_file_path'] = path.join(assetsDir, 'audio', 'default_azan_biasa.mp3');
  }
  if (!audio?.azan_other_file_path) {
    updates['azan_other_file_path'] = path.join(assetsDir, 'audio', 'default_azan_subuh.mp3');
  }
  if (!audio?.idle_folder_path) {
    updates['idle_folder_path'] = path.join(assetsDir, 'zikir_default');
  }

  if (Object.keys(updates).length > 0) {
    saveAudioSettings(updates as Parameters<typeof saveAudioSettings>[0]);
    console.log('[bootstrap] Laluan audio lalai telah ditetapkan.');
  }
}

/**
 * Tetapkan laluan fail audio notifikasi lalai untuk waktu solat utama,
 * hanya jika audio_file_path masih kosong (null).
 * Fail ini disimpan dalam dist/assets/audio/notification_default/ semasa build.
 */
function setDefaultNotificationAudioPaths(): void {
  const defaultAudioPath = path.join(
    __dirname,
    '../assets/audio/notification_default/default notification_15_minutes.mp3',
  );

  const targetEvents = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const notifications = getAllNotificationSettings();

  for (const row of notifications) {
    if (targetEvents.includes(row.event_name) && !row.audio_file_path) {
      saveNotificationSetting(row.event_name, { audio_file_path: defaultAudioPath });
    }
  }

  console.log('[bootstrap] Laluan audio notifikasi lalai telah ditetapkan.');
}

/**
 * Bootstrap aplikasi semasa startup.
 * Modul ini bertanggungjawab untuk:
 * - membuka sambungan database,
 * - menjalankan migration,
 * - memuatkan tetapan awal,
 * - menentukan zon aktif,
 * - memastikan data waktu solat tersedia secara lokal,
 * - memulakan perkhidmatan utama.
 */
export async function bootstrap(): Promise<void> {
  console.log(`[bootstrap] Memulakan ${APP_NAME} v${APP_VERSION}...`);

  // Fasa 1 — buka sambungan database dan jalankan migration
  openDatabase();
  runMigrations();

  // Fasa 1b — tetapkan laluan audio lalai jika belum dikonfigurasi
  setDefaultAudioPaths();
  setDefaultNotificationAudioPaths();

  // Fasa 2 — semak dan muat turun data waktu solat untuk zon + tahun semasa
  const activeZoneCode = getActiveZoneCode();
  if (activeZoneCode) {
    try {
      await syncPrayerTimesForZone(activeZoneCode);
    } catch (err) {
      if (err instanceof PrayerTimeSyncError) {
        // Log amaran sahaja — app tetap boleh berjalan dengan data lokal yang ada
        console.warn(`[bootstrap] Amaran: ${err.message}`);
      } else {
        throw err;
      }
    }
  } else {
    console.log('[bootstrap] Tiada zon aktif — langkau sync waktu solat.');
  }

  // TODO: Fasa 3 — mulakan scheduler
  startScheduler();

  // Fasa 4 — mulakan audio engine
  startAudioEngine();

  console.log('[bootstrap] Selesai.');
}
