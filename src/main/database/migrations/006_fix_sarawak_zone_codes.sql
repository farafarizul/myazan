-- Migration 006: Betulkan kod zon Sarawak daripada SRW ke SWK
-- Versi: 006_fix_sarawak_zone_codes
-- Sebab: JAKIM menggunakan awalan SWK bukan SRW untuk zon Sarawak

-- Kemas kini kod zon Sarawak yang salah
UPDATE zones SET code = 'SWK01', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW01';
UPDATE zones SET code = 'SWK02', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW02';
UPDATE zones SET code = 'SWK03', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW03';
UPDATE zones SET code = 'SWK04', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW04';
UPDATE zones SET code = 'SWK05', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW05';
UPDATE zones SET code = 'SWK06', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW06';
UPDATE zones SET code = 'SWK07', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW07';
UPDATE zones SET code = 'SWK08', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW08';
UPDATE zones SET code = 'SWK09', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE code = 'SRW09';

-- Kemas kini settings jika zon aktif adalah zon Sarawak (SRW)
UPDATE app_settings SET value = 'SWK01', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW01';
UPDATE app_settings SET value = 'SWK02', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW02';
UPDATE app_settings SET value = 'SWK03', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW03';
UPDATE app_settings SET value = 'SWK04', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW04';
UPDATE app_settings SET value = 'SWK05', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW05';
UPDATE app_settings SET value = 'SWK06', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW06';
UPDATE app_settings SET value = 'SWK07', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW07';
UPDATE app_settings SET value = 'SWK08', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW08';
UPDATE app_settings SET value = 'SWK09', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = 'active_zone' AND value = 'SRW09';
