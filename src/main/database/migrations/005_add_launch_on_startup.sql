-- Migration 005: Tambah tetapan "buka pada startup"
-- Versi: 005_add_launch_on_startup
-- Nilai lalai: true (diaktifkan secara automatik)

INSERT OR IGNORE INTO app_settings (key, value, value_type, updated_at)
VALUES (
  'launch_on_startup',
  'true',
  'boolean',
  strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
);
