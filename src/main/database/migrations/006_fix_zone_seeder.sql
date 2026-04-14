-- Migration 006: Betulkan data zon JAKIM berdasarkan zones_from_jakim.json
-- Versi: 006_fix_zone_seeder
-- Sumber: /workaround/zones_from_jakim.json
--
-- Perubahan utama:
--   • Negeri Sembilan: ganti prefix NSN → NGS (NGS01–NGS03)
--   • Sarawak: ganti prefix SRW → SWK, kemas kini nama zon (SWK01–SWK09)
--   • Kelantan: betulkan kod KTN03 → KTN02, kemas kini nama zon
--   • Pahang: tambah PHG06 dan PHG07, kemas kini nama zon
--   • Pulau Pinang: buang PNG02 (tiada dalam data JAKIM)
--   • Sabah: kemas kini nama zon dan tambah SBH08, SBH09
--   • Selangor: buang SGR04 (tiada dalam data JAKIM)
--   • Kemas kini nama zon lain mengikut data JAKIM terkini
--
-- NOTA: Semua data prayer_times dan trigger_log dipadam kerana
--       kod zon berubah. Data waktu solat akan dimuat turun semula
--       dari API JAKIM apabila diperlukan.

-- ============================================================
-- 1. Padam data bergantung sebelum ubah suai zones
-- ============================================================
DELETE FROM trigger_log;
DELETE FROM prayer_times;

-- ============================================================
-- 2. Padam semua zon lama
-- ============================================================
DELETE FROM zones;

-- ============================================================
-- 3. Masukkan semua zon betul dari data JAKIM
-- ============================================================
INSERT INTO zones (code, state_name, zone_name, sort_order, created_at, updated_at) VALUES

-- JOHOR (JHR) — 4 zon
('JHR01', 'Johor', 'Pulau Aur dan Pulau Pemanggil',                                      10, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('JHR02', 'Johor', 'Johor Bahru, Kota Tinggi, Mersing, Kulai',                           11, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('JHR03', 'Johor', 'Kluang, Pontian',                                                    12, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('JHR04', 'Johor', 'Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak',                   13, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- KEDAH (KDH) — 7 zon
('KDH01', 'Kedah', 'Kota Setar, Kubang Pasu, Pokok Sena',                                20, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH02', 'Kedah', 'Kuala Muda, Yan, Pendang',                                           21, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH03', 'Kedah', 'Padang Terap, Sik',                                                  22, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH04', 'Kedah', 'Baling',                                                             23, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH05', 'Kedah', 'Bandar Baharu, Kulim',                                               24, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH06', 'Kedah', 'Langkawi',                                                           25, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH07', 'Kedah', 'Gunung Jerai',                                                       26, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- KELANTAN (KTN) — 2 zon
('KTN01', 'Kelantan', 'Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai, Mukim Chiku', 30, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KTN02', 'Kelantan', 'Gua Musang, Jeli, Lojing',                                        31, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- MELAKA (MLK) — 1 zon
('MLK01', 'Melaka', 'Seluruh Negeri Melaka',                                             40, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- NEGERI SEMBILAN (NGS) — 3 zon
('NGS01', 'Negeri Sembilan', 'Tampin, Jempol',                                           50, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('NGS02', 'Negeri Sembilan', 'Jelebu, Kuala Pilah, Rembau',                              51, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('NGS03', 'Negeri Sembilan', 'Port Dickson, Seremban',                                   52, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- PAHANG (PHG) — 7 zon
('PHG01', 'Pahang', 'Pulau Tioman',                                                      60, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG02', 'Pahang', 'Kuantan, Pekan, Muadzam Shah',                                      61, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG03', 'Pahang', 'Jerantut, Temerloh, Maran, Bera, Jengka',                           62, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG04', 'Pahang', 'Bentong, Lipis, Raub',                                              63, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG05', 'Pahang', 'Genting Sempah, Janda Baik, Bukit Tinggi',                          64, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG06', 'Pahang', 'Cameron Highlands, Genting Highlands, Bukit Fraser',                65, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG07', 'Pahang', 'Rompin (Mukim Rompin, Endau, Pontian)',                             66, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- PERAK (PRK) — 7 zon
('PRK01', 'Perak', 'Tapah, Slim River, Tanjung Malim',                                   70, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK02', 'Perak', 'Kuala Kangsar, Ipoh, Batu Gajah, Kampar',                            71, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK03', 'Perak', 'Lenggong, Pengkalan Hulu, Gerik',                                    72, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK04', 'Perak', 'Temengor, Belum',                                                    73, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK05', 'Perak', 'Teluk Intan, Lumut, Sitiawan, Pulau Pangkor',                        74, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK06', 'Perak', 'Taiping, Bagan Serai, Parit Buntar',                                 75, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK07', 'Perak', 'Bukit Larut',                                                        76, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- PERLIS (PLS) — 1 zon
('PLS01', 'Perlis', 'Kangar, Padang Besar, Arau',                                        80, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- PULAU PINANG (PNG) — 1 zon
('PNG01', 'Pulau Pinang', 'Seluruh Negeri Pulau Pinang',                                 90, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- SABAH (SBH) — 9 zon
('SBH01', 'Sabah', 'Sandakan, Sukau',                                                   100, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH02', 'Sabah', 'Beluran, Telupid',                                                  101, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH03', 'Sabah', 'Lahad Datu, Semporna',                                              102, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH04', 'Sabah', 'Tawau, Kalabakan',                                                  103, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH05', 'Sabah', 'Kudat, Kota Marudu',                                                104, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH06', 'Sabah', 'Gunung Kinabalu',                                                   105, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH07', 'Sabah', 'Kota Kinabalu, Ranau',                                              106, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH08', 'Sabah', 'Keningau, Tambunan',                                                107, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH09', 'Sabah', 'Beaufort, Sipitang',                                                108, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- SARAWAK (SWK) — 9 zon
('SWK01', 'Sarawak', 'Limbang, Lawas',                                                  110, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK02', 'Sarawak', 'Miri, Marudi',                                                    111, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK03', 'Sarawak', 'Bintulu',                                                         112, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK04', 'Sarawak', 'Sibu, Kapit',                                                     113, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK05', 'Sarawak', 'Sarikei',                                                         114, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK06', 'Sarawak', 'Sri Aman, Betong',                                                115, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK07', 'Sarawak', 'Serian, Samarahan',                                               116, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK08', 'Sarawak', 'Kuching, Bau, Lundu',                                             117, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SWK09', 'Sarawak', 'Zon Khas Kampung Patarikan',                                      118, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- SELANGOR (SGR) — 3 zon
('SGR01', 'Selangor', 'Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam', 130, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SGR02', 'Selangor', 'Kuala Selangor, Sabak Bernam',                                   131, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SGR03', 'Selangor', 'Klang, Kuala Langat',                                             132, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- TERENGGANU (TRG) — 4 zon
('TRG01', 'Terengganu', 'Kuala Terengganu, Marang',                                     140, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('TRG02', 'Terengganu', 'Besut, Setiu',                                                  141, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('TRG03', 'Terengganu', 'Hulu Terengganu',                                               142, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('TRG04', 'Terengganu', 'Dungun, Kemaman',                                               143, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- WILAYAH PERSEKUTUAN (WLY) — 2 zon
('WLY01', 'Wilayah Persekutuan', 'Kuala Lumpur, Putrajaya',                              150, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('WLY02', 'Wilayah Persekutuan', 'Labuan',                                               151, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- ============================================================
-- 4. Betulkan active_zone_code jika menggunakan kod lama
--    • NSN* → tidak boleh dipeta terus (kumpulan berbeza), guna SGR01
--    • SRW* → tidak boleh dipeta terus (penomboran berbeza), guna SGR01
--    • KTN03 → KTN02
--    • PNG02 → PNG01
--    • SGR04 → SGR01
-- ============================================================
UPDATE app_settings
SET value = CASE
  WHEN value LIKE 'NSN%'  THEN 'SGR01'
  WHEN value LIKE 'SRW%'  THEN 'SGR01'
  WHEN value = 'KTN03'    THEN 'KTN02'
  WHEN value = 'PNG02'    THEN 'PNG01'
  WHEN value = 'SGR04'    THEN 'SGR01'
  ELSE value
END,
updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
WHERE key = 'active_zone_code';
