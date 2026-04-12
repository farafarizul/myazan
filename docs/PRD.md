# Product Requirements Document (PRD)

## Projek
**myAzan**

## Ringkasan Produk
myAzan ialah aplikasi desktop berasaskan Electron.js untuk Windows 10 dan Windows 11 yang mengumandangkan azan secara automatik mengikut zon waktu solat JAKIM yang dipilih pengguna. Aplikasi ini juga menyokong notifikasi awal sebelum waktu tertentu, serta memainkan bacaan al-Quran atau zikir ketika sistem berada dalam keadaan idle.

Produk ini direka untuk berjalan secara stabil pada mini PC yang aktif 24 jam, dengan sokongan operasi **offline-first** selepas data waktu solat bagi zon dan tahun semasa dimuat turun dan disimpan secara lokal.

## Latar Belakang
Ramai pengguna memerlukan sistem azan automatik untuk premis, pejabat kecil, surau, kiosk, atau mini PC yang berjalan sepanjang masa. Penyelesaian yang diinginkan perlu:
- mudah dipasang pada Windows,
- stabil untuk penggunaan berterusan,
- menyokong audio azan dan notifikasi,
- boleh terus berfungsi walaupun internet tidak tersedia,
- dan membenarkan audio latar seperti al-Quran atau zikir dimainkan semasa idle.

## Objektif Produk
1. Membina aplikasi desktop Windows yang mudah digunakan dalam Bahasa Melayu.
2. Memainkan azan secara automatik apabila tiba waktu solat berdasarkan zon pilihan.
3. Membolehkan sistem terus berfungsi tanpa internet selepas data zon dan tahun dimuat turun.
4. Menyediakan notifikasi audio beberapa minit sebelum waktu tertentu.
5. Menyediakan audio idle untuk al-Quran atau zikir semasa tiada azan atau notifikasi dimainkan.
6. Menyediakan tetapan mudah untuk konfigurasi zon, audio, dan mod playback.

## Skop Versi Pertama (MVP)
Versi pertama perlu menyokong fungsi berikut:
- pemilihan zon JAKIM,
- muat turun data takwim solat tahunan berdasarkan zon,
- simpanan data lokal untuk penggunaan offline,
- pemantauan waktu semasa dan trigger azan,
- pemantauan notifikasi awal,
- pemilihan fail MP3 azan,
- pemilihan fail MP3 notifikasi untuk setiap waktu,
- pemilihan folder MP3 al-Quran/zikir,
- playback berterusan untuk audio idle,
- halaman tetapan,
- halaman Tentang Pembangun.

## Pengguna Sasaran
1. Pengguna individu yang mahu PC Windows mereka memainkan azan secara automatik.
2. Pemilik premis kecil yang menggunakan mini PC untuk operasi 24 jam.
3. Pengguna bukan teknikal yang memerlukan aplikasi ringkas dan stabil.

## Platform Sasaran
- Windows 10
- Windows 11
- Mini PC atau desktop yang berjalan 24 jam

## Bahasa Aplikasi
Semua paparan pengguna, mesej ralat, label, butang, dan teks sistem hendaklah dalam **Bahasa Melayu**.

## Keperluan Fungsian

### 1. Pengurusan Zon
- Pengguna boleh memilih zon JAKIM daripada senarai zon yang disediakan.
- Kod zon dan nama zon mesti disimpan dalam pangkalan data lokal.
- Apabila zon dipilih, sistem menyemak sama ada data zon untuk tahun semasa sudah tersedia secara lokal.
- Jika belum tersedia, sistem memuat turun data daripada API JAKIM dan menyimpannya.
- Data yang pernah dimuat turun mesti dikekalkan supaya pertukaran zon tidak memerlukan muat turun semula untuk tahun yang sama.

### 2. Penyegerakan Data Waktu Solat
- Sistem menggunakan API tahunan JAKIM:
  `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone={zon}`
- Data disimpan mengikut kombinasi zon dan tahun.
- Semasa aplikasi dilancarkan, sistem menyemak sama ada data tahun semasa tersedia.
- Apabila berlaku pertukaran tahun, sistem perlu menyemak dan memuat turun data tahun baharu jika perlu.

### 3. Audio Azan
- Sistem memantau waktu semasa berbanding jadual solat semasa.
- Apabila masuk waktu azan, audio azan akan dimainkan.
- Sistem perlu menyokong dua jenis fail azan:
  - Azan Subuh
  - Azan selain Subuh

### 4. Notifikasi Awal
- Pengguna boleh menetapkan notifikasi untuk dimainkan beberapa minit sebelum waktu tertentu.
- Pengguna boleh menetapkan fail MP3 berlainan bagi setiap waktu berikut:
  - Imsak
  - Subuh
  - Syuruk
  - Dhuha
  - Zuhur
  - Asar
  - Maghrib
  - Isyak
- Setiap notifikasi waktu boleh diaktifkan atau dinyahaktifkan secara berasingan.

### 5. Audio Idle al-Quran / Zikir
- Pengguna boleh memilih satu folder yang mengandungi fail MP3 al-Quran atau zikir.
- Audio dimainkan secara berterusan mengikut susunan nama fail.
- Setelah semua fail selesai dimainkan, sistem mengulangi playback dari fail pertama.
- Audio idle boleh diaktifkan atau dinyahaktifkan.
- Audio idle mesti berhenti sementara apabila notifikasi atau azan hendak dimainkan.

### 6. Halaman Tetapan
Halaman tetapan perlu membenarkan pengguna mengurus:
- zon aktif,
- fail audio azan,
- fail audio notifikasi,
- tempoh notifikasi awal,
- enable/disable notifikasi per waktu,
- folder audio idle,
- enable/disable audio idle.

### 7. Halaman Tentang Pembangun
Perlu memaparkan:
- Nama: Fara Farizul
- Email: farxpeace@gmail.com
- Telefon: +60137974467
- Ringkasan objektif projek
- Status perisian: Proprietary Software

## Keutamaan Audio
Sistem dicadangkan menggunakan 3 audio player berasingan:
1. Player azan
2. Player notifikasi
3. Player zikir / al-Quran

Susunan keutamaan:
- Azan: keutamaan tertinggi
- Notifikasi: keutamaan kedua
- Audio idle: keutamaan ketiga

Peraturan playback:
- Audio idle dimainkan hanya apabila tiada audio lain aktif.
- Apabila notifikasi bermula, audio idle mesti pause atau stop sementara.
- Apabila azan bermula, audio notifikasi atau idle mesti memberi laluan segera.
- Selepas notifikasi atau azan selesai, audio idle disambung semula.

## Keperluan Bukan Fungsian

### 1. Offline-first
- Sistem mesti terus berfungsi tanpa internet jika data zon dan tahun semasa sudah tersedia secara lokal.

### 2. Kebolehpercayaan
- Aplikasi mesti stabil untuk berjalan dalam tempoh lama.
- Sistem mesti mengelakkan trigger berganda untuk waktu yang sama pada hari yang sama.

### 3. Prestasi
- Aplikasi perlu ringan dan sesuai untuk mini PC.
- Operasi scheduler tidak boleh membebankan CPU secara berlebihan.

### 4. Keselamatan
- Ikut amalan keselamatan Electron.
- Pisahkan logik main process, preload, dan renderer.
- Jangan dedahkan akses Node.js secara bebas kepada renderer.

### 5. Kebolehgunaan
- Tetapan mesti mudah difahami oleh pengguna bukan teknikal.
- Semua mesej perlu dalam Bahasa Melayu yang jelas.

## Andaian Produk
- Mini PC atau desktop sentiasa mempunyai speaker atau output audio.
- Pengguna akan menyediakan fail MP3 mereka sendiri untuk azan, notifikasi, dan zikir.
- Sambungan internet hanya diperlukan untuk muat turun data zon/tahun yang belum tersedia.

## Di Luar Skop Versi Pertama
- Sokongan macOS atau Linux
- Sinkronisasi awan
- Akaun pengguna berbilang profil
- Auto-update aplikasi
- Streaming audio dalam talian
- Sokongan bahasa selain Bahasa Melayu

## Kriteria Penerimaan
1. Aplikasi boleh berjalan pada Windows 10 dan 11.
2. Pengguna boleh memilih zon JAKIM.
3. Data zon dan tahun dimuat turun dan disimpan secara lokal.
4. Azan dimainkan tepat pada waktu mengikut zon.
5. Notifikasi dimainkan berdasarkan tetapan minit awal.
6. Pengguna boleh menetapkan audio notifikasi berbeza untuk setiap waktu.
7. Audio idle dimainkan berterusan ketika sistem idle.
8. Audio idle berhenti sementara apabila azan atau notifikasi dimainkan.
9. Sistem kekal berfungsi tanpa internet selepas data tersedia.
10. Tetapan kekal disimpan selepas aplikasi ditutup dan dibuka semula.

## Risiko dan Perhatian
- Format atau struktur respons API JAKIM mungkin berubah.
- Fail audio yang dipilih pengguna mungkin dipadam atau dipindahkan selepas disimpan dalam tetapan.
- Jam sistem Windows yang tidak tepat boleh menyebabkan trigger audio tidak selari.
- Audio playback perlu diuji dengan teliti untuk mengelakkan pertindihan atau konflik antara player.

## Ringkasan Keputusan Produk
myAzan perlu dibina sebagai aplikasi desktop yang ringan, modular, stabil, dan offline-first. Fokus utama versi pertama ialah ketepatan trigger waktu, kestabilan playback audio, dan kemudahan konfigurasi pengguna.
