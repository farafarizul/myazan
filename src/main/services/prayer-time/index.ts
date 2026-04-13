import type { NewPrayerTimeRow } from '../../database/repositories/prayer-times.repository';
import { fetchJakimYearlyData, JakimNetworkError, JakimApiError } from './jakim-client';
import { parseJakimResponse, JakimParseError } from './jakim-parser';

export { JakimNetworkError, JakimApiError, JakimParseError };

/**
 * Dapatkan dan parse data waktu solat tahunan daripada API JAKIM.
 *
 * Fungsi ini:
 * 1. Memanggil API JAKIM untuk zon dan tahun yang diberikan
 * 2. Memparse dan mengesahkan response
 * 3. Mengembalikan senarai rekod yang bersih, sedia untuk disimpan ke database
 *
 * @param zoneCode - Kod zon JAKIM, contoh: 'WLY01'
 * @param year     - Tahun yang diminta, contoh: 2025
 * @throws {JakimNetworkError} jika rangkaian gagal
 * @throws {JakimApiError}     jika API memulangkan status bukan-OK
 * @throws {JakimParseError}   jika data tidak lengkap atau rosak
 */
export async function fetchYearlyPrayerTimes(
  zoneCode: string,
  year: number,
): Promise<NewPrayerTimeRow[]> {
  const raw = await fetchJakimYearlyData(zoneCode);
  return parseJakimResponse(raw, zoneCode, year);
}
