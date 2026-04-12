# Task Breakdown

## Projek
**myAzan**

Dokumen ini memecahkan pembangunan myAzan kepada beberapa fasa yang praktikal supaya mudah dijadikan backlog, milestone, atau tiket GitHub Issues / Projects.

---

## Objektif Pecahan Kerja
- memudahkan pembangunan berperingkat,
- mengurangkan risiko modul besar dibina serentak,
- memudahkan semakan kemajuan,
- memisahkan kerja teknikal mengikut domain.

---

## Cadangan Fasa Pembangunan
1. Fasa 0 — Setup projek dan asas teknikal
2. Fasa 1 — Database dan data zon
3. Fasa 2 — Integrasi API JAKIM dan cache lokal
4. Fasa 3 — Scheduler dan trigger logic
5. Fasa 4 — Audio engine
6. Fasa 5 — UI tetapan dan halaman aplikasi
7. Fasa 6 — Hardening, testing, dan packaging

---

## Fasa 0 — Setup Projek dan Asas Teknikal
### Matlamat
Menyiapkan rangka projek Electron + TypeScript + SQLite dan struktur asas repo.

### Deliverables
- projek Electron.js berjaya dijalankan di Windows,
- TypeScript aktif,
- struktur folder modular diwujudkan,
- linting dan formatting asas tersedia,
- preload + IPC asas tersedia.

### Tugas
#### 0.1 Inisialisasi repo
- cipta repo Git
- sediakan `.gitignore`
- sediakan `README.md`
- sediakan `.github/copilot-instructions.md`
- sediakan folder `docs/`

#### 0.2 Setup Electron + TypeScript
- pilih starter Electron yang sesuai
- aktifkan TypeScript
- sediakan build script untuk dev dan production
- uji aplikasi boleh launch

#### 0.3 Struktur projek
- cipta struktur folder:
  - `src/main`
  - `src/preload`
  - `src/renderer`
  - `src/shared`
- asingkan modul kepada services dan pages

#### 0.4 Keselamatan Electron asas
- tutup Node integration dalam renderer jika tidak perlu
- aktifkan preload bridge sahaja
- whitelist IPC channel

#### 0.5 Setup utiliti pembangunan
- ESLint
- Prettier
- basic logging
- env/config handling jika perlu

### Kriteria siap
- aplikasi kosong boleh dibuka,
- build asas berjaya,
- struktur projek telah stabil untuk modul seterusnya.

---

## Fasa 1 — Database dan Data Zon
### Matlamat
Membina lapisan database lokal dan memasukkan semua senarai zon JAKIM.

### Deliverables
- SQLite berfungsi,
- migration awal tersedia,
- semua jadual utama dicipta,
- data zon telah diseed.

### Tugas
#### 1.1 Setup SQLite
- pilih library SQLite yang sesuai
- bina database bootstrap
- sediakan helper connection dan init database

#### 1.2 Migration awal
- bina migration `001_init`
- cipta jadual:
  - `zones`
  - `app_settings`
  - `audio_settings`
  - `notification_settings`
  - `prayer_times`
  - `trigger_log`
  - `schema_migrations`

#### 1.3 Seed data zon
- masukkan semua kod zon JAKIM dan nama zon
- pastikan susunan paparan zon kemas

#### 1.4 Seed settings awal
- seed `audio_settings`
- seed `notification_settings`
- seed `app_settings` minimum seperti `active_zone_code`

#### 1.5 Repository layer
- bina repository untuk:
  - zones
  - settings
  - prayer_times
  - trigger_log
- pastikan query asas diuji

### Kriteria siap
- database berjaya diwujudkan semasa aplikasi dibuka,
- semua zon boleh dibaca dari database,
- tetapan asas boleh disimpan dan dibaca.

---

## Fasa 2 — Integrasi API JAKIM dan Cache Lokal
### Matlamat
Memastikan data waktu solat boleh dimuat turun, divalidasi, dinormalisasi, dan disimpan secara lokal.

### Deliverables
- service API JAKIM berfungsi,
- parser respons API wujud,
- data zon + tahun boleh disimpan,
- mod offline asas tersedia.

### Tugas
#### 2.1 HTTP client / service layer
- bina service fetch untuk API JAKIM
- sediakan timeout dan error handling

#### 2.2 Parser dan normalizer
- kenal pasti struktur respons API
- normalisasi nama field
- tukar tarikh dan masa ke format dalaman standard
- tapis nilai pelik atau kosong

#### 2.3 Storage logic
- semak sama ada data zon + tahun telah wujud
- jika tiada, insert semua rekod `prayer_times`
- elak insert pendua

#### 2.4 Startup sync logic
- semasa launch, baca zon aktif
- semak data tahun semasa
- muat turun jika belum ada

#### 2.5 Year rollover logic
- jika tahun berubah, semak data tahun baru
- muat turun data baru bila perlu

#### 2.6 Offline fallback
- jika API gagal tetapi data lokal wujud, teruskan operasi
- jika API gagal dan data tiada, tunjuk mesej ralat mesra pengguna

### Kriteria siap
- pilih satu zon dan berjaya simpan jadual setahun,
- data boleh dibaca tanpa internet selepas download,
- ralat API ditangani dengan baik.

---

## Fasa 3 — Scheduler dan Trigger Logic
### Matlamat
Membina logik semakan masa yang stabil untuk azan dan notifikasi.

### Deliverables
- scheduler berfungsi,
- trigger notifikasi dan azan wujud,
- trigger tidak berulang pada hari yang sama.

### Tugas
#### 3.1 Service masa semasa
- bina utiliti masa tempatan Malaysia
- sediakan helper perbandingan tarikh dan masa

#### 3.2 Load prayer time hari ini
- dapatkan rekod `prayer_times` mengikut zon aktif dan tarikh semasa
- fallback jika rekod tiada

#### 3.3 Trigger azan
- semak masa semasa dengan waktu azan
- sokong event:
  - fajr
  - dhuhr
  - asr
  - maghrib
  - isha

#### 3.4 Trigger notifikasi
- semak tetapan `notification_settings`
- kira masa notifikasi berdasarkan `minutes_before`
- sokong event:
  - imsak
  - fajr
  - syuruk
  - dhuha
  - dhuhr
  - asr
  - maghrib
  - isha

#### 3.5 Elak trigger berganda
- semak `trigger_log` sebelum main audio
- insert log selepas event diproses
- tangani restart aplikasi tanpa trigger semula event yang sudah berlalu dan sudah direkod

#### 3.6 Pertukaran hari
- refresh konteks apabila masuk hari baru
- muatkan jadual baru secara automatik

#### 3.7 Pertukaran tahun
- sambungkan logic dengan sync module untuk tahun baru

### Kriteria siap
- event hanya dicetuskan sekali,
- notifikasi dan azan boleh dikesan berdasarkan jadual hari semasa,
- aplikasi stabil jika berjalan lama.

---

## Fasa 4 — Audio Engine
### Matlamat
Membina sistem playback dengan keutamaan audio yang jelas.

### Deliverables
- 3 player berasingan,
- pause/stop/resume logic berfungsi,
- idle playback berjalan secara berterusan.

### Tugas
#### 4.1 Pilih mekanisme playback
- tentukan library atau kaedah playback yang sesuai untuk Electron/Windows
- uji kestabilan playback MP3

#### 4.2 Bina player abstraction
- `AzanPlayer`
- `NotificationPlayer`
- `IdlePlayer`
- `AudioCoordinator`

#### 4.3 Logic keutamaan audio
- azan override semua audio lain
- notifikasi hentikan atau jeda idle audio
- idle hanya main bila tiada audio lebih penting

#### 4.4 Audio azan
- pilih fail azan Subuh
- pilih fail azan selain Subuh
- route event kepada fail yang betul

#### 4.5 Audio notifikasi
- main fail notifikasi mengikut event
- validate file path sebelum main

#### 4.6 Idle playback
- baca folder MP3
- tapis fail audio yang sah
- sort ikut nama fail menaik
- play satu demi satu
- loop semula selepas fail terakhir

#### 4.7 Resume behavior
- tentukan sama ada sambung track semasa atau ulang playlist
- implement behavior yang dipilih

#### 4.8 Error handling audio
- fail hilang
- folder kosong
- format tidak disokong
- speaker tiada atau device error

### Kriteria siap
- azan, notifikasi, dan idle audio boleh dimainkan,
- keutamaan audio dipatuhi,
- idle playback sambung semula selepas event selesai.

---

## Fasa 5 — UI Tetapan dan Halaman Aplikasi
### Matlamat
Membina UI yang mudah digunakan dalam Bahasa Melayu.

### Deliverables
- halaman Tetapan,
- halaman Tentang Pembangun,
- interaksi UI dengan backend melalui IPC.

### Tugas
#### 5.1 Rangka UI asas
- layout utama
- navigasi ringkas
- gaya paparan minimal dan jelas

#### 5.2 Halaman Tetapan: zon
- dropdown zon
- simpan zon aktif
- tunjuk status data tersedia / perlu dimuat turun

#### 5.3 Halaman Tetapan: azan
- pilih fail azan Subuh
- pilih fail azan lain
- paparkan laluan fail yang dipilih

#### 5.4 Halaman Tetapan: notifikasi
- senarai semua event notifikasi
- enable/disable per event
- input minit awal
- pilih fail MP3 per event

#### 5.5 Halaman Tetapan: idle audio
- pilih folder MP3
- enable/disable idle audio
- paparkan ringkasan jumlah fail jika mahu

#### 5.6 Status sistem asas
- paparkan zon aktif
- paparkan waktu seterusnya
- paparkan status audio semasa jika mahu

#### 5.7 Halaman Tentang Pembangun
- nama
- email
- telefon
- objektif projek
- status proprietary software

### Kriteria siap
- semua tetapan utama boleh diurus melalui UI,
- semua label dan mesej dalam Bahasa Melayu,
- perubahan tetapan disimpan dan dimuat semula dengan betul.

---

## Fasa 6 — Hardening, Testing, dan Packaging
### Matlamat
Menjadikan aplikasi lebih stabil dan sedia diuji atau diedarkan.

### Deliverables
- aplikasi lebih tahan ralat,
- test untuk modul penting,
- build installer Windows.

### Tugas
#### 6.1 Logging dan diagnostic
- log startup
- log sync API
- log trigger scheduler
- log error audio

#### 6.2 Ujian modul kritikal
- parser API
- scheduler time matching
- duplicate trigger protection
- repository operations

#### 6.3 Ujian integrasi asas
- startup -> load settings -> sync -> schedule
- tukar zon -> sync -> refresh schedule
- notification -> azan -> resume idle

#### 6.4 Ketahanan operasi panjang
- uji aplikasi berjalan lama
- semak penggunaan memori
- semak kebocoran event listener atau timer

#### 6.5 Packaging Windows
- bina build production
- hasilkan installer atau portable build
- uji pemasangan pada Windows 10 dan 11

#### 6.6 Dokumentasi akhir
- kemas kini README
- sediakan panduan pemasangan
- sediakan panduan konfigurasi fail audio

### Kriteria siap
- build production boleh dipasang,
- modul kritikal lulus ujian asas,
- aplikasi cukup stabil untuk ujian sebenar di peranti mini PC.

---

## Cadangan Susunan Milestone GitHub

### Milestone 1 — Foundation
- Fasa 0
- Fasa 1

### Milestone 2 — Prayer Data & Scheduler
- Fasa 2
- Fasa 3

### Milestone 3 — Playback Engine
- Fasa 4

### Milestone 4 — User Interface
- Fasa 5

### Milestone 5 — Stabilization & Release Candidate
- Fasa 6

---

## Senarai Tiket Minimum untuk MVP
Jika mahu versi paling minimum tetapi boleh diuji, fokus kepada tiket berikut:

1. Setup Electron + TypeScript
2. Setup SQLite + migration awal
3. Seed semua zon JAKIM
4. Simpan zon aktif dalam settings
5. Fetch dan simpan prayer time setahun untuk zon aktif
6. Bina scheduler azan minimum
7. Bina trigger log untuk elak duplicate playback
8. Main audio azan Subuh dan bukan Subuh
9. Bina halaman tetapan zon + audio azan
10. Packaging build Windows awal

Selepas itu, tambah:
11. Notifikasi awal
12. Idle audio folder playback
13. Halaman Tentang Pembangun
14. Logging dan hardening

---

## Kebergantungan Antara Fasa
- Fasa 1 bergantung pada Fasa 0
- Fasa 2 bergantung pada Fasa 1
- Fasa 3 bergantung pada Fasa 2
- Fasa 4 bergantung pada Fasa 3
- Fasa 5 boleh dimulakan sebahagiannya lebih awal, tetapi integrasi penuh bergantung pada Fasa 1 hingga 4
- Fasa 6 bergantung pada semua fasa utama siap

---

## Risiko yang Perlu Dipantau
- perubahan format respons API JAKIM,
- isu playback audio pada Windows,
- drift masa sistem,
- trigger berganda akibat restart aplikasi,
- fail MP3 dipadam selepas disimpan dalam settings,
- penggunaan CPU/memori jika scheduler atau player tidak diurus dengan baik.

---

## Cadangan Kaedah Kerja
Untuk pembangunan yang lebih terkawal:
- siapkan modul backend dahulu,
- pastikan scheduler dan audio stabil,
- kemudian bina UI tetapan,
- buat ujian sebenar pada mini PC seawal mungkin.

---

## Kesimpulan
Dokumen ini boleh terus digunakan untuk:
- buat backlog GitHub Issues,
- rancang milestone,
- bahagi kerja ikut fasa,
- atau dijadikan asas sprint pertama projek myAzan.

Pendekatan terbaik ialah mula dengan MVP yang memfokus pada **zon + cache data + scheduler azan + audio azan**, kemudian tambah notifikasi dan idle audio selepas asas sistem benar-benar stabil.
