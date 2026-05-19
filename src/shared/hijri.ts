const BULAN_HIJRI_MS = [
  'Muharram',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jamadilawal',
  'Jamadilakhir',
  'Rejab',
  'Syaaban',
  'Ramadan',
  'Syawal',
  'Zulkaedah',
  'Zulhijjah',
] as const;

/**
 * Format tarikh Hijri JAKIM daripada YYYY-MM-DD kepada paparan BM.
 * Contoh: 1447-12-02 -> 2 Zulhijjah 1447.
 */
export function formatTarikhHijri(hijri: string | null | undefined): string {
  if (!hijri) return '-';

  const match = /^(\d{3,4})-(\d{2})-(\d{2})$/.exec(hijri.trim());
  if (!match) return '-';

  const [, year, monthRaw, dayRaw] = match;
  const monthNumber = Number(monthRaw);
  const dayNumber = Number(dayRaw);
  const monthName = BULAN_HIJRI_MS[monthNumber - 1];

  if (!monthName || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 30) {
    return '-';
  }

  return `${dayNumber} ${monthName} ${year}`;
}
