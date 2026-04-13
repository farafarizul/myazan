-- Migration 004: Kemaskini tetapan lalai
-- Versi: 004_update_default_settings
-- Gunakan fail notifikasi lalai, kelantangan zikir 50%, dan zon SGR01

-- Kemaskini tetapan notifikasi untuk waktu solat utama
-- (enabled=1, minutes_before=15)
UPDATE notification_settings
SET enabled = 1,
    minutes_before = 15,
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
WHERE event_name IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');

-- Kemaskini kelantangan zikir (idle) kepada 50% sebagai lalai
UPDATE audio_settings
SET idle_volume = 50,
    updated_at  = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
WHERE id = 1;

-- Tetapkan zon aktif kepada SGR01 hanya jika belum dikonfigurasi
UPDATE app_settings
SET value      = 'SGR01',
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
WHERE key = 'active_zone_code'
  AND (value IS NULL OR value = '');
