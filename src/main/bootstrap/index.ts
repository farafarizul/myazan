import { APP_NAME, APP_VERSION } from '../../shared/constants';
import { openDatabase, runMigrations } from '../database';
import { getActiveZoneCode } from '../services/settings';
import { syncPrayerTimesForZone, PrayerTimeSyncError } from '../services/prayer-time';
import { startScheduler } from '../services/scheduler';
import { startAudioEngine } from '../services/audio';

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
