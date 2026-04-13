import type { AppInfo, AppSettings, Zone, NotificationSetting, SaveSettingsPayload } from '../shared/types';

declare global {
  interface Window {
    myAzan: {
      getAppInfo: () => Promise<AppInfo>;
      getZones: () => Promise<Zone[]>;
      getSettings: () => Promise<AppSettings>;
      saveSettings: (payload: SaveSettingsPayload) => Promise<{ ok: boolean; error?: string }>;
      setActiveZone: (zoneCode: string) => Promise<{ ok: boolean }>;
      selectAudioFile: () => Promise<string | null>;
      selectAudioFolder: () => Promise<string | null>;
      syncPrayerTimes: (payload: { zoneCode: string; year?: number }) => Promise<{ ok: boolean; error?: string }>;
      getPrayerTimesForDate: (zoneCode: string, date: string) => Promise<import('../shared/types').PrayerTimeForDate | null>;
    };
  }
}

/** Navigasi halaman ringkas menggunakan data atribut. */
function initNavigation(): void {
  const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
  const pages = document.querySelectorAll<HTMLElement>('.page');

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPage = btn.dataset['page'];

      navBtns.forEach((b) => b.classList.remove('active'));
      pages.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');

      const pageEl = document.getElementById(`page-${targetPage}`);
      pageEl?.classList.add('active');
    });
  });
}

/** Muatkan maklumat pembangun pada halaman Tentang. */
async function loadAboutPage(): Promise<void> {
  const container = document.getElementById('tentang-info');
  if (!container) return;

  try {
    const info = await window.myAzan.getAppInfo();
    const tahunHakCipta = new Date().getFullYear();

    container.innerHTML = `
      <div class="tentang-grid">

        <!-- Kad Pembangun -->
        <div class="tentang-kad tentang-kad-pembangun">
          <div class="tentang-avatar" aria-hidden="true">🧑‍💻</div>
          <div class="tentang-pembangun-butiran">
            <h3 class="tentang-nama">${info.author}</h3>
            <p class="tentang-jawatan">Pembangun Utama</p>
            <div class="tentang-kenalan">
              <div class="tentang-kenalan-baris">
                <span class="tentang-ikon" aria-hidden="true">✉️</span>
                <div>
                  <p class="tentang-kenalan-label">Emel</p>
                  <a class="tentang-kenalan-nilai" href="mailto:${info.email}">${info.email}</a>
                </div>
              </div>
              <div class="tentang-kenalan-baris">
                <span class="tentang-ikon" aria-hidden="true">📞</span>
                <div>
                  <p class="tentang-kenalan-label">Telefon</p>
                  <p class="tentang-kenalan-nilai">${info.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Kad Maklumat Perisian -->
        <div class="tentang-kad tentang-kad-perisian">
          <p class="tentang-seksyen-label">Maklumat Perisian</p>
          <div class="tentang-perisian-senarai">
            <div class="tentang-perisian-baris">
              <span class="tentang-perisian-kunci">Aplikasi</span>
              <span class="tentang-perisian-nilai">${info.name}</span>
            </div>
            <div class="tentang-perisian-baris">
              <span class="tentang-perisian-kunci">Versi</span>
              <span class="tentang-versi-teg">${info.version}</span>
            </div>
            <div class="tentang-perisian-baris">
              <span class="tentang-perisian-kunci">Status Lesen</span>
              <span class="tentang-perisian-nilai tentang-lesen-teg">Proprietari</span>
            </div>
          </div>
        </div>

        <!-- Seksyen Objektif -->
        <div class="tentang-kad tentang-kad-objektif">
          <p class="tentang-seksyen-label">Objektif Projek</p>
          <p class="tentang-objektif-teks">${info.objective}</p>
        </div>

        <!-- Notis Lesen -->
        <div class="tentang-lesen-notis">
          <span aria-hidden="true">⚠️</span>
          <p>${info.license}</p>
        </div>

        <!-- Footer Hak Cipta -->
        <div class="tentang-footer">
          <p>Hak Cipta Terpelihara &copy; ${tahunHakCipta} ${info.author}</p>
          <p>Direka dengan penuh ketelitian di Malaysia.</p>
        </div>

      </div>
    `;
  } catch (err) {
    console.error('[tentang] gagal muatkan maklumat:', err);
    container.innerHTML = '<p class="info-teks">Gagal memuatkan maklumat.</p>';
  }
}

/** Kembalikan tarikh hari ini dalam format YYYY-MM-DD (waktu tempatan). */
function tarikhHariIni(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Kembalikan waktu sekarang dalam format HH:MM (waktu tempatan). */
function masaSekarang(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Tukar masa 'HH:MM' atau 'HH:MM:SS' kepada minit sejak tengah malam. */
function masaKeMinit(masa: string): number {
  const [jam, minit] = masa.split(':').map(Number);
  return (jam ?? 0) * 60 + (minit ?? 0);
}

/**
 * Muatkan dan paparkan waktu solat hari ini pada halaman utama.
 * Jika tiada data tempatan, cuba sync terlebih dahulu.
 */
async function loadHalamanUtama(): Promise<void> {
  const list = document.getElementById('waktu-solat-list');
  if (!list) return;

  list.innerHTML = '<p class="info-teks">Memuat waktu solat...</p>';

  let settings: AppSettings;
  try {
    settings = await window.myAzan.getSettings();
  } catch {
    list.innerHTML = '<p class="info-teks">Gagal mendapatkan tetapan.</p>';
    return;
  }

  const zoneCode = settings.activeZoneCode;
  if (!zoneCode) {
    list.innerHTML = `
      <p class="info-teks">
        Sila pilih zon waktu solat anda di halaman <strong>Tetapan</strong>.
      </p>
    `;
    return;
  }

  const tarikh = tarikhHariIni();
  let data = await window.myAzan.getPrayerTimesForDate(zoneCode, tarikh);

  // Jika tiada data, cuba sync dulu kemudian ambil semula
  if (!data) {
    list.innerHTML = '<p class="info-teks">Memuat turun data waktu solat...</p>';
    try {
      const syncResult = await window.myAzan.syncPrayerTimes({ zoneCode });
      if (!syncResult.ok) {
        list.innerHTML = `<p class="info-teks">Gagal memuat turun data: ${syncResult.error ?? 'Ralat tidak diketahui'}. Sila semak sambungan internet.</p>`;
        return;
      }
      data = await window.myAzan.getPrayerTimesForDate(zoneCode, tarikh);
    } catch {
      list.innerHTML = '<p class="info-teks">Gagal memuat turun data waktu solat. Sila semak sambungan internet.</p>';
      return;
    }
  }

  if (!data) {
    list.innerHTML = '<p class="info-teks">Tiada data waktu solat untuk hari ini.</p>';
    return;
  }

  // Tentukan waktu solat berikutnya untuk ditonjolkan
  const sekarangMinit = masaKeMinit(masaSekarang());
  const waktuBerurutan: Array<[string, string | null]> = [
    ['imsak', data.imsak],
    ['fajr', data.fajr],
    ['syuruk', data.syuruk],
    ['dhuha', data.dhuha],
    ['dhuhr', data.dhuhr],
    ['asr', data.asr],
    ['maghrib', data.maghrib],
    ['isha', data.isha],
  ];

  // Cari waktu pertama yang belum berlalu
  let indexBerikutnya = -1;
  for (let i = 0; i < waktuBerurutan.length; i++) {
    const masa = waktuBerurutan[i]?.[1];
    if (masa && masaKeMinit(masa) > sekarangMinit) {
      indexBerikutnya = i;
      break;
    }
  }

  // Bina HTML grid
  const items = waktuBerurutan
    .map(([event, masa], i) => {
      if (!masa) return '';
      const nama = NAMA_WAKTU[event] ?? event;
      const aktifKelas = i === indexBerikutnya ? ' berikutnya' : '';
      return `
        <div class="waktu-item${aktifKelas}">
          <div class="waktu-label">${nama}</div>
          <div class="waktu-masa">${masa.substring(0, 5)}</div>
        </div>
      `;
    })
    .join('');

  list.innerHTML = items || '<p class="info-teks">Tiada data waktu untuk dipaparkan.</p>';
}

// ============================================================
// Nama waktu solat dalam Bahasa Melayu
// ============================================================

const NAMA_WAKTU: Record<string, string> = {
  imsak: 'Imsak',
  fajr: 'Subuh',
  syuruk: 'Syuruk',
  dhuha: 'Dhuha',
  dhuhr: 'Zohor',
  asr: 'Asar',
  maghrib: 'Maghrib',
  isha: 'Isyak',
};

// ============================================================
// State halaman Tetapan (disimpan dalam memori semasa sesi)
// ============================================================

interface TetapanState {
  zones: Zone[];
  settings: AppSettings | null;
  /** Laluan fail yang sedang dipilih (sebelum disimpan). */
  azanSubuhFilePath: string | null;
  azanOtherFilePath: string | null;
  idleFolderPath: string | null;
  /** Kelantangan setiap player (0–100). */
  azanVolume: number;
  notificationVolume: number;
  idleVolume: number;
  /** Tetapan notifikasi semasa (boleh diubah di UI sebelum disimpan). */
  notificationSettings: NotificationSetting[];
}

const tetapanState: TetapanState = {
  zones: [],
  settings: null,
  azanSubuhFilePath: null,
  azanOtherFilePath: null,
  idleFolderPath: null,
  azanVolume: 100,
  notificationVolume: 100,
  idleVolume: 100,
  notificationSettings: [],
};

// ============================================================
// Pembantu UI
// ============================================================

/** Paparkan mesej status pada bahagian atas halaman Tetapan. */
function tunjukStatusTetapan(mesej: string, jenis: 'berjaya' | 'ralat'): void {
  const el = document.getElementById('tetapan-status');
  if (!el) return;
  el.textContent = mesej;
  el.className = `tetapan-status ${jenis}`;
  el.hidden = false;
  // Sembunyikan mesej selepas 5 saat
  setTimeout(() => {
    el.hidden = true;
  }, 5000);
}

/** Ikat gelangsar volume kepada nilai teks dan kemas kini state. */
function initGelansarVolume(
  sliderId: string,
  nilaiId: string,
  stateKey: 'azanVolume' | 'notificationVolume' | 'idleVolume',
): void {
  const slider = document.getElementById(sliderId) as HTMLInputElement | null;
  const nilaiEl = document.getElementById(nilaiId);
  if (!slider || !nilaiEl) return;

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value, 10);
    nilaiEl.textContent = `${v}%`;
    tetapanState[stateKey] = v;
  });
}


function namaFail(laluan: string | null): string {
  if (!laluan) return 'Tiada fail dipilih';
  const bahagian = laluan.replace(/\\/g, '/').split('/');
  return bahagian[bahagian.length - 1] ?? laluan;
}

/** Potong laluan folder panjang untuk paparan. */
function namaFolder(laluan: string | null): string {
  if (!laluan) return 'Tiada folder dipilih';
  const bahagian = laluan.replace(/\\/g, '/').split('/');
  return bahagian[bahagian.length - 1] ?? laluan;
}

// ============================================================
// Zon: isi dropdown negeri & zon
// ============================================================

/** Isi dropdown Negeri berdasarkan senarai zon. */
function isiDropdownNegeri(zones: Zone[], selectedZoneCode: string | null): void {
  const selectNegeri = document.getElementById('pilih-negeri') as HTMLSelectElement | null;
  if (!selectNegeri) return;

  // Dapatkan senarai negeri unik mengikut susunan
  const negeriUnik = [...new Set(zones.map((z) => z.stateName))];

  selectNegeri.innerHTML = '<option value="">-- Pilih Negeri --</option>';
  negeriUnik.forEach((negeri) => {
    const opt = document.createElement('option');
    opt.value = negeri;
    opt.textContent = negeri;
    selectNegeri.appendChild(opt);
  });

  // Pilih negeri aktif jika ada
  if (selectedZoneCode) {
    const zonAktif = zones.find((z) => z.code === selectedZoneCode);
    if (zonAktif) {
      selectNegeri.value = zonAktif.stateName;
      isiDropdownZon(zones, zonAktif.stateName, selectedZoneCode);
    }
  }
}

/** Isi dropdown Zon berdasarkan negeri yang dipilih. */
function isiDropdownZon(zones: Zone[], negeri: string, selectedCode: string | null): void {
  const selectZon = document.getElementById('pilih-zon') as HTMLSelectElement | null;
  if (!selectZon) return;

  const zonBagi = zones.filter((z) => z.stateName === negeri);
  selectZon.innerHTML = '<option value="">-- Pilih Zon --</option>';
  zonBagi.forEach((z) => {
    const opt = document.createElement('option');
    opt.value = z.code;
    opt.textContent = `${z.code} — ${z.zoneName}`;
    selectZon.appendChild(opt);
  });

  if (selectedCode) {
    selectZon.value = selectedCode;
  }
}

// ============================================================
// Notifikasi: bina baris untuk setiap waktu
// ============================================================

/** Bina baris notifikasi untuk setiap waktu solat. */
function binaSenaraiNotifikasi(notificationSettings: NotificationSetting[]): void {
  const bekas = document.getElementById('notifikasi-senarai');
  if (!bekas) return;

  bekas.innerHTML = '';

  const susunanWaktu = ['imsak', 'fajr', 'syuruk', 'dhuha', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const eventName of susunanWaktu) {
    const ns = notificationSettings.find((n) => n.eventName === eventName);
    if (!ns) continue;

    const baris = document.createElement('div');
    baris.className = 'notifikasi-baris';
    baris.dataset['event'] = eventName;

    const namaWaktu = NAMA_WAKTU[eventName] ?? eventName;
    const failNama = namaFail(ns.audioFilePath);
    const minit = ns.minutesBefore ?? 0;
    const aktif = ns.enabled;

    baris.innerHTML = `
      <span class="notifikasi-waktu">${namaWaktu}</span>
      <label class="tetapan-togol togol-kecil" title="Aktif / Tidak Aktif">
        <input type="checkbox" class="notifikasi-togol" data-event="${eventName}" ${aktif ? 'checked' : ''} />
        <span class="togol-gelangsar"></span>
      </label>
      <div style="display:flex;align-items:center;gap:6px;">
        <input
          type="number"
          class="notifikasi-minit-input"
          data-event="${eventName}"
          value="${minit}"
          min="0"
          max="60"
          title="Minit sebelum waktu"
        />
        <span class="notifikasi-minit-label">min awal</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
        <span class="notifikasi-fail-nama" id="notif-fail-${eventName}" title="${ns.audioFilePath ?? ''}">${failNama}</span>
        <button class="notifikasi-btn-audio" data-event="${eventName}" type="button">🎵 Fail</button>
      </div>
      <button class="notifikasi-btn-padam" data-event="${eventName}" type="button" title="Padam fail audio">✕</button>
    `;

    bekas.appendChild(baris);
  }

  // Lekatkan pendengar acara untuk butang pilih fail notifikasi
  bekas.querySelectorAll<HTMLButtonElement>('.notifikasi-btn-audio').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ev = btn.dataset['event'] ?? '';
      const laluan = await window.myAzan.selectAudioFile();
      if (laluan === null) return;
      const ns2 = tetapanState.notificationSettings.find((n) => n.eventName === ev);
      if (ns2) ns2.audioFilePath = laluan;
      const spanFail = document.getElementById(`notif-fail-${ev}`);
      if (spanFail) {
        spanFail.textContent = namaFail(laluan);
        spanFail.title = laluan;
      }
    });
  });

  // Butang padam fail audio notifikasi
  bekas.querySelectorAll<HTMLButtonElement>('.notifikasi-btn-padam').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ev = btn.dataset['event'] ?? '';
      const ns2 = tetapanState.notificationSettings.find((n) => n.eventName === ev);
      if (ns2) ns2.audioFilePath = null;
      const spanFail = document.getElementById(`notif-fail-${ev}`);
      if (spanFail) {
        spanFail.textContent = 'Tiada fail dipilih';
        spanFail.title = '';
      }
    });
  });
}

// ============================================================
// Muatkan & paparkan tetapan semasa
// ============================================================

async function muatTetapan(): Promise<void> {
  try {
    const [zones, settings] = await Promise.all([
      window.myAzan.getZones(),
      window.myAzan.getSettings(),
    ]);

    tetapanState.zones = zones;
    tetapanState.settings = settings;
    tetapanState.azanSubuhFilePath = settings.azanSubuhFilePath;
    tetapanState.azanOtherFilePath = settings.azanOtherFilePath;
    tetapanState.idleFolderPath = settings.idleFolderPath;
    tetapanState.azanVolume = settings.azanVolume ?? 100;
    tetapanState.notificationVolume = settings.notificationVolume ?? 100;
    tetapanState.idleVolume = settings.idleVolume ?? 100;
    // Salin notifikasi supaya boleh diubah tanpa terus mengubah tetapan asal
    tetapanState.notificationSettings = settings.notificationSettings.map((n) => ({ ...n }));

    // Isi dropdown zon
    isiDropdownNegeri(zones, settings.activeZoneCode);

    // Paparkan laluan fail audio
    const spanSubuh = document.getElementById('azan-subuh-nama');
    if (spanSubuh) spanSubuh.textContent = namaFail(settings.azanSubuhFilePath);

    const spanLain = document.getElementById('azan-lain-nama');
    if (spanLain) spanLain.textContent = namaFail(settings.azanOtherFilePath);

    const spanFolder = document.getElementById('idle-folder-nama');
    if (spanFolder) spanFolder.textContent = namaFolder(settings.idleFolderPath);

    // Togol idle
    const togolIdle = document.getElementById('idle-aktif') as HTMLInputElement | null;
    if (togolIdle) togolIdle.checked = settings.idleEnabled;

    // Gelangsar volume
    const setSlider = (id: string, nilaiId: string, val: number) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      const nilaiEl = document.getElementById(nilaiId);
      if (el) el.value = String(val);
      if (nilaiEl) nilaiEl.textContent = `${val}%`;
    };
    setSlider('azan-volume', 'azan-volume-nilai', tetapanState.azanVolume);
    setSlider('notifikasi-volume', 'notifikasi-volume-nilai', tetapanState.notificationVolume);
    setSlider('idle-volume', 'idle-volume-nilai', tetapanState.idleVolume);

    // Bina senarai notifikasi
    binaSenaraiNotifikasi(tetapanState.notificationSettings);
  } catch (err) {
    console.error('[tetapan] gagal muatkan tetapan:', err);
    tunjukStatusTetapan('Gagal memuatkan tetapan. Sila cuba semula.', 'ralat');
  }
}

// ============================================================
// Simpan tetapan
// ============================================================

async function simpanTetapan(): Promise<void> {
  const selectZon = document.getElementById('pilih-zon') as HTMLSelectElement | null;
  const togolIdle = document.getElementById('idle-aktif') as HTMLInputElement | null;

  const selectedZoneCode = selectZon?.value || null;

  // Kumpulkan tetapan notifikasi dari UI
  const notifSenarai = document.querySelectorAll<HTMLElement>('.notifikasi-baris');
  const notificationSettings: NotificationSetting[] = [];

  notifSenarai.forEach((baris) => {
    const ev = baris.dataset['event'] ?? '';
    const togolEl = baris.querySelector<HTMLInputElement>('.notifikasi-togol');
    const mInitEl = baris.querySelector<HTMLInputElement>('.notifikasi-minit-input');
    const nsState = tetapanState.notificationSettings.find((n) => n.eventName === ev);

    notificationSettings.push({
      eventName: ev,
      enabled: togolEl?.checked ?? false,
      minutesBefore: parseInt(mInitEl?.value ?? '0', 10) || 0,
      audioFilePath: nsState?.audioFilePath ?? null,
      volume: nsState?.volume ?? null,
    });
  });

  const payload: SaveSettingsPayload = {
    activeZoneCode: selectedZoneCode,
    azanSubuhFilePath: tetapanState.azanSubuhFilePath,
    azanOtherFilePath: tetapanState.azanOtherFilePath,
    idleFolderPath: tetapanState.idleFolderPath,
    idleEnabled: togolIdle?.checked ?? false,
    azanVolume: tetapanState.azanVolume,
    notificationVolume: tetapanState.notificationVolume,
    idleVolume: tetapanState.idleVolume,
    notificationSettings,
  };

  try {
    const hasil = await window.myAzan.saveSettings(payload);
    if (hasil.ok) {
      tunjukStatusTetapan('✅ Tetapan berjaya disimpan.', 'berjaya');
      // Kemas kini state selepas simpan
      tetapanState.settings = {
        ...(tetapanState.settings ?? {
          activeZoneCode: null,
          azanSubuhFilePath: null,
          azanOtherFilePath: null,
          idleFolderPath: null,
          idleEnabled: false,
          notificationSettings: [],
        }),
        ...payload,
        notificationSettings,
      };
      // Muat semula waktu solat pada halaman utama dengan zon baharu
      loadHalamanUtama().catch((err) => {
        console.error('[utama] gagal muat semula waktu solat:', err);
      });
    } else {
      tunjukStatusTetapan(`❌ Gagal simpan: ${hasil.error ?? 'Ralat tidak diketahui'}`, 'ralat');
    }
  } catch (err) {
    console.error('[tetapan] ralat semasa simpan:', err);
    tunjukStatusTetapan('❌ Ralat semasa menyimpan tetapan. Sila cuba semula.', 'ralat');
  }
}

// ============================================================
// Inisialisasi halaman Tetapan
// ============================================================

async function initHalamanTetapan(): Promise<void> {
  // Dropdown negeri → kemas kini dropdown zon
  const selectNegeri = document.getElementById('pilih-negeri') as HTMLSelectElement | null;
  selectNegeri?.addEventListener('change', () => {
    const negeri = selectNegeri.value;
    isiDropdownZon(tetapanState.zones, negeri, null);
  });

  // Pilih fail azan Subuh
  document.getElementById('btn-azan-subuh')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFile();
    if (laluan === null) return;
    tetapanState.azanSubuhFilePath = laluan;
    const span = document.getElementById('azan-subuh-nama');
    if (span) span.textContent = namaFail(laluan);
  });

  // Padam fail azan Subuh
  document.getElementById('btn-azan-subuh-padam')?.addEventListener('click', () => {
    tetapanState.azanSubuhFilePath = null;
    const span = document.getElementById('azan-subuh-nama');
    if (span) span.textContent = 'Tiada fail dipilih';
  });

  // Pilih fail azan lain
  document.getElementById('btn-azan-lain')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFile();
    if (laluan === null) return;
    tetapanState.azanOtherFilePath = laluan;
    const span = document.getElementById('azan-lain-nama');
    if (span) span.textContent = namaFail(laluan);
  });

  // Padam fail azan lain
  document.getElementById('btn-azan-lain-padam')?.addEventListener('click', () => {
    tetapanState.azanOtherFilePath = null;
    const span = document.getElementById('azan-lain-nama');
    if (span) span.textContent = 'Tiada fail dipilih';
  });

  // Pilih folder idle
  document.getElementById('btn-idle-folder')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFolder();
    if (laluan === null) return;
    tetapanState.idleFolderPath = laluan;
    const span = document.getElementById('idle-folder-nama');
    if (span) span.textContent = namaFolder(laluan);
  });

  // Padam folder idle
  document.getElementById('btn-idle-folder-padam')?.addEventListener('click', () => {
    tetapanState.idleFolderPath = null;
    const span = document.getElementById('idle-folder-nama');
    if (span) span.textContent = 'Tiada folder dipilih';
  });

  // Butang simpan
  document.getElementById('btn-simpan-tetapan')?.addEventListener('click', () => {
    simpanTetapan().catch((err) => {
      console.error('[tetapan] ralat simpan:', err);
    });
  });

  // Muatkan data awal
  await muatTetapan();

  // Ikat gelangsar volume
  initGelansarVolume('azan-volume', 'azan-volume-nilai', 'azanVolume');
  initGelansarVolume('notifikasi-volume', 'notifikasi-volume-nilai', 'notificationVolume');
  initGelansarVolume('idle-volume', 'idle-volume-nilai', 'idleVolume');
}

async function main(): Promise<void> {
  initNavigation();
  await Promise.all([loadHalamanUtama(), loadAboutPage(), initHalamanTetapan()]);
}

main().catch((err) => {
  console.error('[renderer] ralat semasa inisialisasi:', err);
});
