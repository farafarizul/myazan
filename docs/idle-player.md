# Audio Idle & Jadual Senyap

Halaman **Zikir & Audio Idle** menggunakan satu folder playlist MP3 sedia ada untuk al-Quran, zikir dan lagu. Tiada muat naik atau perkhidmatan penstriman diperlukan.

## Cara menggunakan

1. Pilih folder MP3 dan hidupkan **Aktifkan Audio Idle**.
2. Jika perlu, hidupkan **Jadual Senyap Harian** dan pilih waktu senyap serta mula semula. Contoh: 22:00 dan 05:30.
3. Klik **Simpan Tetapan Zikir**. Pengesahan atau ralat dipaparkan pada halaman yang sama.
4. Gunakan **Play**, **Pause**, **Next** dan **Previous**. Posisi trek dipelihara untuk Pause/Play; Next/Previous berulang di hujung playlist dan tidak membatalkan Pause.

Senarai UI dan enjin menggunakan `readIdlePlaylist`: hanya fail MP3 terus dalam folder, disusun mengikut nama dengan nombor secara semula jadi (2 sebelum 10). Selepas menambah atau membuang fail dalam folder yang sama, simpan tetapan untuk menyegarkan senarai; trek yang masih wujud tidak dimulakan semula.

## Peraturan playback

| Keadaan | Tingkah laku |
|---|---|
| Audio Idle dimatikan | Tidak bermain, termasuk pada waktu mula harian |
| Pause manual | Kekal dijeda sehingga Play atau waktu mula harian berikutnya |
| Dalam waktu senyap | Jeda audio dan simpan posisi; Play/Next/Previous disekat |
| Waktu mula tiba | Lepaskan Pause manual dan sambung posisi jika tiada audio solat aktif |
| Azan atau notifikasi aktif | Beri laluan; azan mengatasi notifikasi |
| Audio solat selesai ketika dijeda / senyap | Kekal senyap; jangan mulakan semula playlist |
| Audio solat selesai ketika playback dibenarkan | Gunakan mod sambung gangguan sedia ada; jika dijeda manual/jadual, kekalkan posisi |
| Simpan tetapan lain atau volume | Posisi dan Pause dikekalkan; volume audio idle dikemas kini tanpa memuat semula trek |
| Tukar folder atau togol Audio Idle dan simpan | Hentikan trek lama, muat playlist dan nilai semula jadual |
| Folder kosong / tidak boleh dibaca | Papar Playlist Kosong; Play mencuba membaca folder semula |
| Fail hilang / semua fail rosak | Percubaan dihadkan kepada satu pusingan; berhenti dengan mesej ralat, Play untuk cuba semula |

Jadual dimatikan secara lalai. Kedua-dua waktu menggunakan HH:mm, mestilah sah dan berbeza. Ia berulang setiap hari mengikut waktu tempatan PC; tiada pelarasan relatif kepada waktu Subuh. Waktu senyap termasuk minit mula, manakala waktu mula semula tidak termasuk dalam tempoh senyap.

Main process menyemak jadual setiap saat dan ketika `powerMonitor.resume`. Semakan mengesan waktu mula yang terlepas walaupun PC digantung lebih sehari. Menutup tetingkap ke tray tidak menghentikan jadual. App mesti berjalan dan PC hidup; ciri ini tidak menidurkan atau membangunkan PC. Jika app ditutup sepenuhnya, trek/posisi dan Pause manual tidak dipersistkan; sesi baharu bermula dari trek pertama pada waktu yang dibenarkan.

## Penyimpanan dan komunikasi

- Migration `007_add_idle_schedule.sql` menambah `idle_schedule_enabled`, `idle_sleep_time`, `idle_wake_time` pada singleton `audio_settings`, tanpa mengubah tetapan audio sedia ada.
- `saveSettings` mengesahkan jadual lengkap atau separa sebelum sebarang penulisan. UI menggunakan simpan khusus Zikir supaya medan tetapan lain tidak ditulis semula.
- IPC `control-idle` menerima hanya `play`, `pause`, `next`, `previous`. Enjin memeriksa pengaktifan, jadual dan keutamaan walaupun arahan dipanggil tanpa UI.
- `get-playback-status` melaporkan `idleState`, `idleTrack`, `idleTrackCount`, `idleFolderPath` dan `idleError`; UI tidak lagi menganggap tetapan "aktif" bermaksud audio sedang dimainkan.
- Audio tersembunyi menerima kelantangan tanpa reset trek; pembatalan `play()` akibat Pause/Next/Previous tidak dikira sebagai fail rosak.

## Pengesahan

- `npm test`: ujian jadual, sempadan masa, gangguan audio solat, Pause, pertukaran trek, fail rosak/hilang, pengesahan payload dan migrasi menggunakan SQLite dalam memori.
- `npm run test:electron`: UI sebenar, preload, IPC, database sementara dan elemen audio Chromium. Memeriksa penyimpanan Zikir, perubahan `currentTime`, waktu senyap/mula semula, restart serta lebar tetingkap 720px. Output visual di `dist-build/qa/`.
- `npm run typecheck`, `npm run lint`, `npm run compile`.

Masa dijalankan secara simulasi dalam ujian; ujian Electron memute output audio. Ujian ini tidak membuktikan bunyi speaker fizikal atau penggunaan semalaman pada PC pengguna.
