import { getDatabase } from '../connection';

export type TriggerType = 'notification' | 'azan';
export type TriggerStatus = 'played' | 'skipped' | 'failed';

export interface TriggerLogRow {
  id: number;
  date: string;
  zone_code: string;
  event_name: string;
  trigger_type: TriggerType;
  scheduled_time: string | null;
  triggered_at: string;
  status: TriggerStatus;
  message: string | null;
}

export type NewTriggerLogRow = Omit<TriggerLogRow, 'id'>;

/**
 * Semak sama ada event tertentu sudah pernah dicetuskan pada tarikh dan zon yang sama.
 */
export function hasTriggered(
  date: string,
  zoneCode: string,
  eventName: string,
  triggerType: TriggerType,
): boolean {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT 1 AS exists_flag FROM trigger_log
       WHERE date = ? AND zone_code = ? AND event_name = ? AND trigger_type = ?
       LIMIT 1`,
    )
    .get(date, zoneCode, eventName, triggerType) as
    | { exists_flag: number }
    | undefined;
  return row !== undefined;
}

/**
 * Rekodkan event yang telah dicetuskan.
 * Jika event yang sama telah direkod, IGNORE — jangan lempar ralat.
 */
export function insertTriggerLog(payload: NewTriggerLogRow): void {
  const db = getDatabase();
  db.prepare(
    `INSERT OR IGNORE INTO trigger_log
       (date, zone_code, event_name, trigger_type, scheduled_time,
        triggered_at, status, message)
     VALUES
       (@date, @zone_code, @event_name, @trigger_type, @scheduled_time,
        @triggered_at, @status, @message)`,
  ).run(payload);
}

/**
 * Padam rekod trigger lama (lebih daripada tarikh yang ditetapkan).
 * Guna ini untuk pembersihan berkala supaya database tidak membesar.
 */
export function clearOldTriggerLogs(beforeDate: string): number {
  const db = getDatabase();
  const result = db
    .prepare('DELETE FROM trigger_log WHERE date < ?')
    .run(beforeDate);
  return result.changes;
}
