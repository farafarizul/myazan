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
      windowMinimize: () => Promise<void>;
      windowClose: () => Promise<void>;
      listIdleFiles: (folderPath: string) => Promise<string[]>;
    };
  }
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
// Navigasi sidebar
// ============================================================

/** Inisialisasi navigasi sidebar (Digital Sanctuary layout). */
function initNavigation(): void {
  const navItems = document.querySelectorAll<HTMLButtonElement>('.nav-item[data-page]');
  const pages = document.querySelectorAll<HTMLElement>('.page');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetPage = item.dataset['page'];

      navItems.forEach((n) => n.classList.remove('nav-item-active'));
      pages.forEach((p) => p.classList.remove('active'));

      item.classList.add('nav-item-active');
      const pageEl = document.getElementById(`page-${targetPage}`);
      pageEl?.classList.add('active');

      // Sync audio page controls when navigating to audio page
      if (targetPage === 'audio') {
        syncAudioPage();
      }
      // Sync zikir page controls when navigating to zikir page
      if (targetPage === 'zikir') {
        syncZikirPage();
      }
      // Sync pemberitahuan page controls when navigating to pemberitahuan page
      if (targetPage === 'pemberitahuan') {
        syncPemberitahuanPage();
      }
    });
  });
}

// ============================================================
// Window controls
// ============================================================

function initWindowControls(): void {
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    window.myAzan.windowMinimize().catch((err) => {
      console.error('[window] gagal minimize:', err);
    });
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    window.myAzan.windowClose().catch((err) => {
      console.error('[window] gagal close:', err);
    });
  });
}

// ============================================================
// Pembantu masa
// ============================================================

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

/** Tukar masa format 24-jam (HH:MM) kepada format 12-jam (h:MM AM/PM). */
function format12Jam(masa: string): string {
  const [jamStr, minitStr] = masa.split(':');
  const jam = parseInt(jamStr ?? '0', 10);
  const minit = minitStr ?? '00';
  const period = jam < 12 ? 'AM' : 'PM';
  const jam12 = jam % 12 === 0 ? 12 : jam % 12;
  return `${jam12}:${minit} ${period}`;
}

/** Format tarikh ke string Bahasa Malaysia. */
function formatTarikhMasihi(d: Date): string {
  return d.toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ============================================================
// Ikon untuk setiap waktu solat
// ============================================================

const IKON_WAKTU: Record<string, string> = {
  imsak:   'nightlight',
  fajr:    'bedtime',
  syuruk:  'wb_sunny',
  dhuha:   'flare',
  dhuhr:   'light_mode',
  asr:     'partly_cloudy_day',
  maghrib: 'wb_twilight',
  isha:    'dark_mode',
};

// ============================================================
// Clock ticker (halaman Papan Pemuka)
// ============================================================

let clockInterval: ReturnType<typeof setInterval> | null = null;

// Simpan data solat semasa supaya clock tick boleh kemas kini countdown
let _prayerWaktu: Array<[string, string | null]> = [];

function startClock(): void {
  function tick(): void {
    const now = new Date();
    const jamEl = document.getElementById('dashboard-jam');
    if (jamEl) {
      jamEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    const tarikhEl = document.getElementById('dashboard-tarikh-masihi');
    if (tarikhEl) {
      tarikhEl.textContent = formatTarikhMasihi(now);
    }

    // Kemas kini countdown & progress bar secara langsung
    if (_prayerWaktu.length > 0) {
      const sekarangMinit = masaKeMinit(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      );
      kemaskiniCountdown(_prayerWaktu, sekarangMinit);
    }
  }
  tick();
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(tick, 1000);
}

/** Kemas kini countdown bar dan teks "seterusnya". */
function kemaskiniCountdown(waktu: Array<[string, string | null]>, sekarangMinit: number): void {
  let indexBerikutnya = -1;
  for (let i = 0; i < waktu.length; i++) {
    const masa = waktu[i]?.[1];
    if (masa && masaKeMinit(masa) > sekarangMinit) {
      indexBerikutnya = i;
      break;
    }
  }

  if (indexBerikutnya < 0) return;

  const nextEntry = waktu[indexBerikutnya];
  if (!nextEntry) return;
  const [nextEvent, nextMasa] = nextEntry;

  const labelEl = document.getElementById('next-prayer-label');
  const countdownEl = document.getElementById('next-prayer-countdown');
  const barFill = document.getElementById('next-prayer-bar-fill');

  if (labelEl) labelEl.textContent = `Seterusnya: ${NAMA_WAKTU[nextEvent] ?? nextEvent}`;

  if (nextMasa && countdownEl) {
    const totalSaat = (masaKeMinit(nextMasa) - sekarangMinit) * 60;
    const jam = Math.floor(totalSaat / 3600);
    const minit = Math.floor((totalSaat % 3600) / 60);
    const saat = totalSaat % 60;
    countdownEl.textContent = [
      String(jam).padStart(2, '0'),
      String(minit).padStart(2, '0'),
      String(saat).padStart(2, '0'),
    ].join(':');
  }

  if (barFill && nextMasa) {
    const prevIndex = indexBerikutnya - 1;
    const prevMasa = prevIndex >= 0 ? (waktu[prevIndex]?.[1] ?? null) : null;
    if (prevMasa) {
      const total = masaKeMinit(nextMasa) - masaKeMinit(prevMasa);
      const elapsed = sekarangMinit - masaKeMinit(prevMasa);
      const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
      barFill.style.width = `${pct}%`;
    }
  }
}

/**
 * Muatkan dan paparkan waktu solat hari ini.
 * Jika tiada data tempatan, cuba sync terlebih dahulu.
 */
async function loadHalamanUtama(): Promise<void> {
  const bentoEl = document.getElementById('db-prayer-bento');

  if (bentoEl) bentoEl.innerHTML = '<p class="info-teks">Memuat waktu solat...</p>';

  startClock();

  let settings: AppSettings;
  try {
    settings = await window.myAzan.getSettings();
  } catch {
    if (bentoEl) bentoEl.innerHTML = '<p class="info-teks">Gagal mendapatkan tetapan.</p>';
    return;
  }

  const zoneCode = settings.activeZoneCode;

  // Kemas kini label zon di papan pemuka
  const zonLabelEl = document.getElementById('dashboard-zon-label');
  if (zonLabelEl) {
    zonLabelEl.textContent = zoneCode ?? '— Pilih Zon di Tetapan —';
  }

  // Kemas kini status idle audio
  kemaskiniStatusIdle(settings);

  if (!zoneCode) {
    const msg = '<p class="info-teks">Sila pilih zon waktu solat anda di halaman <strong>Tetapan</strong>.</p>';
    if (bentoEl) bentoEl.innerHTML = msg;
    return;
  }

  const tarikh = tarikhHariIni();
  let data = await window.myAzan.getPrayerTimesForDate(zoneCode, tarikh);

  if (!data) {
    if (bentoEl) bentoEl.innerHTML = '<p class="info-teks">Memuat turun data waktu solat...</p>';
    try {
      const syncResult = await window.myAzan.syncPrayerTimes({ zoneCode });
      if (!syncResult.ok) {
        const errMsg = `<p class="info-teks">Gagal memuat turun data: ${syncResult.error ?? 'Ralat tidak diketahui'}.</p>`;
        if (bentoEl) bentoEl.innerHTML = errMsg;
        return;
      }
      data = await window.myAzan.getPrayerTimesForDate(zoneCode, tarikh);
    } catch {
      const errMsg = '<p class="info-teks">Gagal memuat turun data waktu solat.</p>';
      if (bentoEl) bentoEl.innerHTML = errMsg;
      return;
    }
  }

  if (!data) {
    const errMsg = '<p class="info-teks">Tiada data waktu solat untuk hari ini.</p>';
    if (bentoEl) bentoEl.innerHTML = errMsg;
    return;
  }

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

  // Simpan untuk clock tick
  _prayerWaktu = waktuBerurutan;

  // Cari waktu berikutnya
  let indexBerikutnya = -1;
  for (let i = 0; i < waktuBerurutan.length; i++) {
    const masa = waktuBerurutan[i]?.[1];
    if (masa && masaKeMinit(masa) > sekarangMinit) {
      indexBerikutnya = i;
      break;
    }
  }

  // Countdown strip (initial render — clock tick akan terus kemas kini)
  kemaskiniCountdown(waktuBerurutan, sekarangMinit);

  // Bento prayer grid
  renderPrayerBentoCards(waktuBerurutan, sekarangMinit, indexBerikutnya, settings);

  // SVG Timeline chart
  renderTimelineSvg(waktuBerurutan, sekarangMinit, indexBerikutnya);

  // Hidden compat: waktu-solat-list
  const listEl = document.getElementById('waktu-solat-list');
  if (listEl) {
    listEl.innerHTML = waktuBerurutan
      .map(([event, masa], i) => {
        if (!masa) return '';
        const nama = NAMA_WAKTU[event] ?? event;
        const isActive = i === indexBerikutnya;
        return `<div style="display:flex;justify-content:space-between;padding:2px 0;
                     ${isActive ? 'color:var(--primary);font-weight:700;' : ''}">
                  <span>${nama}</span>
                  <span style="font-variant-numeric:tabular-nums;">${masa.substring(0, 5)}</span>
                </div>`;
      })
      .join('');
  }
}

// ============================================================
// Render: Bento Prayer Cards
// ============================================================

function renderPrayerBentoCards(
  waktu: Array<[string, string | null]>,
  sekarangMinit: number,
  indexBerikutnya: number,
  settings: AppSettings,
): void {
  const bento = document.getElementById('db-prayer-bento');
  if (!bento) return;

  const html = waktu
    .map(([event, masa], i) => {
      if (!masa) return '';
      const nama = NAMA_WAKTU[event] ?? event;
      const ikon = IKON_WAKTU[event] ?? 'schedule';
      const masaMenit = masaKeMinit(masa);
      const isNext = i === indexBerikutnya;
      const isCurrent = i === indexBerikutnya - 1 && indexBerikutnya > 0;
      const isPast = masaMenit < sekarangMinit && !isNext;

      let cardClass = 'db-prayer-card';
      if (isNext) cardClass += ' db-prayer-active';
      else if (isCurrent) cardClass += ' db-prayer-current';
      else if (isPast) cardClass += ' db-prayer-past';

      const notifEnabled = settings.notificationSettings?.find((n) => n.eventName === event)?.enabled ?? false;
      const notifIconName = notifEnabled ? 'notifications_active' : 'notifications_off';
      const notifIconStyle = notifEnabled
        ? 'color:var(--primary);font-variation-settings:"FILL" 1,"wght" 400,"GRAD" 0,"opsz" 24;'
        : 'color:var(--outline-variant);';

      const ikonFill = isNext
        ? 'font-variation-settings:\"FILL\" 1,\"wght\" 400,\"GRAD\" 0,\"opsz\" 24;'
        : '';

      return `
        <div class="${cardClass}">
          <span class="material-symbols-outlined db-prayer-notif-icon" style="${notifIconStyle}" title="${notifEnabled ? 'Notifikasi Aktif' : 'Notifikasi Tidak Aktif'}">${notifIconName}</span>
          <div class="db-prayer-card-icon">
            <span class="material-symbols-outlined" style="${ikonFill}">${ikon}</span>
          </div>
          <div class="db-prayer-card-name">${nama}</div>
          <div class="db-prayer-card-time">${format12Jam(masa.substring(0, 5))}</div>
        </div>`;
    })
    .join('');

  bento.innerHTML = html || '<p class="info-teks">Tiada data.</p>';
}

// ============================================================
// Render: SVG Timeline Chart
// ============================================================

function renderTimelineSvg(
  waktu: Array<[string, string | null]>,
  sekarangMinit: number,
  indexBerikutnya: number,
): void {
  const svg = document.getElementById('db-timeline-svg');
  if (!svg) return;

  const validWaktu = waktu.filter(([, masa]) => masa !== null) as Array<[string, string]>;
  if (validWaktu.length < 2) {
    svg.innerHTML = `<text x="380" y="50" text-anchor="middle"
      font-size="12" fill="var(--on-surface-variant)" font-family="Inter,sans-serif">Tiada data</text>`;
    return;
  }

  const allMinutes = validWaktu.map(([, masa]) => masaKeMinit(masa));
  const minTime = Math.max(0, (allMinutes[0] ?? 0) - 20);
  const maxTime = Math.min(1439, (allMinutes[allMinutes.length - 1] ?? 1439) + 40);
  const timeRange = maxTime - minTime || 1;

  const svgW = 760;
  const padX = 24;
  const trackW = svgW - padX * 2;
  const trackY = 44;
  const trackH = 7;
  const dotCY = trackY + trackH / 2;
  const dotR = 6;

  const timeToX = (minutes: number): number =>
    padX + Math.max(0, Math.min(1, (minutes - minTime) / timeRange)) * trackW;

  const currentX = timeToX(sekarangMinit);

  let h = '';

  // Background track
  h += `<rect x="${padX}" y="${trackY}" width="${trackW}" height="${trackH}"
    rx="${trackH / 2}" fill="var(--surface-container-high)" />`;

  // Elapsed fill
  const elapsedW = Math.max(0, Math.min(trackW, currentX - padX));
  if (elapsedW > 0) {
    h += `<rect x="${padX}" y="${trackY}" width="${elapsedW}" height="${trackH}"
      rx="${trackH / 2}" fill="var(--primary)" opacity="0.45" />`;
  }

  // Prayer markers (alternate labels above/below to prevent overlap)
  validWaktu.forEach(([event, masa], i) => {
    const x = timeToX(masaKeMinit(masa));
    const nama = NAMA_WAKTU[event] ?? event;
    const masaMenit = masaKeMinit(masa);
    const isNext = waktu.findIndex(([e]) => e === event) === indexBerikutnya;
    const isPast = masaMenit < sekarangMinit;
    const isAbove = i % 2 === 0;

    const dotFill = isPast || isNext ? 'var(--primary)' : 'var(--surface-container-lowest)';
    const dotStroke = isPast || isNext ? 'var(--primary)' : 'var(--outline-variant)';
    const r = isNext ? dotR + 2 : dotR;
    const textFill = isNext ? 'var(--primary)' : 'var(--on-surface-variant)';
    const fontWeight = isNext ? '700' : '500';

    h += `<circle cx="${x}" cy="${dotCY}" r="${r}"
      fill="${dotFill}" stroke="${dotStroke}" stroke-width="1.5" />`;
    if (isNext) {
      h += `<circle cx="${x}" cy="${dotCY}" r="${r + 5}"
        fill="none" stroke="var(--primary)" stroke-width="1" opacity="0.35" />`;
    }

    if (isAbove) {
      h += `<text x="${x}" y="${trackY - 14}" text-anchor="middle"
        font-size="9" font-weight="${fontWeight}" fill="${textFill}"
        font-family="Inter,sans-serif">${nama}</text>`;
      h += `<text x="${x}" y="${trackY - 25}" text-anchor="middle"
        font-size="8" fill="${textFill}" opacity="0.7"
        font-family="Inter,sans-serif">${masa.substring(0, 5)}</text>`;
    } else {
      h += `<text x="${x}" y="${trackY + trackH + 16}" text-anchor="middle"
        font-size="9" font-weight="${fontWeight}" fill="${textFill}"
        font-family="Inter,sans-serif">${nama}</text>`;
      h += `<text x="${x}" y="${trackY + trackH + 28}" text-anchor="middle"
        font-size="8" fill="${textFill}" opacity="0.7"
        font-family="Inter,sans-serif">${masa.substring(0, 5)}</text>`;
    }
  });

  // Current time indicator
  h += `<line x1="${currentX}" y1="${trackY - 10}" x2="${currentX}" y2="${trackY + trackH + 10}"
    stroke="var(--tertiary-container)" stroke-width="2" stroke-dasharray="3,2" />`;
  h += `<circle cx="${currentX}" cy="${dotCY}" r="4"
    fill="var(--tertiary-container)" stroke="var(--secondary)" stroke-width="1.5" />`;

  svg.innerHTML = h;
}

// ============================================================
// Kemas kini Status Idle Audio
// ============================================================

function kemaskiniStatusIdle(settings: AppSettings): void {
  const iconWrap = document.getElementById('db-idle-icon-wrap');
  const statusText = document.getElementById('db-idle-status-text');
  const trackEl = document.getElementById('db-idle-track');
  const card = document.getElementById('db-idle-mini-card');

  const aktif = settings.idleEnabled && !!settings.idleFolderPath;

  if (statusText) statusText.textContent = aktif ? 'Aktif' : 'Tidak Aktif';

  if (trackEl) {
    if (settings.idleFolderPath) {
      const bahagian = settings.idleFolderPath.replace(/\\/g, '/').split('/');
      trackEl.textContent = bahagian[bahagian.length - 1] ?? settings.idleFolderPath;
    } else {
      trackEl.textContent = 'Tiada folder dipilih';
    }
  }

  if (iconWrap) {
    const icon = iconWrap.querySelector<HTMLSpanElement>('.material-symbols-outlined');
    if (icon) icon.textContent = aktif ? 'graphic_eq' : 'library_music';
  }

  if (card) {
    if (aktif) {
      card.classList.add('db-idle-active');
    } else {
      card.classList.remove('db-idle-active');
    }
  }
}

// ============================================================
// Halaman Tentang
// ============================================================

/** Muatkan maklumat pembangun pada halaman Tentang. */
async function loadAboutPage(): Promise<void> {
  const container = document.getElementById('tentang-info');
  if (!container) return;

  try {
    const info: AppInfo = await window.myAzan.getAppInfo();
    const tahunHakCipta = new Date().getFullYear();

    container.innerHTML = `
      <div class="about-grid">

        <!-- Kad Pembangun -->
        <div class="about-dev-card">
          <div class="about-dev-inner">
            <div class="about-avatar" aria-hidden="true">🧑‍💻</div>
            <div style="flex:1;">
              <div class="about-name">${info.author}</div>
              <div class="about-role">Pembangun Utama &amp; Pereka UI</div>
              <div class="about-contacts">
                <div class="about-contact-item">
                  <div class="about-contact-icon">
                    <span class="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <div class="about-contact-label">Emel</div>
                    <a class="about-contact-value" href="mailto:${info.email}">${info.email}</a>
                  </div>
                </div>
                <div class="about-contact-item">
                  <div class="about-contact-icon">
                    <span class="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <div class="about-contact-label">Telefon</div>
                    <div class="about-contact-value">${info.phone}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Maklumat Perisian -->
        <div class="about-info-col">
          <div class="about-software-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <span style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
                           color:var(--on-surface-variant);">Informasi Perisian</span>
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary);">terminal</span>
            </div>
            <div class="about-software-row">
              <span class="about-software-key">Aplikasi</span>
              <span class="about-software-val">${info.name}</span>
            </div>
            <div class="about-software-row">
              <span class="about-software-key">Versi</span>
              <span class="about-version-badge">${info.version}</span>
            </div>
            <div class="about-software-row">
              <span class="about-software-key">Status Lesen</span>
              <span class="about-license-badge">Proprietari</span>
            </div>
          </div>
        </div>

        <!-- Objektif -->
        <div class="about-objective-card">
          <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
                       color:var(--on-surface-variant);margin-bottom:8px;">Objektif Projek</div>
          <p style="font-size:0.9rem;line-height:1.6;color:var(--on-surface);">${info.objective}</p>
        </div>

        <!-- Notis Lesen -->
        <div class="about-license-notice">
          <span class="material-symbols-outlined">warning</span>
          <p>${info.license}</p>
        </div>

        <!-- Footer -->
        <div class="about-footer">
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

// ============================================================
// State halaman Tetapan & Audio
// ============================================================

interface TetapanState {
  zones: Zone[];
  settings: AppSettings | null;
  azanSubuhFilePath: string | null;
  azanOtherFilePath: string | null;
  idleFolderPath: string | null;
  azanVolume: number;
  notificationVolume: number;
  idleVolume: number;
  notificationSettings: NotificationSetting[];
  launchOnStartup: boolean;
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
  launchOnStartup: true,
};

// ============================================================
// Pembantu UI
// ============================================================

/** Paparkan mesej status pada bahagian atas halaman Tetapan. */
function tunjukStatusTetapan(mesej: string, jenis: 'berjaya' | 'ralat'): void {
  const el = document.getElementById('tetapan-status');
  if (!el) return;
  el.textContent = mesej;
  el.className = `alert alert-${jenis === 'berjaya' ? 'success' : 'error'}`;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 5000);
}

/** Kembalikan nama fail sahaja dari laluan penuh. */
function namaFail(laluan: string | null): string {
  if (!laluan) return 'Tiada fail dipilih';
  const bahagian = laluan.replace(/\\/g, '/').split('/');
  return bahagian[bahagian.length - 1] ?? laluan;
}

/** Potong laluan folder untuk paparan. */
function namaFolder(laluan: string | null): string {
  if (!laluan) return 'Tiada folder dipilih';
  const bahagian = laluan.replace(/\\/g, '/').split('/');
  return bahagian[bahagian.length - 1] ?? laluan;
}

/** Tetapkan nilai dan label teks gelangsar volume. */
function setSlider(id: string, nilaiId: string, val: number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  const nilaiEl = document.getElementById(nilaiId);
  if (el) el.value = String(val);
  if (nilaiEl) nilaiEl.textContent = `${val}%`;
}

/** Ikat gelangsar volume kepada nilai teks dan kemas kini state. */
function initGelansarVolume(
  sliderId: string,
  nilaiId: string,
  stateKey: 'azanVolume' | 'notificationVolume' | 'idleVolume',
  mirrorId?: string,
  mirrorNilaiId?: string,
): void {
  const slider = document.getElementById(sliderId) as HTMLInputElement | null;
  const nilaiEl = document.getElementById(nilaiId);
  if (!slider || !nilaiEl) return;

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value, 10);
    nilaiEl.textContent = `${v}%`;
    tetapanState[stateKey] = v;
    if (mirrorId) {
      const mirror = document.getElementById(mirrorId) as HTMLInputElement | null;
      const mirrorNilai = mirrorNilaiId ? document.getElementById(mirrorNilaiId) : null;
      if (mirror) mirror.value = String(v);
      if (mirrorNilai) mirrorNilai.textContent = `${v}%`;
    }
  });
}

// ============================================================
// Zon: isi dropdown negeri & zon
// ============================================================

function isiDropdownNegeri(zones: Zone[], selectedZoneCode: string | null): void {
  const selectNegeri = document.getElementById('pilih-negeri') as HTMLSelectElement | null;
  if (!selectNegeri) return;

  const negeriUnik = [...new Set(zones.map((z) => z.stateName))];
  selectNegeri.innerHTML = '<option value="">-- Pilih Negeri --</option>';
  negeriUnik.forEach((negeri) => {
    const opt = document.createElement('option');
    opt.value = negeri;
    opt.textContent = negeri;
    selectNegeri.appendChild(opt);
  });

  if (selectedZoneCode) {
    const zonAktif = zones.find((z) => z.code === selectedZoneCode);
    if (zonAktif) {
      selectNegeri.value = zonAktif.stateName;
      isiDropdownZon(zones, zonAktif.stateName, selectedZoneCode);
    }
  }
}

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

  if (selectedCode) selectZon.value = selectedCode;
}

// ============================================================
// Notifikasi: bina baris dalam table baru
// ============================================================

function binaSenaraiNotifikasi(notificationSettings: NotificationSetting[]): void {
  const bekas = document.getElementById('notifikasi-senarai');
  if (!bekas) return;

  bekas.innerHTML = '';

  const susunanWaktu = ['imsak', 'fajr', 'syuruk', 'dhuha', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // Table header
  const table = document.createElement('table');
  table.className = 'notif-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Waktu Solat</th>
        <th style="text-align:center;">Aktif</th>
        <th style="text-align:center;">Min Awal</th>
        <th style="text-align:right;">Fail Audio</th>
      </tr>
    </thead>
    <tbody id="notif-tbody"></tbody>
  `;
  bekas.appendChild(table);

  const tbody = document.getElementById('notif-tbody');
  if (!tbody) return;

  for (const eventName of susunanWaktu) {
    const ns = notificationSettings.find((n) => n.eventName === eventName);
    if (!ns) continue;

    const namaWaktu = NAMA_WAKTU[eventName] ?? eventName;
    const failNama = namaFail(ns.audioFilePath);
    const minit = ns.minutesBefore ?? 0;
    const aktif = ns.enabled;

    const tr = document.createElement('tr');
    tr.dataset['event'] = eventName;
    tr.innerHTML = `
      <td class="notif-waktu">${namaWaktu}</td>
      <td class="notif-cell-center">
        <label class="toggle-wrap toggle-wrap-sm" title="Aktif / Tidak Aktif" style="margin:auto;display:flex;">
          <input type="checkbox" class="notifikasi-togol" data-event="${eventName}" ${aktif ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
      </td>
      <td class="notif-cell-center">
        <input type="number" class="input-number notifikasi-minit-input" data-event="${eventName}"
               value="${minit}" min="0" max="60" title="Minit sebelum waktu" style="display:inline-block;" />
      </td>
      <td class="notif-cell-right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
          <span class="truncate" id="notif-fail-${eventName}"
                title="${ns.audioFilePath ?? ''}"
                style="max-width:120px;font-size:0.75rem;color:var(--on-surface-variant);">${failNama}</span>
          <button class="btn-icon notifikasi-btn-audio" data-event="${eventName}" type="button" title="Pilih Fail Audio">
            <span class="material-symbols-outlined">music_note</span>
          </button>
          <button class="btn-icon notifikasi-btn-padam" data-event="${eventName}" type="button" title="Padam Fail Audio">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Lekatkan pendengar
  tbody.querySelectorAll<HTMLButtonElement>('.notifikasi-btn-audio').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ev = btn.dataset['event'] ?? '';
      const laluan = await window.myAzan.selectAudioFile();
      if (laluan === null) return;
      const ns2 = tetapanState.notificationSettings.find((n) => n.eventName === ev);
      if (ns2) ns2.audioFilePath = laluan;
      const spanFail = document.getElementById(`notif-fail-${ev}`);
      if (spanFail) { spanFail.textContent = namaFail(laluan); spanFail.title = laluan; }
    });
  });

  tbody.querySelectorAll<HTMLButtonElement>('.notifikasi-btn-padam').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ev = btn.dataset['event'] ?? '';
      const ns2 = tetapanState.notificationSettings.find((n) => n.eventName === ev);
      if (ns2) ns2.audioFilePath = null;
      const spanFail = document.getElementById(`notif-fail-${ev}`);
      if (spanFail) { spanFail.textContent = 'Tiada fail'; spanFail.title = ''; }
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
    tetapanState.notificationSettings = settings.notificationSettings.map((n) => ({ ...n }));
    tetapanState.launchOnStartup = settings.launchOnStartup ?? true;

    isiDropdownNegeri(zones, settings.activeZoneCode);

    // Preview fail azan di bento card settings
    const subuhNamaEl = document.getElementById('audio-subuh-nama');
    if (subuhNamaEl) {
      subuhNamaEl.textContent = namaFail(settings.azanSubuhFilePath);
    }
    const lainNamaEl = document.getElementById('azan-lain-nama');
    if (lainNamaEl) {
      lainNamaEl.textContent = namaFail(settings.azanOtherFilePath);
    }

    // Togol idle & folder
    const togolIdle = document.getElementById('idle-aktif') as HTMLInputElement | null;
    if (togolIdle) togolIdle.checked = settings.idleEnabled;

    const spanFolder = document.getElementById('idle-folder-nama');
    if (spanFolder) spanFolder.textContent = namaFolder(settings.idleFolderPath);

    // Checkbox launch on startup
    const chkLaunch = document.getElementById('chk-launch-on-startup') as HTMLInputElement | null;
    if (chkLaunch) chkLaunch.checked = tetapanState.launchOnStartup;

    // Volume sliders dalam settings page
    setSlider('azan-volume', 'azan-volume-nilai', tetapanState.azanVolume);
    setSlider('notifikasi-volume', 'notifikasi-volume-nilai', tetapanState.notificationVolume);
    setSlider('idle-volume', 'idle-volume-nilai', tetapanState.idleVolume);
    setSlider('audio-azan-volume', 'audio-azan-volume-nilai', tetapanState.azanVolume);
    setSlider('audio-notifikasi-volume', 'audio-notifikasi-volume-nilai', tetapanState.notificationVolume);
    setSlider('audio-idle-volume2', 'audio-idle-volume2-nilai', tetapanState.idleVolume);
    setSlider('zikir-idle-volume', 'zikir-idle-volume-nilai', tetapanState.idleVolume);
    setSlider('pb-notifikasi-volume', 'pb-notifikasi-volume-nilai', tetapanState.notificationVolume);

    // Sync Zikir page folder & toggle
    const zikirFolderNama = document.getElementById('zikir-folder-nama');
    if (zikirFolderNama) zikirFolderNama.textContent = namaFolder(settings.idleFolderPath);
    const zikirTogol = document.getElementById('zikir-idle-aktif') as HTMLInputElement | null;
    if (zikirTogol) zikirTogol.checked = settings.idleEnabled;

    binaSenaraiNotifikasi(tetapanState.notificationSettings);
    binaKadPemberitahuan(tetapanState.notificationSettings);
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
  const chkLaunch = document.getElementById('chk-launch-on-startup') as HTMLInputElement | null;
  const selectedZoneCode = selectZon?.value || null;

  // Kemas kini state dari checkbox
  if (chkLaunch) tetapanState.launchOnStartup = chkLaunch.checked;

  const notificationSettings: NotificationSetting[] = [];

  // Kumpulkan dari tbody rows
  document.querySelectorAll<HTMLElement>('#notif-tbody tr[data-event]').forEach((baris) => {
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
    launchOnStartup: tetapanState.launchOnStartup,
  };

  try {
    const hasil = await window.myAzan.saveSettings(payload);
    if (hasil.ok) {
      tunjukStatusTetapan('✅ Tetapan berjaya disimpan.', 'berjaya');

      // Kemas kini label "last saved"
      const lastSavedEl = document.getElementById('settings-last-saved');
      const nowStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
      if (lastSavedEl) lastSavedEl.textContent = `Tetapan disimpan pada ${nowStr}`;

      // Kemas kini state
      tetapanState.settings = {
        ...(tetapanState.settings ?? {
          activeZoneCode: null,
          azanSubuhFilePath: null,
          azanOtherFilePath: null,
          idleFolderPath: null,
          idleEnabled: false,
          azanVolume: 100,
          notificationVolume: 100,
          idleVolume: 100,
          notificationSettings: [],
          launchOnStartup: true,
        }),
        ...payload,
        notificationSettings,
      } as AppSettings;

      // Muat semula waktu solat pada papan pemuka
      loadHalamanUtama().catch((err) => {
        console.error('[utama] gagal muat semula:', err);
      });
      // Refresh halaman Pemberitahuan juga
      binaKadPemberitahuan(notificationSettings);
    } else {
      tunjukStatusTetapan(`❌ Gagal simpan: ${hasil.error ?? 'Ralat tidak diketahui'}`, 'ralat');
    }
  } catch (err) {
    console.error('[tetapan] ralat semasa simpan:', err);
    tunjukStatusTetapan('❌ Ralat semasa menyimpan tetapan. Sila cuba semula.', 'ralat');
  }
}

// ============================================================
// Sync halaman Audio dengan state
// ============================================================

/** Sync semula UI halaman Audio dari tetapanState semasa navigasi ke halaman Audio. */
function syncAudioPage(): void {
  // Folder idle
  const idleFolderNama = document.getElementById('audio-idle-folder-nama');
  if (idleFolderNama) idleFolderNama.textContent = namaFolder(tetapanState.idleFolderPath);

  // Toggle idle
  const togolAudioIdle = document.getElementById('audio-idle-aktif') as HTMLInputElement | null;
  if (togolAudioIdle) togolAudioIdle.checked = tetapanState.settings?.idleEnabled ?? false;

  // Volume sliders dalam audio page
  setSlider('audio-idle-volume', 'audio-idle-volume-nilai', tetapanState.idleVolume);
}

// ============================================================
// Sync & init halaman Pemberitahuan
// ============================================================

const SUSUNAN_WAKTU_PEMBERITAHUAN = ['imsak', 'fajr', 'syuruk', 'dhuha', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Bina grid kad waktu solat di halaman Pemberitahuan. */
function binaKadPemberitahuan(notificationSettings: NotificationSetting[]): void {
  const grid = document.getElementById('pb-waktu-grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (const eventName of SUSUNAN_WAKTU_PEMBERITAHUAN) {
    const ns = notificationSettings.find((n) => n.eventName === eventName);
    if (!ns) continue;

    const namaWaktu = NAMA_WAKTU[eventName] ?? eventName;
    const ikon = IKON_WAKTU[eventName] ?? 'schedule';
    const aktif = ns.enabled;
    const minit = ns.minutesBefore ?? 0;
    const failNama = namaFail(ns.audioFilePath);

    const card = document.createElement('div');
    card.className = 'pb-waktu-card';
    card.dataset['event'] = eventName;
    card.innerHTML = `
      <div class="pb-waktu-card-header">
        <div class="pb-waktu-card-nama">
          <div class="pb-waktu-card-ikon">
            <span class="material-symbols-outlined">${ikon}</span>
          </div>
          <span class="pb-waktu-card-title">${namaWaktu}</span>
        </div>
        <label class="toggle-wrap" title="Aktif / Tidak Aktif">
          <input type="checkbox" class="pb-togol" data-event="${eventName}" ${aktif ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="pb-waktu-card-divider"></div>
      <div class="pb-waktu-card-row">
        <span class="pb-waktu-card-row-label">Minit Sebelum Waktu</span>
        <input type="number" class="input-number pb-minit-input" data-event="${eventName}"
               value="${minit}" min="0" max="60" style="width:70px;text-align:center;" />
      </div>
      <div class="pb-waktu-card-divider"></div>
      <div>
        <div class="pb-waktu-card-row-label" style="margin-bottom:8px;">Fail Audio</div>
        <div class="pb-waktu-card-audio-row">
          <span class="material-symbols-outlined" style="font-size:18px;color:var(--on-surface-variant);">music_note</span>
          <span class="pb-waktu-card-audio-nama" id="pb-fail-${eventName}"
                title="${ns.audioFilePath ?? ''}">${failNama}</span>
          <button class="btn-icon pb-btn-audio" data-event="${eventName}" type="button" title="Pilih Fail Audio">
            <span class="material-symbols-outlined">folder_open</span>
          </button>
          <button class="btn-icon pb-btn-padam" data-event="${eventName}" type="button" title="Padam Fail Audio">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  // Lekatkan pendengar fail audio
  grid.querySelectorAll<HTMLButtonElement>('.pb-btn-audio').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ev = btn.dataset['event'] ?? '';
      const laluan = await window.myAzan.selectAudioFile();
      if (laluan === null) return;
      const ns2 = tetapanState.notificationSettings.find((n) => n.eventName === ev);
      if (ns2) ns2.audioFilePath = laluan;
      const spanFail = document.getElementById(`pb-fail-${ev}`);
      if (spanFail) { spanFail.textContent = namaFail(laluan); spanFail.title = laluan; }
    });
  });

  grid.querySelectorAll<HTMLButtonElement>('.pb-btn-padam').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ev = btn.dataset['event'] ?? '';
      const ns2 = tetapanState.notificationSettings.find((n) => n.eventName === ev);
      if (ns2) ns2.audioFilePath = null;
      const spanFail = document.getElementById(`pb-fail-${ev}`);
      if (spanFail) { spanFail.textContent = 'Tiada fail dipilih'; spanFail.title = ''; }
    });
  });
}

/** Sync semula UI halaman Pemberitahuan dari tetapanState semasa navigasi. */
function syncPemberitahuanPage(): void {
  setSlider('pb-notifikasi-volume', 'pb-notifikasi-volume-nilai', tetapanState.notificationVolume);
  binaKadPemberitahuan(tetapanState.notificationSettings);
}

/** Inisialisasi halaman Pemberitahuan. */
function initHalamanPemberitahuan(): void {
  // Volume slider — sync ke tetapanState dan sliders lain
  const pbSlider = document.getElementById('pb-notifikasi-volume') as HTMLInputElement | null;
  const pbNilai = document.getElementById('pb-notifikasi-volume-nilai');
  pbSlider?.addEventListener('input', () => {
    const v = parseInt(pbSlider.value, 10);
    if (pbNilai) pbNilai.textContent = `${v}%`;
    tetapanState.notificationVolume = v;
    // Mirror ke sliders di halaman Tetapan
    const s1 = document.getElementById('notifikasi-volume') as HTMLInputElement | null;
    const s1v = document.getElementById('notifikasi-volume-nilai');
    const s2 = document.getElementById('audio-notifikasi-volume') as HTMLInputElement | null;
    const s2v = document.getElementById('audio-notifikasi-volume-nilai');
    if (s1) s1.value = String(v);
    if (s1v) s1v.textContent = `${v}%`;
    if (s2) s2.value = String(v);
    if (s2v) s2v.textContent = `${v}%`;
  });

  // Butang simpan
  document.getElementById('pb-btn-simpan')?.addEventListener('click', () => {
    simpanDariPemberitahuan().catch((err) => { console.error('[pemberitahuan] ralat simpan:', err); });
  });
}

/** Kumpul tetapan pemberitahuan dari halaman Pemberitahuan dan simpan. */
async function simpanDariPemberitahuan(): Promise<void> {
  const notificationSettings: NotificationSetting[] = [];

  document.querySelectorAll<HTMLElement>('#pb-waktu-grid .pb-waktu-card[data-event]').forEach((kad) => {
    const ev = kad.dataset['event'] ?? '';
    const togolEl = kad.querySelector<HTMLInputElement>('.pb-togol');
    const mInitEl = kad.querySelector<HTMLInputElement>('.pb-minit-input');
    const nsState = tetapanState.notificationSettings.find((n) => n.eventName === ev);

    notificationSettings.push({
      eventName: ev,
      enabled: togolEl?.checked ?? false,
      minutesBefore: parseInt(mInitEl?.value ?? '0', 10) || 0,
      audioFilePath: nsState?.audioFilePath ?? null,
      volume: nsState?.volume ?? null,
    });
  });

  // Kemas kini tetapanState supaya halaman Tetapan turut segerak
  tetapanState.notificationSettings = notificationSettings;

  const selectZon = document.getElementById('pilih-zon') as HTMLSelectElement | null;
  const togolIdle = document.getElementById('idle-aktif') as HTMLInputElement | null;
  const chkLaunch = document.getElementById('chk-launch-on-startup') as HTMLInputElement | null;

  const payload: SaveSettingsPayload = {
    activeZoneCode: (selectZon?.value || tetapanState.settings?.activeZoneCode) ?? null,
    azanSubuhFilePath: tetapanState.azanSubuhFilePath,
    azanOtherFilePath: tetapanState.azanOtherFilePath,
    idleFolderPath: tetapanState.idleFolderPath,
    idleEnabled: togolIdle?.checked ?? tetapanState.settings?.idleEnabled ?? false,
    azanVolume: tetapanState.azanVolume,
    notificationVolume: tetapanState.notificationVolume,
    idleVolume: tetapanState.idleVolume,
    notificationSettings,
    launchOnStartup: chkLaunch?.checked ?? tetapanState.launchOnStartup,
  };

  try {
    const hasil = await window.myAzan.saveSettings(payload);
    const lastSavedEl = document.getElementById('pb-last-saved');
    if (hasil.ok) {
      const nowStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
      if (lastSavedEl) lastSavedEl.textContent = `Tetapan disimpan pada ${nowStr}`;
      // Refresh senarai di halaman Tetapan juga
      binaSenaraiNotifikasi(notificationSettings);
    } else {
      if (lastSavedEl) lastSavedEl.textContent = `❌ Gagal simpan: ${hasil.error ?? 'Ralat tidak diketahui'}`;
    }
  } catch (err) {
    console.error('[pemberitahuan] ralat semasa simpan:', err);
    const lastSavedEl = document.getElementById('pb-last-saved');
    if (lastSavedEl) lastSavedEl.textContent = '❌ Ralat semasa menyimpan tetapan.';
  }
}

// ============================================================
// Inisialisasi halaman Tetapan
// ============================================================

async function initHalamanTetapan(): Promise<void> {
  // Dropdown negeri → kemas kini dropdown zon
  const selectNegeri = document.getElementById('pilih-negeri') as HTMLSelectElement | null;
  selectNegeri?.addEventListener('change', () => {
    isiDropdownZon(tetapanState.zones, selectNegeri.value, null);
  });

  // Pilih fail azan Subuh (settings page)
  document.getElementById('btn-azan-subuh')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFile();
    if (laluan === null) return;
    tetapanState.azanSubuhFilePath = laluan;
    const span = document.getElementById('audio-subuh-nama');
    if (span) span.textContent = namaFail(laluan);
  });

  document.getElementById('btn-azan-subuh-padam')?.addEventListener('click', () => {
    tetapanState.azanSubuhFilePath = null;
    const span = document.getElementById('audio-subuh-nama');
    if (span) span.textContent = 'Tiada fail dipilih';
  });

  // Pilih fail azan lain (settings page)
  document.getElementById('btn-azan-lain')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFile();
    if (laluan === null) return;
    tetapanState.azanOtherFilePath = laluan;
    const span = document.getElementById('azan-lain-nama');
    if (span) span.textContent = namaFail(laluan);
  });

  document.getElementById('btn-azan-lain-padam')?.addEventListener('click', () => {
    tetapanState.azanOtherFilePath = null;
    const span = document.getElementById('azan-lain-nama');
    if (span) span.textContent = 'Tiada fail dipilih';
  });

  // Idle folder picker (settings page)
  document.getElementById('btn-idle-folder')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFolder();
    if (laluan === null) return;
    tetapanState.idleFolderPath = laluan;
    const span = document.getElementById('idle-folder-nama');
    if (span) span.textContent = namaFolder(laluan);
  });

  document.getElementById('btn-idle-folder-padam')?.addEventListener('click', () => {
    tetapanState.idleFolderPath = null;
    const span = document.getElementById('idle-folder-nama');
    if (span) span.textContent = 'Tiada folder dipilih';
  });

  // Butang simpan
  document.getElementById('btn-simpan-tetapan')?.addEventListener('click', () => {
    simpanTetapan().catch((err) => { console.error('[tetapan] ralat simpan:', err); });
  });

  // Butang set semula
  document.getElementById('btn-set-semula')?.addEventListener('click', () => {
    muatTetapan().catch((err) => { console.error('[tetapan] ralat set semula:', err); });
  });

  // Muatkan data awal
  await muatTetapan();

  // Ikat gelangsar volume (settings page) — mirror ke Kawalan Kelantangan
  initGelansarVolume('azan-volume', 'azan-volume-nilai', 'azanVolume', 'audio-azan-volume', 'audio-azan-volume-nilai');
  initGelansarVolume('notifikasi-volume', 'notifikasi-volume-nilai', 'notificationVolume', 'audio-notifikasi-volume', 'audio-notifikasi-volume-nilai');
  initGelansarVolume('idle-volume', 'idle-volume-nilai', 'idleVolume', 'audio-idle-volume2', 'audio-idle-volume2-nilai');

  // Ikat gelangsar Kawalan Kelantangan (Settings page) — mirror ke individual sliders
  bindVolumeSlider('audio-azan-volume', 'audio-azan-volume-nilai', 'azanVolume', 'azan-volume', 'azan-volume-nilai');
  bindVolumeSlider('audio-notifikasi-volume', 'audio-notifikasi-volume-nilai', 'notificationVolume', 'notifikasi-volume', 'notifikasi-volume-nilai');
  bindVolumeSlider('audio-idle-volume2', 'audio-idle-volume2-nilai', 'idleVolume', 'idle-volume', 'idle-volume-nilai');
}

// ============================================================
// Ikat gelangsar volume dengan mirror
// ============================================================

function bindVolumeSlider(
  sliderId: string,
  nilaiId: string,
  stateKey: 'azanVolume' | 'notificationVolume' | 'idleVolume',
  mirrorId?: string,
  mirrorNilaiId?: string,
): void {
  const slider = document.getElementById(sliderId) as HTMLInputElement | null;
  const nilaiEl = document.getElementById(nilaiId);
  if (!slider) return;
  slider.addEventListener('input', () => {
    const v = parseInt(slider.value, 10);
    if (nilaiEl) nilaiEl.textContent = `${v}%`;
    tetapanState[stateKey] = v;
    if (mirrorId) {
      const mirror = document.getElementById(mirrorId) as HTMLInputElement | null;
      const mirrorNilai = mirrorNilaiId ? document.getElementById(mirrorNilaiId) : null;
      if (mirror) mirror.value = String(v);
      if (mirrorNilai) mirrorNilai.textContent = `${v}%`;
    }
  });
}

// ============================================================
// Inisialisasi halaman Audio
// ============================================================

function initHalamanAudio(): void {
  // Folder idle (audio page)
  document.getElementById('audio-btn-idle-folder')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFolder();
    if (laluan === null) return;
    tetapanState.idleFolderPath = laluan;
    const span = document.getElementById('audio-idle-folder-nama');
    if (span) span.textContent = namaFolder(laluan);
    // Sync ke settings page juga
    const settingsSpan = document.getElementById('idle-folder-nama');
    if (settingsSpan) settingsSpan.textContent = namaFolder(laluan);
  });

  document.getElementById('audio-btn-idle-folder-padam')?.addEventListener('click', () => {
    tetapanState.idleFolderPath = null;
    const span = document.getElementById('audio-idle-folder-nama');
    if (span) span.textContent = 'Tiada folder dipilih';
    const settingsSpan = document.getElementById('idle-folder-nama');
    if (settingsSpan) settingsSpan.textContent = 'Tiada folder dipilih';
  });

  // Toggle idle (audio page) — sync ke state
  const togolAudioIdle = document.getElementById('audio-idle-aktif') as HTMLInputElement | null;
  togolAudioIdle?.addEventListener('change', () => {
    const togolSettings = document.getElementById('idle-aktif') as HTMLInputElement | null;
    if (togolSettings) togolSettings.checked = togolAudioIdle.checked;
  });

  // Volume slider idle dalam audio page
  bindVolumeSlider('audio-idle-volume', 'audio-idle-volume-nilai', 'idleVolume', 'idle-volume', 'idle-volume-nilai');

  // Butang simpan audio page
  document.getElementById('btn-simpan-audio')?.addEventListener('click', () => {
    // Sync togol idle dari audio page ke tetapan sebelum simpan
    const togolAudio = document.getElementById('audio-idle-aktif') as HTMLInputElement | null;
    const togolSettings = document.getElementById('idle-aktif') as HTMLInputElement | null;
    if (togolAudio && togolSettings) togolSettings.checked = togolAudio.checked;
    simpanTetapan().catch((err) => { console.error('[audio] ralat simpan:', err); });
  });
}

// ============================================================
// Halaman Zikir — senarai fail & kawalan idle
// ============================================================

/** Muatkan dan paparkan senarai fail MP3 daripada folder idle ke dalam halaman Zikir. */
async function muatSenaraiZikirFail(folderPath: string | null): Promise<void> {
  const senaraiEl = document.getElementById('zikir-fail-senarai') as HTMLOListElement | null;
  const kosongEl = document.getElementById('zikir-fail-kosong');
  const kiraanEl = document.getElementById('zikir-fail-kiraan');

  if (!senaraiEl) return;

  if (!folderPath) {
    senaraiEl.style.display = 'none';
    senaraiEl.innerHTML = '';
    if (kosongEl) {
      kosongEl.style.display = '';
      kosongEl.textContent = 'Pilih folder untuk melihat senarai fail.';
    }
    if (kiraanEl) kiraanEl.textContent = '0 fail';
    return;
  }

  try {
    const fails = await window.myAzan.listIdleFiles(folderPath);

    senaraiEl.innerHTML = '';

    if (fails.length === 0) {
      senaraiEl.style.display = 'none';
      if (kosongEl) {
        kosongEl.style.display = '';
        kosongEl.textContent = 'Tiada fail audio (.mp3, .wav, .ogg, .m4a) dalam folder ini.';
      }
      if (kiraanEl) kiraanEl.textContent = '0 fail';
      return;
    }

    if (kosongEl) kosongEl.style.display = 'none';
    senaraiEl.style.display = '';
    if (kiraanEl) kiraanEl.textContent = `${fails.length} fail`;

    fails.forEach((nama, idx) => {
      const li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--outline-variant);font-size:0.875rem;';
      li.innerHTML = `
        <span style="min-width:24px;text-align:right;color:var(--on-surface-variant);font-size:0.75rem;">${idx + 1}.</span>
        <span class="material-symbols-outlined" style="font-size:16px;color:var(--secondary);flex-shrink:0;">audio_file</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${nama}">${nama}</span>
      `;
      senaraiEl.appendChild(li);
    });
  } catch (err) {
    console.error('[zikir] gagal muatkan senarai fail:', err);
    if (kosongEl) {
      kosongEl.style.display = '';
      kosongEl.textContent = 'Gagal membaca folder. Sila cuba semula.';
    }
    if (kiraanEl) kiraanEl.textContent = '—';
    senaraiEl.style.display = 'none';
  }
}

/** Sync semula UI halaman Zikir dari tetapanState. */
function syncZikirPage(): void {
  const folderNama = document.getElementById('zikir-folder-nama');
  if (folderNama) folderNama.textContent = namaFolder(tetapanState.idleFolderPath);

  const togol = document.getElementById('zikir-idle-aktif') as HTMLInputElement | null;
  if (togol) togol.checked = tetapanState.settings?.idleEnabled ?? false;

  const slider = document.getElementById('zikir-idle-volume') as HTMLInputElement | null;
  const nilaiEl = document.getElementById('zikir-idle-volume-nilai');
  const vol = tetapanState.idleVolume;
  if (slider) slider.value = String(vol);
  if (nilaiEl) nilaiEl.textContent = `${vol}%`;

  muatSenaraiZikirFail(tetapanState.idleFolderPath).catch((err) => {
    console.error('[zikir] gagal sync senarai fail:', err);
  });
}

/** Inisialisasi event listeners halaman Zikir. */
function initHalamanZikir(): void {
  // Pilih folder
  document.getElementById('zikir-btn-folder')?.addEventListener('click', async () => {
    const laluan = await window.myAzan.selectAudioFolder();
    if (laluan === null) return;
    tetapanState.idleFolderPath = laluan;
    const span = document.getElementById('zikir-folder-nama');
    if (span) span.textContent = namaFolder(laluan);
    // Sync ke pages lain
    const audioSpan = document.getElementById('audio-idle-folder-nama');
    if (audioSpan) audioSpan.textContent = namaFolder(laluan);
    const settingsSpan = document.getElementById('idle-folder-nama');
    if (settingsSpan) settingsSpan.textContent = namaFolder(laluan);
    await muatSenaraiZikirFail(laluan);
  });

  // Padam folder
  document.getElementById('zikir-btn-folder-padam')?.addEventListener('click', () => {
    tetapanState.idleFolderPath = null;
    const els = ['zikir-folder-nama', 'audio-idle-folder-nama', 'idle-folder-nama'];
    els.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Tiada folder dipilih';
    });
    muatSenaraiZikirFail(null).catch(() => undefined);
  });

  // Toggle idle — sync ke pages lain
  const togolZikir = document.getElementById('zikir-idle-aktif') as HTMLInputElement | null;
  togolZikir?.addEventListener('change', () => {
    const togolAudio = document.getElementById('audio-idle-aktif') as HTMLInputElement | null;
    const togolSettings = document.getElementById('idle-aktif') as HTMLInputElement | null;
    if (togolAudio) togolAudio.checked = togolZikir.checked;
    if (togolSettings) togolSettings.checked = togolZikir.checked;
  });

  // Volume slider — sync ke pages lain
  bindVolumeSlider('zikir-idle-volume', 'zikir-idle-volume-nilai', 'idleVolume', 'idle-volume', 'idle-volume-nilai');
  const zikirSlider = document.getElementById('zikir-idle-volume') as HTMLInputElement | null;
  zikirSlider?.addEventListener('input', () => {
    const v = parseInt(zikirSlider.value, 10);
    const audioSlider = document.getElementById('audio-idle-volume') as HTMLInputElement | null;
    const audioNilai = document.getElementById('audio-idle-volume-nilai');
    const audioSlider2 = document.getElementById('audio-idle-volume2') as HTMLInputElement | null;
    const audioNilai2 = document.getElementById('audio-idle-volume2-nilai');
    if (audioSlider) audioSlider.value = String(v);
    if (audioNilai) audioNilai.textContent = `${v}%`;
    if (audioSlider2) audioSlider2.value = String(v);
    if (audioNilai2) audioNilai2.textContent = `${v}%`;
  });

  // Simpan tetapan
  document.getElementById('zikir-btn-simpan')?.addEventListener('click', () => {
    simpanTetapan().catch((err) => { console.error('[zikir] ralat simpan:', err); });
  });
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  initNavigation();
  initWindowControls();
  initHalamanAudio();
  initHalamanZikir();
  initHalamanPemberitahuan();
  await Promise.all([loadHalamanUtama(), loadAboutPage(), initHalamanTetapan()]);
}

main().catch((err) => {
  console.error('[renderer] ralat semasa inisialisasi:', err);
});
