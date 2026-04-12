# Architecture Document

## Projek
**myAzan**

## Objektif Seni Bina
Dokumen ini menerangkan cadangan seni bina teknikal untuk aplikasi myAzan, sebuah aplikasi Electron.js desktop untuk Windows yang memainkan azan, notifikasi awal, dan audio idle al-Quran/zikir berdasarkan data waktu solat JAKIM yang disimpan secara lokal.

Matlamat seni bina:
- modular dan mudah diselenggara,
- selamat mengikut amalan Electron,
- stabil untuk operasi 24 jam,
- menyokong offline-first,
- mudah dikembangkan pada versi akan datang.

## Prinsip Reka Bentuk
1. **Offline-first**
   - Selepas data dimuat turun, aplikasi mesti boleh terus berfungsi tanpa internet.
2. **Separation of concerns**
   - UI, database, scheduler, network sync, dan audio mesti dipisahkan.
3. **Deterministic scheduling**
   - Trigger hanya berlaku sekali bagi sesuatu event dalam sesuatu hari.
4. **Audio priority aware**
   - Azan mengatasi notifikasi, dan notifikasi mengatasi audio idle.
5. **Maintainability**
   - Kod perlu dipecahkan kepada modul kecil dengan tanggungjawab jelas.

## Cadangan Tech Stack
- **Desktop framework:** Electron.js
- **Language:** TypeScript
- **Database:** SQLite
- **State management UI:** bebas, tetapi ringkas dan modular
- **Build tooling:** ikut pilihan projek Electron moden yang sesuai untuk TypeScript

## Seni Bina Tahap Tinggi
Sistem dibahagikan kepada 3 lapisan utama:

### 1. Main Process
Bertanggungjawab untuk:
- bootstrap aplikasi,
- akses database,
- pemanggilan API,
- scheduler,
- playback audio,
- pengurusan filesystem,
- pendaftaran IPC.

### 2. Preload Layer
Bertanggungjawab untuk:
- mendedahkan API yang selamat kepada renderer,
- mengelakkan renderer mendapat akses langsung kepada Node.js API yang berisiko.

### 3. Renderer Process
Bertanggungjawab untuk:
- paparan UI,
- halaman tetapan,
- halaman Tentang Pembangun,
- interaksi pengguna.

## Cadangan Struktur Folder
```text
src/
  main/
    bootstrap/
    database/
    services/
      prayer-time/
      scheduler/
      audio/
      settings/
      zones/
    ipc/
    utils/
  preload/
  renderer/
    pages/
    components/
    store/
    layouts/
  shared/
    types/
    constants/
    schemas/
```

## Modul Utama

### 1. Bootstrap Module
Tanggungjawab:
- memulakan aplikasi,
- memuatkan tetapan awal,
- menentukan zon aktif,
- memastikan data tahun semasa tersedia,
- memulakan scheduler dan audio engine.

Contoh aliran:
1. App start
2. Load settings
3. Resolve active zone
4. Check prayer data for current year
5. Download if missing
6. Start scheduler
7. Start idle playback if enabled

### 2. Database Module
Tanggungjawab:
- mengurus sambungan SQLite,
- migration atau inisialisasi schema,
- CRUD untuk tetapan, zon, dan prayer times,
- simpan status trigger harian.

Prinsip:
- semua query database tertumpu di lapisan ini,
- modul lain tidak menulis SQL secara terus jika boleh dielakkan.

### 3. Zone Management Module
Tanggungjawab:
- menyediakan senarai zon,
- menetapkan zon aktif,
- menyemak ketersediaan data mengikut zon dan tahun.

### 4. Prayer Time Sync Module
Tanggungjawab:
- memanggil API JAKIM,
- menormalkan respons,
- menukar data kepada format database,
- simpan data mengikut zon dan tahun.

Keperluan:
- validasi respons API,
- elak simpan data pendua,
- tangani ralat rangkaian dengan baik.

### 5. Scheduler Module
Tanggungjawab:
- memeriksa masa semasa secara berkala,
- mendapatkan jadual waktu semasa berdasarkan tarikh, zon, dan tahun,
- menentukan sama ada notifikasi atau azan perlu dicetuskan,
- merekod event yang telah dimainkan supaya tidak berulang.

Cadangan pendekatan:
- guna interval tetap, contohnya setiap 1 saat atau beberapa saat,
- bandingkan masa semasa dengan jadual hari ini,
- rekod `last_triggered` untuk event semasa.

Scheduler perlu mengurus:
- imsak
- subuh
- syuruk
- dhuha
- zohor
- asar
- maghrib
- isyak

Scheduler juga perlu tangani:
- pertukaran hari,
- pertukaran tahun,
- pemulihan selepas aplikasi restart.

### 6. Audio Engine Module
Tanggungjawab:
- mengurus tiga player berasingan,
- melaksanakan priority rules,
- pause/resume/stop untuk playback,
- memaklumkan status semasa kepada UI jika perlu.

Cadangan abstraksi:
- `AzanPlayer`
- `NotificationPlayer`
- `IdlePlayer`
- `AudioCoordinator`

`AudioCoordinator` bertindak sebagai pengawal utama yang memutuskan audio mana perlu dimainkan berdasarkan keutamaan.

## Aliran Playback Audio

### Senario 1: Idle biasa
1. Tiada notifikasi aktif
2. Tiada azan aktif
3. IdlePlayer memainkan fail MP3 ikut susunan nama fail

### Senario 2: Notifikasi sebelum waktu
1. Scheduler mengesan waktu notifikasi telah tiba
2. AudioCoordinator mengarahkan IdlePlayer pause/stop
3. NotificationPlayer memainkan audio notifikasi
4. Selepas selesai, IdlePlayer disambung semula jika aktif

### Senario 3: Azan masuk waktu
1. Scheduler mengesan masuk waktu azan
2. AudioCoordinator menghentikan NotificationPlayer atau IdlePlayer jika perlu
3. AzanPlayer memainkan audio azan
4. Selepas selesai, IdlePlayer disambung semula jika tetapan membenarkan

## IPC Design
Renderer tidak patut mengakses database, filesystem, atau API secara langsung.

Preload perlu mendedahkan API seperti:
- `getSettings()`
- `saveSettings(payload)`
- `getZones()`
- `setActiveZone(zoneCode)`
- `selectAudioFile(type)`
- `selectAudioFolder()`
- `getPlaybackStatus()`
- `getAppInfo()`

Prinsip:
- whitelist method sahaja,
- validasi input sebelum dihantar ke main process.

## Data Model Cadangan

### 1. zones
Menyimpan senarai kod dan nama zon.

Cadangan medan:
- `code` (PK)
- `state_name`
- `zone_name`

### 2. settings
Menyimpan tetapan umum aplikasi.

Cadangan medan:
- `key`
- `value`

Atau gunakan jadual tunggal berbentuk key-value untuk konfigurasi umum.

### 3. prayer_times
Menyimpan waktu solat tahunan.

Cadangan medan:
- `id`
- `zone_code`
- `year`
- `date`
- `imsak`
- `fajr`
- `syuruk`
- `dhuha`
- `dhuhr`
- `asr`
- `maghrib`
- `isha`
- unique index pada `(zone_code, date)`

### 4. notification_settings
Menyimpan tetapan notifikasi per waktu.

Cadangan medan:
- `event_name`
- `enabled`
- `minutes_before`
- `audio_file_path`

### 5. audio_settings
Menyimpan tetapan audio lain.

Cadangan medan:
- `azan_subuh_file`
- `azan_other_file`
- `idle_folder_path`
- `idle_enabled`

### 6. trigger_log
Menyimpan event yang telah dicetuskan untuk mengelakkan pengulangan.

Cadangan medan:
- `id`
- `date`
- `zone_code`
- `event_name`
- `trigger_type` (`notification` atau `azan`)
- `triggered_at`
- unique index pada `(date, zone_code, event_name, trigger_type)`

## Aliran Data

### App startup
1. Bootstrap baca tetapan
2. Tentukan zon aktif
3. Pastikan data tahun semasa wujud
4. Jika tiada, panggil Prayer Time Sync Module
5. Mula Scheduler
6. Mula IdlePlayer jika enabled

### User tukar zon
1. UI hantar permintaan melalui IPC
2. Main process kemas kini tetapan zon aktif
3. Semak data zon + tahun semasa
4. Muat turun jika belum ada
5. Scheduler refresh konteks semasa

### Trigger harian
1. Scheduler dapatkan row prayer time untuk hari ini
2. Scheduler bandingkan masa semasa dengan masa sasaran
3. Jika padan dan belum pernah dicetuskan, trigger audio
4. Simpan rekod ke trigger_log

## Pengendalian Masa
Cadangan penting:
- guna timezone tempatan Malaysia secara konsisten,
- simpan masa event dalam format yang mudah dibandingkan,
- elak logik masa yang terlalu kompleks dalam UI,
- semua logik pengiraan masa diletakkan pada scheduler/service layer.

## Pengendalian Ralat
Perlu tangani keadaan berikut:
- API gagal dicapai
- format respons API berubah
- fail audio tiada atau rosak
- folder idle kosong
- zon tiada data untuk tarikh tertentu
- jam sistem berubah secara mendadak

Prinsip pengendalian:
- teruskan operasi jika data lokal masih ada,
- log ralat teknikal untuk diagnosis,
- papar mesej mesra pengguna dalam Bahasa Melayu.

## Keselamatan Electron
Amalan yang disyorkan:
- `contextIsolation: true`
- `nodeIntegration: false`
- preload sebagai pintu masuk tunggal untuk API renderer
- validasi semua IPC input
- jangan execute arbitrary code dari UI

## Strategi Ujian

### Ujian unit
Fokus pada:
- parser respons API,
- scheduler decision logic,
- audio priority decision,
- normalisasi data zon/tahun,
- trigger deduplication.

### Ujian integrasi
Fokus pada:
- aliran startup,
- muat turun dan simpan data,
- pertukaran zon,
- playback event mengikut masa simulasi.

### Ujian manual
Fokus pada:
- pemilihan fail audio,
- pemilihan folder zikir,
- resume idle selepas azan,
- aplikasi berjalan lama tanpa isu memori ketara.

## Cadangan Keputusan Reka Bentuk
1. Guna TypeScript untuk kebolehselenggaraan.
2. Gunakan SQLite untuk simpanan lokal yang ringan dan stabil.
3. Gunakan tiga audio player berasingan untuk kawalan state yang lebih jelas.
4. Simpan trigger log untuk elak event dimainkan berulang.
5. Pastikan semua UI dalam Bahasa Melayu.
6. Pastikan logik utama berada di main process, bukan renderer.

## Ringkasan
Seni bina myAzan perlu memfokuskan kestabilan jangka panjang, ketepatan trigger waktu, dan pengasingan tanggungjawab yang jelas. Reka bentuk modular ini akan memudahkan penggunaan GitHub Copilot, pembangunan berperingkat, dan penyelenggaraan selepas versi pertama siap.
