import { getDatabase } from '../connection';

export interface ZoneRow {
  code: string;
  state_name: string;
  zone_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function getAllZones(): ZoneRow[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM zones ORDER BY sort_order ASC, code ASC')
    .all() as ZoneRow[];
}

export function getZoneByCode(code: string): ZoneRow | undefined {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM zones WHERE code = ?')
    .get(code) as ZoneRow | undefined;
}

export function upsertZone(zone: Omit<ZoneRow, 'created_at' | 'updated_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO zones (code, state_name, zone_name, sort_order, created_at, updated_at)
     VALUES (@code, @state_name, @zone_name, @sort_order, @created_at, @updated_at)
     ON CONFLICT(code) DO UPDATE SET
       state_name = excluded.state_name,
       zone_name  = excluded.zone_name,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
  ).run({ ...zone, created_at: now, updated_at: now });
}

export function getZonesByState(stateName: string): ZoneRow[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM zones WHERE state_name = ? ORDER BY sort_order ASC, code ASC')
    .all(stateName) as ZoneRow[];
}

export function getDistinctStateNames(): string[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT state_name
       FROM zones
       GROUP BY state_name
       ORDER BY MIN(sort_order) ASC`,
    )
    .all() as { state_name: string }[];
  return rows.map((r) => r.state_name);
}
