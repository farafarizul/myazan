-- Migration 002: Seed data zon JAKIM
-- Versi: 002_seed_zones
-- Sumber: Sistem e-Solat JAKIM (https://www.e-solat.gov.my)
-- Semua INSERT OR IGNORE — selamat dijalankan berulang kali

INSERT OR IGNORE INTO zones (code, state_name, zone_name, sort_order, created_at, updated_at) VALUES

-- ============================================================
-- JOHOR (JHR) — 4 zon
-- ============================================================
('JHR01', 'Johor', 'Pulau Aur, Pulau Pemanggil',                                         10, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('JHR02', 'Johor', 'Johor Bahru, Kota Tinggi, Mersing, Kulai',                           11, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('JHR03', 'Johor', 'Kluang, Pontian',                                                    12, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('JHR04', 'Johor', 'Batu Pahat, Muar, Segamat, Gemas Johor',                             13, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- KEDAH (KDH) — 7 zon
-- ============================================================
('KDH01', 'Kedah', 'Kota Setar, Kubang Pasu, Pokok Sena (Daerah Kecil)',                 20, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH02', 'Kedah', 'Kuala Muda, Yan, Pendang',                                           21, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH03', 'Kedah', 'Padang Terap, Sik',                                                  22, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH04', 'Kedah', 'Baling',                                                             23, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH05', 'Kedah', 'Bandar Baharu, Kulim',                                               24, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH06', 'Kedah', 'Langkawi',                                                           25, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KDH07', 'Kedah', 'Puncak Gunung Jerai',                                                26, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- KELANTAN (KTN) — 2 zon
-- ============================================================
('KTN01', 'Kelantan', 'Kota Bharu, Bachok, Pasir Puteh, Tumpat, Pasir Mas, Tanah Merah, Machang, Kuala Krai, Mukim Chiku', 30, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('KTN03', 'Kelantan', 'Gua Musang (Daerah Besar Kelantan)',                              31, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- MELAKA (MLK) — 1 zon
-- ============================================================
('MLK01', 'Melaka', 'Seluruh Negeri Melaka',                                             40, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- NEGERI SEMBILAN (NSN) — 3 zon
-- ============================================================
('NSN01', 'Negeri Sembilan', 'Jempol, Jelebu',                                           50, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('NSN02', 'Negeri Sembilan', 'Kuala Pilah, Kota (Daerah Kecil), Rompin, Bahau',          51, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('NSN03', 'Negeri Sembilan', 'Seremban, Tampin, Port Dickson',                           52, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- PAHANG (PHG) — 5 zon
-- ============================================================
('PHG01', 'Pahang', 'Pulau Tioman',                                                      60, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG02', 'Pahang', 'Kuantan, Pekan, Rompin, Muadzam Shah',                              61, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG03', 'Pahang', 'Maran, Chenor, Temerloh, Bera, Mahkota, Jengka',                   62, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG04', 'Pahang', 'Bentong, Lipis, Raub',                                              63, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PHG05', 'Pahang', 'Genting Highland, Cameron Highland, Bukit Fraser',                  64, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- PERAK (PRK) — 7 zon
-- ============================================================
('PRK01', 'Perak', 'Tapah, Slim River, Tanjung Malim',                                   70, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK02', 'Perak', 'Kuala Kangsar, Sri Iskandar, Pengkalan Hulu, Grik, Lenggong',        71, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK03', 'Perak', 'Larut, Matang, Selama',                                              72, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK04', 'Perak', 'Kinta (Ipoh)',                                                       73, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK05', 'Perak', 'Batu Gajah, Kampar, Sitiawan, Bagan Datuk, Ulu Perak',              74, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK06', 'Perak', 'Dindings, Manjung',                                                  75, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PRK07', 'Perak', 'Bukit Larut',                                                        76, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- PERLIS (PLS) — 1 zon
-- ============================================================
('PLS01', 'Perlis', 'Kangar, Padang Besar, Arau',                                        80, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- PULAU PINANG (PNG) — 2 zon
-- ============================================================
('PNG01', 'Pulau Pinang', 'Seluruh Negeri Pulau Pinang',                                 90, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('PNG02', 'Pulau Pinang', 'Seberang Perai',                                              91, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- SABAH (SBH) — 7 zon
-- ============================================================
('SBH01', 'Sabah', 'Sandakan, Batu Sapi, Kinabatangan, Lahad Datu, Kulamba',            100, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH02', 'Sabah', 'Beaufort, Kuala Penyu, Sipitang, Labuan, Menumbok, Sundar, Weston', 101, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH03', 'Sabah', 'Lahad Datu, Silabukan, Kunak, Semporna, Tawau, Balong',             102, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH04', 'Sabah', 'Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan', 103, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH05', 'Sabah', 'Pensiangan, Keningau, Tambunan, Nabawan',                           104, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH06', 'Sabah', 'Kota Marudu, Pitas, Kudat, Banggi',                                 105, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SBH07', 'Sabah', 'Kinabalu Park',                                                      106, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- SARAWAK (SRW) — 9 zon
-- ============================================================
('SRW01', 'Sarawak', 'Kuching, Bau, Lundu, Sematan',                                    110, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW02', 'Sarawak', 'Sri Aman, Lubok Antu, Betong',                                    111, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW03', 'Sarawak', 'Saratok, Asajaya, Kota Samarahan, Simunjan, Serian, Sebuyau, Meludam', 112, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW04', 'Sarawak', 'Sibu, Dalat, Mukah, Balingian, Tatau, Belawai',                   113, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW05', 'Sarawak', 'Kapit, Song, Kanowit, Belaga, Pakan',                             114, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW06', 'Sarawak', 'Sarikei, Meradong, Daro, Julau, Matu, Pusa',                      115, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW07', 'Sarawak', 'Limbang, Lawas, Sundar, Trusan',                                  116, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW08', 'Sarawak', 'Miri, Niah, Bekenu, Sibuti, Marudi',                              117, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SRW09', 'Sarawak', 'Bintulu, Tatau, Belaga',                                          118, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- SELANGOR (SGR) — 4 zon
-- ============================================================
('SGR01', 'Selangor', 'Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam', 130, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SGR02', 'Selangor', 'Kuala Selangor, Sabak Bernam',                                   131, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SGR03', 'Selangor', 'Klang, Kuala Langat',                                             132, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('SGR04', 'Selangor', 'Banting, Kuala Selangor (Daerah Kecil)',                          133, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- TERENGGANU (TRG) — 4 zon
-- ============================================================
('TRG01', 'Terengganu', 'Kuala Terengganu, Marang, Kuala Nerus',                        140, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('TRG02', 'Terengganu', 'Besut, Setiu',                                                  141, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('TRG03', 'Terengganu', 'Hulu Terengganu',                                               142, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('TRG04', 'Terengganu', 'Kemaman',                                                       143, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

-- ============================================================
-- WILAYAH PERSEKUTUAN (WLY) — 2 zon
-- ============================================================
('WLY01', 'Wilayah Persekutuan', 'Kuala Lumpur, Putrajaya',                              150, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
('WLY02', 'Wilayah Persekutuan', 'Labuan',                                               151, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
