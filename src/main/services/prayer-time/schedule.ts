import { getPrayerTimesByYear, getPrayerTimeYears, getZoneByCode } from '../../database';
import { getSettings } from '../settings';
import type { PrayerSchedule } from '../../../shared/types';

/** Read cached data only; opening the verification page never triggers a download. */
export function getPrayerSchedule(requestedYear?: number): PrayerSchedule {
  if (requestedYear !== undefined && (!Number.isInteger(requestedYear) || requestedYear < 1900 || requestedYear > 9999)) {
    throw new Error('Tahun tidak sah.');
  }
  const zoneCode = getSettings().activeZoneCode;
  const years = zoneCode ? getPrayerTimeYears(zoneCode) : [];
  const currentYear = new Date().getFullYear();
  const year = requestedYear ?? (years.includes(currentYear) ? currentYear : years[0] ?? currentYear);
  const rows = zoneCode ? getPrayerTimesByYear(zoneCode, year) : [];
  return {
    zoneCode,
    zoneName: zoneCode ? getZoneByCode(zoneCode)?.zone_name ?? null : null,
    years,
    year,
    rows: rows.map((row) => ({
      id: row.id, zoneCode: row.zone_code, year: row.year, date: row.date,
      hijri: row.hijri, dayLabel: row.day_label, imsak: row.imsak, fajr: row.fajr,
      syuruk: row.syuruk, dhuha: row.dhuha, dhuhr: row.dhuhr, asr: row.asr,
      maghrib: row.maghrib, isha: row.isha, source: row.source,
    })),
  };
}
