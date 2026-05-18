import type { AppSettings, PrayerTimeForDate } from '../shared/types';

const NAMA_WAKTU: Record<string, string> = {
  fajr: 'Subuh',
  syuruk: 'Syuruk',
  dhuha: 'Dhuha',
  dhuhr: 'Zohor',
  asr: 'Asar',
  maghrib: 'Maghrib',
  isha: "Isya'",
};

const IKON_WAKTU: Record<string, string> = {
  fajr: 'bedtime',
  syuruk: 'wb_twilight',
  dhuha: 'light_mode',
  dhuhr: 'wb_sunny',
  asr: 'partly_cloudy_day',
  maghrib: 'wb_twilight',
  isha: 'dark_mode',
};

let todayPrayerState: PrayerTimeForDate | null = null;
let tomorrowPrayerState: PrayerTimeForDate | null = null;
let currentDateKey = '';
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let exitControlEnabledAt = 0;

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function tarikhKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function tambahHari(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function masaKeMinit(masa: string): number {
  const [jam, minit] = masa.split(':').map(Number);
  return (jam ?? 0) * 60 + (minit ?? 0);
}

function format12Jam(masa: string): string {
  const [jamStr, minitStr] = masa.split(':');
  const jam = parseInt(jamStr ?? '0', 10);
  const minit = minitStr ?? '00';
  const period = jam < 12 ? 'AM' : 'PM';
  const jam12 = jam % 12 === 0 ? 12 : jam % 12;
  return `${String(jam12).padStart(2, '0')}:${minit} ${period}`;
}

function formatJam(now: Date): string {
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const period = now.getHours() < 12 ? 'AM' : 'PM';
  const hour12 = now.getHours() % 12 === 0 ? 12 : now.getHours() % 12;
  return `${String(hour12).padStart(2, '0')}:${m}:${s} ${period}`;
}

function formatTarikhMasihi(date: Date): string {
  return date.toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function toFileUrl(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
  return encodeURI(prefixed);
}

function setText(id: string, value: string): void {
  const el = byId(id);
  if (el) el.textContent = value;
}

function setImage(id: string, placeholderId: string, path: string | null, fallbackSrc?: string): void {
  const img = byId<HTMLImageElement>(id);
  const placeholder = byId(placeholderId);
  const url = toFileUrl(path) ?? fallbackSrc ?? null;
  if (!img || !placeholder) return;

  if (url) {
    img.src = url;
    img.hidden = false;
    placeholder.hidden = true;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
    placeholder.hidden = false;
  }
}

function applySettings(settings: AppSettings): void {
  setText('tv-mosque-name', settings.tvMosqueName || 'Masjid');
  setText('tv-mosque-address', settings.tvMosqueAddress || 'Sila tetapkan alamat masjid.');
  setText('tv-footer-location', settings.tvMosqueAddress || 'Sila tetapkan alamat masjid.');
  setText('tv-footer-website', settings.tvMosqueWebsite || '-');
  setText('tv-donation-text', settings.tvDonationText || 'Jazakumullahu Khairan atas sumbangan anda.');

  setImage('tv-logo-img', 'tv-logo-placeholder', settings.tvLogoFilePath, '../assets/icons/512x512.png');
  setImage('tv-qr-img', 'tv-qr-placeholder', settings.tvQrFilePath);

  const bgUrl = toFileUrl(settings.tvBackgroundFilePath);
  const bg = byId('tv-bg-image');
  if (bg && bgUrl) {
    bg.style.backgroundImage = `linear-gradient(135deg, rgba(0, 51, 40, 0.78), rgba(0, 25, 22, 0.68)), url("${bgUrl}")`;
  }
}

function prayerEntries(data: PrayerTimeForDate | null): Array<[string, string]> {
  if (!data) return [];
  const entries: Array<[string, string | null]> = [
    ['fajr', data.fajr],
    ['syuruk', data.syuruk],
    ['dhuha', data.dhuha],
    ['dhuhr', data.dhuhr],
    ['asr', data.asr],
    ['maghrib', data.maghrib],
    ['isha', data.isha],
  ];
  return entries.filter((entry): entry is [string, string] => entry[1] !== null);
}

function findNextPrayer(now: Date): { event: string; target: Date } | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayEntries = prayerEntries(todayPrayerState);

  for (const [event, time] of todayEntries) {
    if (masaKeMinit(time) > nowMinutes) {
      const target = new Date(now);
      const [h, m] = time.split(':').map(Number);
      target.setHours(h ?? 0, m ?? 0, 0, 0);
      return { event, target };
    }
  }

  const tomorrowEntries = prayerEntries(tomorrowPrayerState);
  const firstTomorrow = tomorrowEntries[0];
  if (!firstTomorrow) return null;

  const [event, time] = firstTomorrow;
  const target = tambahHari(now, 1);
  const [h, m] = time.split(':').map(Number);
  target.setHours(h ?? 0, m ?? 0, 0, 0);
  return { event, target };
}

function renderPrayerRows(nextEvent: string | null): void {
  const list = byId('tv-prayer-list');
  if (!list) return;

  const entries = prayerEntries(todayPrayerState);
  if (entries.length === 0) {
    list.innerHTML = '<div class="tv-prayer-row"><span></span><span>Tiada data waktu solat</span><span></span></div>';
    return;
  }

  list.innerHTML = entries.map(([event, time]) => {
    const nama = NAMA_WAKTU[event] ?? event;
    const icon = IKON_WAKTU[event] ?? 'schedule';
    const nextClass = event === nextEvent ? ' tv-next' : '';
    return `
      <div class="tv-prayer-row${nextClass}">
        <span class="material-symbols-outlined">${icon}</span>
        <span class="tv-prayer-name">${nama}</span>
        <span class="tv-prayer-time">${format12Jam(time.substring(0, 5))}</span>
      </div>
    `;
  }).join('');
}

function updateClockAndCountdown(): void {
  const now = new Date();
  setText('tv-clock', formatJam(now));
  setText('tv-masihi-date', formatTarikhMasihi(now));

  const next = findNextPrayer(now);
  if (!next) {
    setText('tv-next-prayer', '-');
    setCountdownParts(0, 0, 0);
    renderPrayerRows(null);
    return;
  }

  const remainingSeconds = Math.max(0, Math.floor((next.target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  setText('tv-next-prayer', `Solat ${NAMA_WAKTU[next.event] ?? next.event}`);
  setCountdownParts(hours, minutes, seconds);
  renderPrayerRows(next.event);
}

function setCountdownParts(hours: number, minutes: number, seconds: number): void {
  setText('tv-countdown-hours', String(hours).padStart(2, '0'));
  setText('tv-countdown-minutes', String(minutes).padStart(2, '0'));
  setText('tv-countdown-seconds', String(seconds).padStart(2, '0'));
}

async function loadPrayerForDate(zoneCode: string, dateKey: string): Promise<PrayerTimeForDate | null> {
  let data = await window.myAzan.getPrayerTimesForDate(zoneCode, dateKey);
  if (!data) {
    const sync = await window.myAzan.syncPrayerTimes({ zoneCode, year: new Date(dateKey).getFullYear() });
    if (sync.ok) {
      data = await window.myAzan.getPrayerTimesForDate(zoneCode, dateKey);
    }
  }
  return data;
}

async function loadTvData(): Promise<void> {
  const settings = await window.myAzan.getSettings();
  applySettings(settings);

  if (!settings.activeZoneCode) {
    setText('tv-next-prayer', 'Sila pilih zon di Tetapan');
    renderPrayerRows(null);
    return;
  }

  const today = new Date();
  currentDateKey = tarikhKey(today);
  const tomorrowKey = tarikhKey(tambahHari(today, 1));

  todayPrayerState = await loadPrayerForDate(settings.activeZoneCode, currentDateKey);
  tomorrowPrayerState = await loadPrayerForDate(settings.activeZoneCode, tomorrowKey);

  setText('tv-hijri-date', todayPrayerState?.hijri ?? '-');
  updateClockAndCountdown();
}

function initHiddenExit(): void {
  const exitButton = byId<HTMLButtonElement>('tv-hidden-exit');
  const dialog = byId<HTMLDivElement>('tv-exit-dialog');
  const cancel = byId<HTMLButtonElement>('tv-exit-cancel');
  const confirm = byId<HTMLButtonElement>('tv-exit-confirm');
  if (!exitButton || !dialog || !cancel || !confirm) return;
  exitControlEnabledAt = Date.now() + 1500;

  const clearHold = (): void => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    exitButton.classList.remove('tv-holding');
  };

  exitButton.addEventListener('pointerdown', () => {
    if (Date.now() < exitControlEnabledAt) return;
    clearHold();
    exitButton.classList.add('tv-holding');
    holdTimer = setTimeout(() => {
      clearHold();
      dialog.hidden = false;
    }, 2000);
  });
  exitButton.addEventListener('pointerup', clearHold);
  exitButton.addEventListener('pointerleave', clearHold);

  cancel.addEventListener('click', () => {
    dialog.hidden = true;
  });

  confirm.addEventListener('click', () => {
    window.myAzan.closeTvDisplay().catch((err) => {
      console.error('[paparan-tv] gagal keluar kiosk:', err);
    });
  });
}

function startTicker(): void {
  setInterval(() => {
    const nextDateKey = tarikhKey(new Date());
    if (currentDateKey && nextDateKey !== currentDateKey) {
      loadTvData().catch((err) => {
        console.error('[paparan-tv] gagal refresh harian:', err);
      });
      return;
    }
    updateClockAndCountdown();
  }, 1000);
}

async function main(): Promise<void> {
  initHiddenExit();
  await loadTvData();
  startTicker();
}

main().catch((err) => {
  console.error('[paparan-tv] gagal inisialisasi:', err);
  setText('tv-next-prayer', 'Gagal memuat Paparan TV');
});
