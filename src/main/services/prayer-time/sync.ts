import {
  hasPrayerTimes,
  getPrayerTimesByDate,
  savePrayerTimes,
  type PrayerTimeRow,
} from '../../database';
import { fetchYearlyPrayerTimes } from './index';

// ============================================================
// Ralat khusus
// ============================================================

export class PrayerTimeSyncError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PrayerTimeSyncError';
  }
}

// ============================================================
// Fungsi utama sync
// ============================================================

/**
 * Semak sama ada data waktu solat untuk zon dan tahun tertentu sudah wujud secara lokal.
 *
 * @param zoneCode - Kod zon JAKIM, contoh: 'WLY01'
 * @param year     - Tahun yang diminta, contoh: 2025
 */
export function hasPrayerTimeData(zoneCode: string, year: number): boolean {
  return hasPrayerTimes(zoneCode, year);
}

/**
 * Pastikan data waktu solat untuk zon dan tahun tertentu tersedia secara lokal.
 * Jika data sudah ada, tiada tindakan diambil (elak download semula).
 * Jika tiada, download dari API JAKIM dan simpan ke database.
 *
 * @param zoneCode - Kod zon JAKIM, contoh: 'WLY01'
 * @param year     - Tahun yang diminta, contoh: 2025
 * @throws {PrayerTimeSyncError} jika download atau simpan gagal
 */
export async function ensurePrayerTimesAvailable(
  zoneCode: string,
  year: number,
): Promise<void> {
  if (hasPrayerTimes(zoneCode, year)) {
    console.log(
      `[sync] Data waktu solat untuk ${zoneCode}/${year} sudah ada. Langkau download.`,
    );
    return;
  }

  console.log(`[sync] Memuat turun data waktu solat untuk ${zoneCode}/${year}...`);

  try {
    const rows = await fetchYearlyPrayerTimes(zoneCode, year);
    savePrayerTimes(rows);
    console.log(`[sync] Berjaya simpan ${rows.length} rekod untuk ${zoneCode}/${year}.`);
  } catch (err) {
    throw new PrayerTimeSyncError(
      `Gagal memuat turun data waktu solat untuk ${zoneCode}/${year}: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * Dapatkan data waktu solat untuk tarikh tertentu daripada cache lokal.
 *
 * @param zoneCode - Kod zon JAKIM, contoh: 'WLY01'
 * @param date     - Tarikh dalam format ISO 'YYYY-MM-DD'
 * @returns Rekod waktu solat, atau undefined jika tiada data
 */
export function getPrayerTimesForDate(
  zoneCode: string,
  date: string,
): PrayerTimeRow | undefined {
  return getPrayerTimesByDate(zoneCode, date);
}

// ============================================================
// Pengurusan pertukaran tahun
// ============================================================

/**
 * Tentukan sama ada kita hampir penghujung tahun (bulan Oktober ke Disember).
 * Jika ya, pra-muat data tahun berikutnya supaya app terus berfungsi pada 1 Januari.
 */
function isNearYearEnd(date: Date): boolean {
  return date.getMonth() >= 9; // Oktober = 9, November = 10, Disember = 11
}

/**
 * Pastikan data waktu solat untuk tahun semasa (dan tahun berikutnya jika hampir
 * penghujung tahun) tersedia secara lokal untuk zon yang diberikan.
 *
 * Fungsi ini sesuai dipanggil semasa bootstrap aplikasi.
 *
 * @param zoneCode - Kod zon JAKIM, contoh: 'WLY01'
 * @throws {PrayerTimeSyncError} jika download gagal dan tiada data lokal
 */
export async function syncPrayerTimesForZone(zoneCode: string): Promise<void> {
  const now = new Date();
  const currentYear = now.getFullYear();

  await ensurePrayerTimesAvailable(zoneCode, currentYear);

  if (isNearYearEnd(now)) {
    const nextYear = currentYear + 1;
    console.log(
      `[sync] Hampir penghujung tahun — cuba pra-muat data untuk ${zoneCode}/${nextYear}...`,
    );
    try {
      await ensurePrayerTimesAvailable(zoneCode, nextYear);
    } catch (err) {
      // Gagal pra-muat tahun berikutnya tidak dianggap ralat kritikal —
      // log sahaja dan teruskan dengan data tahun semasa.
      console.warn(
        `[sync] Amaran: gagal pra-muat data ${zoneCode}/${nextYear}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
