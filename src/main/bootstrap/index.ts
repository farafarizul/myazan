import { APP_NAME, APP_VERSION } from '../../shared/constants';

/**
 * Bootstrap aplikasi semasa startup.
 * Modul ini bertanggungjawab untuk:
 * - memuatkan tetapan awal,
 * - menentukan zon aktif,
 * - memastikan database tersedia,
 * - memulakan perkhidmatan utama.
 */
export async function bootstrap(): Promise<void> {
  console.log(`[bootstrap] Memulakan ${APP_NAME} v${APP_VERSION}...`);

  // TODO: Fasa 1 — inisialisasi database
  // TODO: Fasa 1 — muatkan tetapan dari database
  // TODO: Fasa 2 — semak data waktu solat untuk zon + tahun semasa
  // TODO: Fasa 3 — mulakan scheduler
  // TODO: Fasa 4 — mulakan audio engine

  console.log('[bootstrap] Selesai.');
}
