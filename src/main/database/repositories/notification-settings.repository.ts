import { getDatabase } from '../connection';

export interface NotificationSettingRow {
  event_name: string;
  enabled: number;
  minutes_before: number;
  audio_file_path: string | null;
  volume: number | null;
  updated_at: string;
}

export function getAllNotificationSettings(): NotificationSettingRow[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM notification_settings ORDER BY rowid ASC')
    .all() as NotificationSettingRow[];
}

export function getNotificationSetting(
  eventName: string,
): NotificationSettingRow | undefined {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM notification_settings WHERE event_name = ?')
    .get(eventName) as NotificationSettingRow | undefined;
}

export function saveNotificationSetting(
  eventName: string,
  payload: Partial<Omit<NotificationSettingRow, 'event_name' | 'updated_at'>>,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const current = getNotificationSetting(eventName);
  if (!current) {
    db.prepare(
      `INSERT INTO notification_settings
         (event_name, enabled, minutes_before, audio_file_path, volume, updated_at)
       VALUES
         (@event_name, @enabled, @minutes_before, @audio_file_path, @volume, @updated_at)`,
    ).run({
      event_name: eventName,
      enabled: 0,
      minutes_before: 0,
      audio_file_path: null,
      volume: null,
      ...payload,
      updated_at: now,
    });
  } else {
    const merged = { ...current, ...payload, updated_at: now };
    db.prepare(
      `UPDATE notification_settings SET
         enabled         = @enabled,
         minutes_before  = @minutes_before,
         audio_file_path = @audio_file_path,
         volume          = @volume,
         updated_at      = @updated_at
       WHERE event_name = @event_name`,
    ).run(merged);
  }
}
