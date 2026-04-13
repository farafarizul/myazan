import {
  getAllZones,
  getZoneByCode,
  getZonesByState,
  getDistinctStateNames,
  type ZoneRow,
} from '../../database';

export type { ZoneRow };

/**
 * Kembalikan semua zon JAKIM tersedia dalam database, diisih mengikut negeri dan kod.
 */
export function fetchAllZones(): ZoneRow[] {
  return getAllZones();
}

/**
 * Kembalikan satu zon berdasarkan kod zon. Kembalikan undefined jika tiada.
 */
export function fetchZoneByCode(code: string): ZoneRow | undefined {
  return getZoneByCode(code);
}

/**
 * Kembalikan semua zon bagi negeri tertentu, e.g. 'Selangor', 'Johor'.
 */
export function fetchZonesByState(stateName: string): ZoneRow[] {
  return getZonesByState(stateName);
}

/**
 * Kembalikan senarai nama negeri unik yang mempunyai zon JAKIM.
 */
export function fetchDistinctStateNames(): string[] {
  return getDistinctStateNames();
}
