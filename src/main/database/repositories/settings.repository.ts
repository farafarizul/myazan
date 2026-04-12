import { getDatabase } from '../connection';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface AppSettingRow {
  key: string;
  value: string | null;
  value_type: SettingValueType;
  updated_at: string;
}

export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(key) as Pick<AppSettingRow, 'value'> | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | null, valueType: SettingValueType = 'string'): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO app_settings (key, value, value_type, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value      = excluded.value,
       value_type = excluded.value_type,
       updated_at = excluded.updated_at`,
  ).run(key, value, valueType, now);
}

export function getActiveZoneCode(): string | null {
  return getSetting('active_zone_code');
}

export function setActiveZoneCode(code: string): void {
  setSetting('active_zone_code', code, 'string');
}
