# myAzan

Aplikasi desktop **Electron.js** untuk **Windows 10/11** yang memainkan azan secara automatik mengikut zon waktu solat JAKIM, menyokong notifikasi awal, serta memainkan bacaan al-Quran atau zikir ketika sistem berada dalam keadaan idle.

## Objektif
myAzan dibangunkan untuk kegunaan desktop atau mini PC yang berjalan 24 jam, dengan fokus kepada:
- azan automatik mengikut zon pilihan,
- notifikasi audio sebelum masuk waktu tertentu,
- mod **offline-first** selepas data waktu solat dimuat turun,
- audio idle untuk al-Quran atau zikir,
- paparan aplikasi dalam **Bahasa Melayu**.

## Ciri Utama
- Sokongan untuk **Windows 10 dan Windows 11**
- Dibina menggunakan **Electron.js**
- UI dalam **Bahasa Melayu**
- Data waktu solat tahunan daripada **API JAKIM e-Solat**
- Simpanan data secara lokal menggunakan **SQLite**
- Boleh berfungsi **tanpa internet** selepas data dimuat turun
- Sokongan 3 jenis audio berasingan:
  - **Azan**
  - **Notifikasi**
  - **Audio idle** (al-Quran / zikir)
- Tetapan audio berbeza untuk:
  - Azan Subuh
  - Azan selain Subuh
  - Notifikasi setiap waktu berkaitan
- Folder MP3 al-Quran / zikir dimainkan berterusan mengikut nama fail
- Halaman **Tentang Pembangun**

## Sumber Data Waktu Solat
Aplikasi menggunakan API tahunan JAKIM:

```text
https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone={zone}
```

Contoh kod zon:
- `JHR01`
- `KDH06`
- `KTN01`
- `WLY01`

## Keperluan Fungsi

### 1. Pengurusan Zon
- Pengguna boleh memilih zon JAKIM dalam halaman tetapan.
- Kod zon dan nama zon disimpan dalam SQLite.
- Jika data zon + tahun semasa belum wujud secara lokal, sistem perlu muat turun dan simpan.
- Jika data sudah ada, sistem mesti guna cache sedia ada tanpa muat turun semula.

### 2. Azan Automatik
- Sistem memantau waktu solat berdasarkan zon aktif.
- Apabila masuk waktu azan, sistem memainkan fail MP3 yang ditetapkan.
- Perlu ada dua tetapan audio azan:
  - Azan Subuh
  - Azan selain Subuh

### 3. Notifikasi Sebelum Waktu
- Pengguna boleh tetapkan notifikasi awal beberapa minit sebelum waktu tertentu.
- Setiap waktu boleh mempunyai MP3 berbeza.
- Setiap waktu boleh diaktifkan atau dinyahaktifkan secara berasingan.
- Waktu yang disokong:
  - Imsak
  - Subuh
  - Syuruk
  - Dhuha
  - Zohor
  - Asar
  - Maghrib
  - Isyak

### 4. Audio Idle: al-Quran / Zikir
- Pengguna boleh memilih folder yang mengandungi fail MP3.
- Fail dimainkan mengikut susunan nama fail.
- Selepas fail terakhir, main semula dari awal.
- Audio idle berhenti sementara apabila notifikasi atau azan dimainkan.
- Audio idle sambung semula selepas audio berkeutamaan lebih tinggi selesai.

## Keutamaan Audio
Aplikasi menggunakan 3 audio player berasingan:
1. **Azan player**
2. **Notification player**
3. **Idle player**

Turutan keutamaan:
1. **Azan**
2. **Notifikasi**
3. **Idle audio**

Peraturan asas:
- Audio idle berjalan semasa aplikasi tidak memainkan audio lain.
- Notifikasi menghentikan atau menjeda audio idle.
- Azan mengambil keutamaan tertinggi dan perlu override audio lain.
- Event yang sama tidak boleh dicetuskan berulang kali pada hari yang sama.

## Persediaan & Pemasangan

### Keperluan Sistem (Windows)

Sebelum menjalankan `npm install`, pastikan perkara berikut telah dipasang:

1. **Node.js** — muat turun dari [nodejs.org](https://nodejs.org) (cadangan: LTS terbaru)
2. **Python 3.x** — diperlukan oleh `better-sqlite3` untuk kompilasi modul natif
3. **Visual Studio Build Tools** dengan komponen **"Desktop development with C++"**
   - Muat turun dari [visualstudio.microsoft.com/visual-cpp-build-tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Atau jalankan: `npm install --global --production windows-build-tools` (sebagai Administrator)

### Langkah Pemasangan

```bash
# 1. Clone repositori
git clone <url-repositori>
cd myazan

# 2. Pasang semua kebergantungan
#    (postinstall akan membina semula better-sqlite3 untuk Electron secara automatik)
npm install

# 3. Jalankan aplikasi dalam mod pembangunan
npm start
```

> **Nota:** `npm install` akan memuat turun binari Electron (~150 MB) dan membina `better-sqlite3` terhadap versi Node.js Electron. Proses ini mungkin mengambil masa beberapa minit bergantung kepada kelajuan internet dan spesifikasi komputer. Ini adalah normal dan bukan ralat.

### Membina Pemasang Windows

```bash
npm run build
```

Pemasang NSIS dan fail EXE mudah alih akan dihasilkan dalam folder `dist-build/`.

---

## Cadangan Struktur Projek

```text
src/
  main/
    bootstrap/
    database/
    services/
      prayer-time/
      audio/
      scheduler/
      settings/
      zones/
    ipc/
  preload/
  renderer/
    pages/
    components/
    store/
  shared/
```

## Modul Utama
- **bootstrap** — inisialisasi aplikasi semasa startup
- **database** — capaian SQLite dan migrasi
- **prayer-time-sync** — muat turun, validasi, dan simpan data API JAKIM
- **scheduler** — logik semakan waktu dan trigger event
- **audio-engine** — pengurusan semua playback audio
- **settings** — baca/simpan konfigurasi pengguna
- **zones** — urus senarai zon dan zon aktif
- **about-page** — maklumat pembangun dan projek

## Cadangan Teknologi
- **Electron.js**
- **TypeScript**
- **SQLite**
- State management ringkas untuk renderer
- IPC yang selamat melalui `preload`

## Prinsip Reka Bentuk
- **Offline-first** selepas data tersedia
- **Modular** dan mudah disenggara
- **Deterministic scheduler** untuk elak trigger berganda
- **UI ringkas** untuk pengguna bukan teknikal
- **Electron security best practices**

## Peraturan Pembangunan
- Guna **TypeScript** sebanyak mungkin
- Jangan campurkan logik UI dengan logik database atau scheduler
- Jangan hardcode waktu solat
- Simpan **path fail/folder** sahaja, bukan kandungan MP3 dalam database
- Validasi respon API sebelum simpan
- Validasi laluan fail sebelum playback
- Tangani kegagalan internet dengan baik

## Status Lesen
Perisian ini adalah **Proprietary Software**.

Cadangan ringkas lesen:
- Kod sumber adalah sulit dan tidak dibenarkan untuk diedarkan atau diubah suai tanpa kebenaran pemilik.
- Aplikasi dalam bentuk binari boleh digunakan secara percuma tertakluk kepada syarat pemilik.

## Tentang Pembangun
- **Nama:** Fara Farizul
- **Email:** farxpeace@gmail.com
- **Telefon:** +60137974467

## Nota
Repository ini sesuai dijadikan asas pembangunan berperingkat, contohnya:
1. setup Electron + TypeScript + SQLite,
2. bina schema database,
3. integrasi API JAKIM,
4. bina scheduler,
5. bina audio engine,
6. bina settings UI,
7. bina halaman Tentang Pembangun.
