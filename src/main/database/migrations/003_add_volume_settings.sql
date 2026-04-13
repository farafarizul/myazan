-- Migration 003: Tambah lajur volume untuk setiap player audio
-- Versi: 003_add_volume_settings

ALTER TABLE audio_settings ADD COLUMN azan_volume         INTEGER NOT NULL DEFAULT 100;
ALTER TABLE audio_settings ADD COLUMN notification_volume INTEGER NOT NULL DEFAULT 100;
ALTER TABLE audio_settings ADD COLUMN idle_volume         INTEGER NOT NULL DEFAULT 100;
