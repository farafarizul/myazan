import type { NewPrayerTimeRow } from '../../database/repositories/prayer-times.repository';
import type {
  JakimApiResponse,
  JakimPrayerTimeEntry,
} from './jakim-client';

// ============================================================
// Ralat khusus
// ============================================================

export class JakimParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JakimParseError';
  }
}

// ============================================================
// Pembantu pengesahan
// ============================================================

/** Semak format masa HH:MM:SS atau HH:MM */
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value.trim());
}

/**
 * Tukar tarikh daripada format "DD-MMM-YYYY" → "YYYY-MM-DD".
 * Pulangkan null jika format tidak dikenali.
 */
function normalizeDateString(raw: string): string | null {
  // Contoh: "01-Jan-2025"
  const parts = raw.trim().split('-');
  if (parts.length !== 3) return null;

  const [dayStr, monthStr, yearStr] = parts;
  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const month = monthMap[monthStr];
  if (!month) return null;

  const day = dayStr.padStart(2, '0');
  const date = `${yearStr}-${month}-${day}`;

  // Sahkan format tarikh yang dihasilkan
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

/** Normalkan masa — buang saat jika ada, pulangkan format HH:MM */
function normalizeTime(raw: string): string {
  return raw.trim().substring(0, 5);
}

// ============================================================
// Parse satu rekod
// ============================================================

function parseEntry(
  entry: JakimPrayerTimeEntry,
  zoneCode: string,
  year: number,
  index: number,
): NewPrayerTimeRow {
  const label = `Rekod ke-${index + 1} (${entry.date ?? 'tarikh tidak diketahui'})`;

  // Normalkan tarikh
  const date = normalizeDateString(entry.date ?? '');
  if (!date) {
    throw new JakimParseError(`${label}: format tarikh tidak sah — "${entry.date}"`);
  }

  // Waktu wajib
  const requiredFields: Array<keyof JakimPrayerTimeEntry> = [
    'fajr',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];
  for (const field of requiredFields) {
    if (!isValidTime(entry[field])) {
      throw new JakimParseError(
        `${label}: medan wajib "${field}" tidak sah atau kosong — "${entry[field]}"`,
      );
    }
  }

  return {
    zone_code: zoneCode,
    year,
    date,
    hijri: entry.hijri?.trim() || null,
    day_label: entry.day?.trim() || null,
    imsak: isValidTime(entry.imsak) ? normalizeTime(entry.imsak) : null,
    fajr: normalizeTime(entry.fajr),
    syuruk: isValidTime(entry.syuruk) ? normalizeTime(entry.syuruk) : null,
    dhuha: isValidTime(entry.dhuha) ? normalizeTime(entry.dhuha) : null,
    dhuhr: normalizeTime(entry.dhuhr),
    asr: normalizeTime(entry.asr),
    maghrib: normalizeTime(entry.maghrib),
    isha: normalizeTime(entry.isha),
    source: 'jakim',
  };
}

// ============================================================
// Fungsi utama
// ============================================================

/**
 * Parse dan sahkan response API JAKIM, hasilkan senarai rekod yang bersih.
 *
 * @param data     - Objek response mentah daripada API JAKIM
 * @param zoneCode - Kod zon yang diminta
 * @param year     - Tahun yang diminta
 * @returns Senarai NewPrayerTimeRow yang sah dan konsisten
 * @throws {JakimParseError} jika data tidak lengkap atau rosak
 */
export function parseJakimResponse(
  data: JakimApiResponse,
  zoneCode: string,
  year: number,
): NewPrayerTimeRow[] {
  // Semak status API
  if (!data || typeof data !== 'object') {
    throw new JakimParseError('Response API JAKIM bukan objek yang sah');
  }

  if (typeof data.status !== 'string' || !data.status.toLowerCase().startsWith('ok')) {
    throw new JakimParseError(
      `API JAKIM memulangkan status tidak OK: "${data.status}"`,
    );
  }

  if (!Array.isArray(data.prayerTime) || data.prayerTime.length === 0) {
    throw new JakimParseError(
      `API JAKIM tidak memulangkan data waktu solat untuk zon ${zoneCode}`,
    );
  }

  // Jangkakan sekurang-kurangnya 300 rekod (≈365 hari) untuk data tahunan
  const MIN_RECORDS = 300;
  if (data.prayerTime.length < MIN_RECORDS) {
    throw new JakimParseError(
      `Data tahunan tidak lengkap: hanya ${data.prayerTime.length} rekod diterima (minimum ${MIN_RECORDS})`,
    );
  }

  const rows: NewPrayerTimeRow[] = [];
  const seenDates = new Set<string>();

  for (let i = 0; i < data.prayerTime.length; i++) {
    const entry = data.prayerTime[i];
    const row = parseEntry(entry, zoneCode, year, i);

    // Elak duplikasi tarikh
    if (seenDates.has(row.date)) {
      continue;
    }
    seenDates.add(row.date);
    rows.push(row);
  }

  return rows;
}
