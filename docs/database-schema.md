# Database Schema

## Projek
**myAzan**

Dokumen ini menerangkan cadangan skema pangkalan data untuk aplikasi myAzan. Fokus utama ialah reka bentuk yang ringan, mudah diselenggara, dan sesuai untuk aplikasi desktop Electron.js yang berjalan secara **offline-first** menggunakan **SQLite**.

---

## Prinsip Reka Bentuk
- Gunakan **SQLite** sebagai storan lokal utama.
- Simpan data berstruktur sahaja dalam database.
- Jangan simpan kandungan MP3 dalam database; simpan **path fail** atau **path folder** sahaja.
- Elakkan duplikasi data.
- Pastikan trigger azan dan notifikasi tidak dimainkan berulang kali untuk event yang sama pada hari yang sama.
- Reka bentuk perlu menyokong pertukaran zon, pertukaran tahun, dan operasi jangka panjang.

---

## Ringkasan Jadual
Sistem dicadangkan mempunyai jadual berikut:

1. `zones`
2. `app_settings`
3. `audio_settings`
4. `notification_settings`
5. `prayer_times`
6. `trigger_log`
7. `schema_migrations` *(opsyenal tetapi digalakkan)*

---

## 1. Jadual `zones`
Menyimpan semua kod zon JAKIM dan nama zon yang dipaparkan kepada pengguna.

### Tujuan
- sumber rujukan zon rasmi,
- paparan dropdown zon dalam halaman tetapan,
- mengelakkan hardcode zon di banyak tempat.

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `code` | TEXT | Primary key. Contoh: `JHR01` |
| `state_name` | TEXT | Contoh: `Johor` |
| `zone_name` | TEXT | Contoh: `Johor Bahru, Kota Tinggi, Mersing, Kulai` |
| `sort_order` | INTEGER | Untuk susunan paparan yang konsisten |
| `is_active` | INTEGER | 0 atau 1. Boleh guna jika mahu tandakan zon aktif secara terus |
| `created_at` | TEXT | ISO datetime |
| `updated_at` | TEXT | ISO datetime |

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS zones (
  code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Nota
- Jika anda mahu hanya satu zon aktif, lebih kemas simpan zon aktif dalam `app_settings` berbanding `is_active`.
- `is_active` boleh dibuang jika semua state aktif disimpan di jadual tetapan.

---

## 2. Jadual `app_settings`
Menyimpan tetapan umum aplikasi dalam bentuk **key-value**.

### Tujuan
- tetapan global aplikasi,
- mudah dikembangkan tanpa ubah banyak schema,
- sesuai untuk nilai tunggal seperti zon aktif dan pilihan UI.

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `key` | TEXT | Primary key |
| `value` | TEXT | Simpan nilai sebagai string atau JSON |
| `value_type` | TEXT | Contoh: `string`, `number`, `boolean`, `json` |
| `updated_at` | TEXT | ISO datetime |

### Contoh `key`
- `active_zone_code`
- `app_language`
- `idle_enabled`
- `auto_download_next_year`
- `startup_launch_enabled`

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  value_type TEXT NOT NULL DEFAULT 'string',
  updated_at TEXT NOT NULL
);
```

### Nota
- Sesuai untuk tetapan umum.
- Untuk tetapan audio dan notifikasi yang lebih spesifik, lebih baik guna jadual berasingan supaya query lebih jelas.

---

## 3. Jadual `audio_settings`
Menyimpan tetapan audio utama untuk azan dan idle playback.

### Tujuan
- pusat konfigurasi fail audio azan,
- simpan folder audio idle,
- simpan pilihan resume behavior jika perlu.

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `id` | INTEGER | Primary key, sentiasa 1 untuk single-row settings |
| `azan_subuh_file_path` | TEXT | Path fail MP3 azan Subuh |
| `azan_other_file_path` | TEXT | Path fail MP3 azan selain Subuh |
| `idle_folder_path` | TEXT | Path folder MP3 al-Quran/zikir |
| `idle_enabled` | INTEGER | 0 atau 1 |
| `idle_resume_mode` | TEXT | Contoh: `restart_track`, `resume_track`, `restart_playlist` |
| `idle_sort_mode` | TEXT | Contoh: `filename_asc` |
| `updated_at` | TEXT | ISO datetime |

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS audio_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  azan_subuh_file_path TEXT,
  azan_other_file_path TEXT,
  idle_folder_path TEXT,
  idle_enabled INTEGER NOT NULL DEFAULT 0,
  idle_resume_mode TEXT NOT NULL DEFAULT 'restart_playlist',
  idle_sort_mode TEXT NOT NULL DEFAULT 'filename_asc',
  updated_at TEXT NOT NULL
);
```

### Nota
- Guna satu rekod sahaja untuk aplikasi ini.
- `CHECK (id = 1)` memudahkan jadual bertindak sebagai singleton config table.

---

## 4. Jadual `notification_settings`
Menyimpan tetapan notifikasi bagi setiap waktu.

### Tujuan
- benarkan setiap event mempunyai audio dan tetapan sendiri,
- benarkan enable/disable per waktu,
- benarkan minit awal yang berbeza jika diperlukan.

### Event yang dicadangkan
- `imsak`
- `fajr`
- `syuruk`
- `dhuha`
- `dhuhr`
- `asr`
- `maghrib`
- `isha`

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `event_name` | TEXT | Primary key |
| `enabled` | INTEGER | 0 atau 1 |
| `minutes_before` | INTEGER | Bilangan minit sebelum event |
| `audio_file_path` | TEXT | Path fail MP3 notifikasi |
| `volume` | INTEGER | Pilihan, contohnya 0-100 |
| `updated_at` | TEXT | ISO datetime |

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS notification_settings (
  event_name TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  minutes_before INTEGER NOT NULL DEFAULT 0,
  audio_file_path TEXT,
  volume INTEGER,
  updated_at TEXT NOT NULL
);
```

### Nota
- Seed awal boleh dicipta untuk semua event di atas.
- `minutes_before` boleh sama untuk semua event atau berbeza mengikut reka bentuk UI.

---

## 5. Jadual `prayer_times`
Menyimpan data waktu solat tahunan mengikut zon dan tarikh.

### Tujuan
- cache lokal utama untuk mod offline,
- sumber data scheduler setiap hari,
- menyokong pertukaran tahun tanpa perlu sentiasa online.

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `id` | INTEGER | Primary key autoincrement |
| `zone_code` | TEXT | Foreign key ke `zones.code` |
| `year` | INTEGER | Tahun, contoh `2026` |
| `date` | TEXT | Format `YYYY-MM-DD` |
| `hijri` | TEXT | Pilihan, jika mahu simpan |
| `day_label` | TEXT | Pilihan, contoh `Isnin` |
| `imsak` | TEXT | Format `HH:mm` |
| `fajr` | TEXT | Format `HH:mm` |
| `syuruk` | TEXT | Format `HH:mm` |
| `dhuha` | TEXT | Format `HH:mm` |
| `dhuhr` | TEXT | Format `HH:mm` |
| `asr` | TEXT | Format `HH:mm` |
| `maghrib` | TEXT | Format `HH:mm` |
| `isha` | TEXT | Format `HH:mm` |
| `source` | TEXT | Contoh: `jakim_api` |
| `created_at` | TEXT | ISO datetime |
| `updated_at` | TEXT | ISO datetime |

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS prayer_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  date TEXT NOT NULL,
  hijri TEXT,
  day_label TEXT,
  imsak TEXT,
  fajr TEXT NOT NULL,
  syuruk TEXT,
  dhuha TEXT,
  dhuhr TEXT NOT NULL,
  asr TEXT NOT NULL,
  maghrib TEXT NOT NULL,
  isha TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'jakim_api',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (zone_code) REFERENCES zones(code)
);
```

### Index penting
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_prayer_times_zone_date
ON prayer_times(zone_code, date);

CREATE INDEX IF NOT EXISTS idx_prayer_times_zone_year
ON prayer_times(zone_code, year);
```

### Nota
- Unique index pada `(zone_code, date)` penting untuk elakkan data pendua.
- Masa disimpan sebagai `TEXT` format `HH:mm` kerana mudah dipaparkan dan dibandingkan selepas ditukar dalam service layer.

---

## 6. Jadual `trigger_log`
Merekod event yang telah dimainkan bagi mengelakkan trigger berulang.

### Tujuan
- elak azan dimainkan dua kali pada event yang sama,
- elak notifikasi dimainkan berulang kali,
- bantu pemulihan selepas aplikasi restart.

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `id` | INTEGER | Primary key autoincrement |
| `date` | TEXT | Format `YYYY-MM-DD` |
| `zone_code` | TEXT | Zon aktif ketika trigger |
| `event_name` | TEXT | Contoh: `fajr`, `dhuhr`, `maghrib` |
| `trigger_type` | TEXT | `notification` atau `azan` |
| `scheduled_time` | TEXT | Masa sasaran asal, contoh `05:58` |
| `triggered_at` | TEXT | ISO datetime sebenar |
| `status` | TEXT | Contoh: `played`, `skipped`, `failed` |
| `message` | TEXT | Pilihan, untuk catat ralat |

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS trigger_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  zone_code TEXT NOT NULL,
  event_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  scheduled_time TEXT,
  triggered_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'played',
  message TEXT
);
```

### Index penting
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_trigger_log_unique_event
ON trigger_log(date, zone_code, event_name, trigger_type);

CREATE INDEX IF NOT EXISTS idx_trigger_log_date
ON trigger_log(date);
```

### Nota
- Unique index ini ialah benteng utama untuk elakkan event sama dimainkan berulang.
- Jika insert gagal kerana unique constraint, scheduler boleh anggap event telah diproses.

---

## 7. Jadual `schema_migrations`
Jadual ini opsyenal tetapi sangat disarankan.

### Tujuan
- jejak versi schema,
- memudahkan upgrade aplikasi,
- elak migrasi berjalan berulang kali.

### Medan cadangan
| Medan | Jenis | Nota |
|---|---|---|
| `id` | INTEGER | Primary key autoincrement |
| `version` | TEXT | Contoh: `001_init` |
| `applied_at` | TEXT | ISO datetime |

### SQL cadangan
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
```

---

## Hubungan Antara Jadual

### Hubungan utama
- `prayer_times.zone_code` -> `zones.code`
- `trigger_log.zone_code` -> `zones.code` *(secara logik, walaupun foreign key boleh dibuat opsyenal)*

### Ringkasan hubungan
- Satu `zone` mempunyai banyak `prayer_times`
- Satu `zone` mempunyai banyak `trigger_log`
- `audio_settings` mewakili tetapan audio global aplikasi
- `notification_settings` mewakili tetapan per event
- `app_settings` mewakili tetapan umum dan state aplikasi

---

## Data Seed Awal

### Seed untuk `zones`
Masukkan semua kod zon JAKIM yang telah disenaraikan dalam dokumen projek.

### Seed untuk `notification_settings`
Cipta rekod awal untuk semua event:
- `imsak`
- `fajr`
- `syuruk`
- `dhuha`
- `dhuhr`
- `asr`
- `maghrib`
- `isha`

Contoh seed:
```sql
INSERT INTO notification_settings (event_name, enabled, minutes_before, audio_file_path, updated_at)
VALUES
('imsak', 0, 10, NULL, CURRENT_TIMESTAMP),
('fajr', 1, 5, NULL, CURRENT_TIMESTAMP),
('syuruk', 0, 5, NULL, CURRENT_TIMESTAMP),
('dhuha', 0, 5, NULL, CURRENT_TIMESTAMP),
('dhuhr', 1, 5, NULL, CURRENT_TIMESTAMP),
('asr', 1, 5, NULL, CURRENT_TIMESTAMP),
('maghrib', 1, 5, NULL, CURRENT_TIMESTAMP),
('isha', 1, 5, NULL, CURRENT_TIMESTAMP);
```

### Seed untuk `audio_settings`
```sql
INSERT INTO audio_settings (
  id,
  azan_subuh_file_path,
  azan_other_file_path,
  idle_folder_path,
  idle_enabled,
  idle_resume_mode,
  idle_sort_mode,
  updated_at
)
VALUES (
  1,
  NULL,
  NULL,
  NULL,
  0,
  'restart_playlist',
  'filename_asc',
  CURRENT_TIMESTAMP
);
```

---

## Cadangan Penyimpanan Masa

### Dalam database
- Tarikh: `YYYY-MM-DD`
- Masa event: `HH:mm`
- Timestamp penuh: ISO datetime, contohnya `2026-04-13T05:58:02+08:00`

### Sebab pemilihan ini
- mudah dibaca dan debug,
- mudah dipaparkan dalam UI,
- mudah dibandingkan selepas parsing di service layer,
- tidak bergantung pada format raw API semata-mata.

---

## Cadangan Akses Data Mengikut Modul

### `ZoneRepository`
- `getAllZones()`
- `getZoneByCode(code)`
- `setActiveZone(code)` *(jika aktif disimpan dalam settings, fungsi ini akan update `app_settings`)*

### `SettingsRepository`
- `getSetting(key)`
- `setSetting(key, value)`
- `getAudioSettings()`
- `saveAudioSettings(payload)`
- `getNotificationSettings()`
- `saveNotificationSetting(eventName, payload)`

### `PrayerTimesRepository`
- `hasPrayerTimes(zoneCode, year)`
- `savePrayerTimes(zoneCode, year, rows)`
- `getPrayerTimesByDate(zoneCode, date)`
- `getPrayerTimesByYear(zoneCode, year)`

### `TriggerLogRepository`
- `hasTriggered(date, zoneCode, eventName, triggerType)`
- `insertTriggerLog(payload)`
- `clearOldLogs(beforeDate)`

---

## Strategi Pembersihan Data
Untuk elakkan database membesar tanpa kawalan:
- kekalkan `zones` secara kekal,
- kekalkan `settings` secara kekal,
- simpan `prayer_times` sekurang-kurangnya untuk tahun semasa dan tahun terdahulu yang pernah digunakan,
- padam `trigger_log` lama secara berkala, contohnya lebih 90 atau 180 hari.

Contoh pembersihan log:
```sql
DELETE FROM trigger_log
WHERE date < '2026-01-01';
```

---

## Cadangan Migrasi Versi Awal

### Versi `001_init`
- cipta semua jadual asas,
- cipta semua index,
- seed `audio_settings`,
- seed `notification_settings`,
- seed `zones`.

### Versi masa depan yang mungkin
- tambah `volume` per audio type,
- tambah `playback_history`,
- tambah `system_health_logs`,
- tambah `ui_preferences`.

---

## Skema Minimum yang Praktikal
Jika mahu mula dengan versi paling minimum, jadual wajib ialah:
- `zones`
- `app_settings`
- `audio_settings`
- `notification_settings`
- `prayer_times`
- `trigger_log`

Ini sudah mencukupi untuk MVP myAzan.

---

## Kesimpulan
Reka bentuk database ini memberi asas yang kemas untuk:
- pemilihan zon,
- cache waktu solat tahunan,
- playback audio azan/notifikasi/idle,
- tetapan pengguna,
- pencegahan trigger berganda,
- operasi offline yang stabil.

Untuk implementasi sebenar, utamakan migrasi yang mudah, repository layer yang jelas, dan validasi data API sebelum insert ke dalam `prayer_times`.
