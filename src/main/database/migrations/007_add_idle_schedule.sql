-- Jadual senyap harian untuk audio idle sahaja, mengikut waktu tempatan PC.
ALTER TABLE audio_settings ADD COLUMN idle_schedule_enabled INTEGER NOT NULL DEFAULT 0 CHECK (idle_schedule_enabled IN (0, 1));
ALTER TABLE audio_settings ADD COLUMN idle_sleep_time TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE audio_settings ADD COLUMN idle_wake_time TEXT NOT NULL DEFAULT '05:30';
