import { getDatabase } from '../connection';

export interface PrayerTimeRow {
  id: number;
  zone_code: string;
  year: number;
  date: string;
  hijri: string | null;
  day_label: string | null;
  imsak: string | null;
  fajr: string;
  syuruk: string | null;
  dhuha: string | null;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export type NewPrayerTimeRow = Omit<PrayerTimeRow, 'id' | 'created_at' | 'updated_at'>;

/**
 * Semak sama ada data waktu solat untuk zon + tahun tertentu sudah wujud.
 */
export function hasPrayerTimes(zoneCode: string, year: number): boolean {
  const db = getDatabase();
  const row = db
    .prepare(
      'SELECT 1 AS exists_flag FROM prayer_times WHERE zone_code = ? AND year = ? LIMIT 1',
    )
    .get(zoneCode, year) as { exists_flag: number } | undefined;
  return row !== undefined;
}

/**
 * Dapatkan data waktu solat untuk tarikh tertentu.
 */
export function getPrayerTimesByDate(
  zoneCode: string,
  date: string,
): PrayerTimeRow | undefined {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM prayer_times WHERE zone_code = ? AND date = ?')
    .get(zoneCode, date) as PrayerTimeRow | undefined;
}

/**
 * Dapatkan semua waktu solat untuk zon + tahun tertentu.
 */
export function getPrayerTimesByYear(zoneCode: string, year: number): PrayerTimeRow[] {
  const db = getDatabase();
  return db
    .prepare(
      'SELECT * FROM prayer_times WHERE zone_code = ? AND year = ? ORDER BY date ASC',
    )
    .all(zoneCode, year) as PrayerTimeRow[];
}

/**
 * Simpan banyak rekod waktu solat serentak.
 * Gunakan INSERT OR REPLACE untuk elak duplikasi.
 */
export function savePrayerTimes(rows: NewPrayerTimeRow[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const insert = db.prepare(
    `INSERT INTO prayer_times
       (zone_code, year, date, hijri, day_label, imsak, fajr, syuruk, dhuha,
        dhuhr, asr, maghrib, isha, source, created_at, updated_at)
     VALUES
       (@zone_code, @year, @date, @hijri, @day_label, @imsak, @fajr, @syuruk,
        @dhuha, @dhuhr, @asr, @maghrib, @isha, @source, @created_at, @updated_at)
     ON CONFLICT(zone_code, date) DO UPDATE SET
       year      = excluded.year,
       hijri     = excluded.hijri,
       day_label = excluded.day_label,
       imsak     = excluded.imsak,
       fajr      = excluded.fajr,
       syuruk    = excluded.syuruk,
       dhuha     = excluded.dhuha,
       dhuhr     = excluded.dhuhr,
       asr       = excluded.asr,
       maghrib   = excluded.maghrib,
       isha      = excluded.isha,
       source    = excluded.source,
       updated_at = excluded.updated_at`,
  );

  const insertAll = db.transaction((items: NewPrayerTimeRow[]) => {
    for (const row of items) {
      insert.run({ ...row, created_at: now, updated_at: now });
    }
  });

  insertAll(rows);
}
