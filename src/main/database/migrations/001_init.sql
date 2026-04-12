-- Migration 001: Inisialisasi skema asas myAzan
-- Versi: 001_init
-- Semua jadual, index, dan data seed awal

-- ============================================================
-- Jadual: zones
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  code       TEXT    PRIMARY KEY,
  state_name TEXT    NOT NULL,
  zone_name  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

-- ============================================================
-- Jadual: app_settings (key-value store untuk tetapan umum)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  value_type TEXT NOT NULL DEFAULT 'string',
  updated_at TEXT NOT NULL
);

-- ============================================================
-- Jadual: audio_settings (singleton row, id sentiasa 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS audio_settings (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  azan_subuh_file_path  TEXT,
  azan_other_file_path  TEXT,
  idle_folder_path      TEXT,
  idle_enabled          INTEGER NOT NULL DEFAULT 0,
  idle_resume_mode      TEXT    NOT NULL DEFAULT 'restart_playlist',
  idle_sort_mode        TEXT    NOT NULL DEFAULT 'filename_asc',
  updated_at            TEXT    NOT NULL
);

-- ============================================================
-- Jadual: notification_settings (satu rekod per event waktu)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  event_name      TEXT    PRIMARY KEY,
  enabled         INTEGER NOT NULL DEFAULT 0,
  minutes_before  INTEGER NOT NULL DEFAULT 0,
  audio_file_path TEXT,
  volume          INTEGER,
  updated_at      TEXT    NOT NULL
);

-- ============================================================
-- Jadual: prayer_times (cache data JAKIM tahunan)
-- ============================================================
CREATE TABLE IF NOT EXISTS prayer_times (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_code  TEXT    NOT NULL,
  year       INTEGER NOT NULL,
  date       TEXT    NOT NULL,
  hijri      TEXT,
  day_label  TEXT,
  imsak      TEXT,
  fajr       TEXT    NOT NULL,
  syuruk     TEXT,
  dhuha      TEXT,
  dhuhr      TEXT    NOT NULL,
  asr        TEXT    NOT NULL,
  maghrib    TEXT    NOT NULL,
  isha       TEXT    NOT NULL,
  source     TEXT    NOT NULL DEFAULT 'jakim_api',
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL,
  FOREIGN KEY (zone_code) REFERENCES zones(code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prayer_times_zone_date
  ON prayer_times(zone_code, date);

CREATE INDEX IF NOT EXISTS idx_prayer_times_zone_year
  ON prayer_times(zone_code, year);

-- ============================================================
-- Jadual: trigger_log (rekod event yang telah dimainkan)
-- ============================================================
CREATE TABLE IF NOT EXISTS trigger_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  date           TEXT    NOT NULL,
  zone_code      TEXT    NOT NULL,
  event_name     TEXT    NOT NULL,
  trigger_type   TEXT    NOT NULL,
  scheduled_time TEXT,
  triggered_at   TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'played',
  message        TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trigger_log_unique_event
  ON trigger_log(date, zone_code, event_name, trigger_type);

CREATE INDEX IF NOT EXISTS idx_trigger_log_date
  ON trigger_log(date);

-- ============================================================
-- Seed: audio_settings (satu rekod wajib ada)
-- ============================================================
INSERT OR IGNORE INTO audio_settings (
  id, azan_subuh_file_path, azan_other_file_path, idle_folder_path,
  idle_enabled, idle_resume_mode, idle_sort_mode, updated_at
) VALUES (
  1, NULL, NULL, NULL,
  0, 'restart_playlist', 'filename_asc', datetime('now')
);

-- ============================================================
-- Seed: notification_settings (satu rekod per waktu solat)
-- ============================================================
INSERT OR IGNORE INTO notification_settings
  (event_name, enabled, minutes_before, audio_file_path, volume, updated_at)
VALUES
  ('imsak',   0, 10, NULL, NULL, datetime('now')),
  ('fajr',    1,  5, NULL, NULL, datetime('now')),
  ('syuruk',  0,  5, NULL, NULL, datetime('now')),
  ('dhuha',   0,  5, NULL, NULL, datetime('now')),
  ('dhuhr',   1,  5, NULL, NULL, datetime('now')),
  ('asr',     1,  5, NULL, NULL, datetime('now')),
  ('maghrib', 1,  5, NULL, NULL, datetime('now')),
  ('isha',    1,  5, NULL, NULL, datetime('now'));

-- ============================================================
-- Seed: app_settings (nilai lalai)
-- ============================================================
INSERT OR IGNORE INTO app_settings (key, value, value_type, updated_at)
VALUES
  ('active_zone_code',        NULL,    'string',  datetime('now')),
  ('idle_enabled',            'false', 'boolean', datetime('now')),
  ('auto_download_next_year', 'true',  'boolean', datetime('now'));
