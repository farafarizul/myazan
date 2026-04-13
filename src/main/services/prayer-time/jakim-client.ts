import { JAKIM_API_BASE } from '../../../shared/constants';

// ============================================================
// Jenis data mentah daripada API JAKIM
// ============================================================

export interface JakimPrayerTimeEntry {
  hijri: string;
  date: string;    // contoh: "01-Jan-2025"
  day: string;
  imsak: string;
  fajr: string;
  syuruk: string;
  dhuha: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface JakimApiResponse {
  status: string;
  serverTime?: string;
  periodType?: string;
  lang?: string;
  zone?: string;
  bearing?: string;
  prayerTime: JakimPrayerTimeEntry[];
}

// ============================================================
// Ralat khusus
// ============================================================

export class JakimNetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'JakimNetworkError';
  }
}

export class JakimApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'JakimApiError';
  }
}

// ============================================================
// Konfigurasi retry
// ============================================================

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000; // 1 saat; gandakan setiap percubaan

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Fungsi utama
// ============================================================

/**
 * Dapatkan data waktu solat tahunan daripada API JAKIM untuk zon dan tahun tertentu.
 * Akan cuba semula sehingga MAX_ATTEMPTS kali jika gagal.
 *
 * @param zoneCode - Kod zon JAKIM, contoh: 'WLY01'
 * @param year     - Tahun yang diminta (digunakan untuk log; API sentiasa pulangkan tahun semasa)
 * @throws {JakimNetworkError} jika rangkaian gagal selepas semua percubaan
 * @throws {JakimApiError}     jika API memulangkan status bukan-OK
 */
export async function fetchJakimYearlyData(
  zoneCode: string,
  year: number,
): Promise<JakimApiResponse> {
  const url = `${JAKIM_API_BASE}&period=year&zone=${encodeURIComponent(zoneCode)}`;
  void year; // disimpan untuk kegunaan log masa hadapan

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000), // 30 saat timeout
      });

      if (!response.ok) {
        throw new JakimApiError(
          `API JAKIM memulangkan HTTP ${response.status} untuk zon ${zoneCode}`,
          response.status,
        );
      }

      const data = (await response.json()) as JakimApiResponse;
      return data;
    } catch (err) {
      lastError = err;

      // Jangan cuba semula untuk ralat API (bukan ralat rangkaian)
      if (err instanceof JakimApiError) {
        throw err;
      }

      if (attempt < MAX_ATTEMPTS) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delayMs);
      }
    }
  }

  throw new JakimNetworkError(
    `Gagal menghubungi API JAKIM untuk zon ${zoneCode} selepas ${MAX_ATTEMPTS} percubaan`,
    lastError,
  );
}
