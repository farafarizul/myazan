'use strict';

/* ── Prayer times are computed in preload.js (Node context) via
      window.electronAPI.computePrayerTimes(lat, lng, dateMs)
      which returns plain timestamp objects across the context bridge. ── */

/* ── Malaysian Malay prayer names ─────────────────────────── */
const PRAYER_NAMES = {
  fajr:    'Subuh',
  sunrise: 'Syuruk',
  dhuhr:   'Zohor',
  asr:     'Asar',
  maghrib: 'Maghrib',
  isha:    'Isyak',
};

const PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/* ── DOM refs ──────────────────────────────────────────────── */
const clockEl          = document.getElementById('current-time');
const dateEl           = document.getElementById('current-date');
const hijriEl          = document.getElementById('hijri-date');
const zoneSelect       = document.getElementById('zone-select');
const currentPrayerEl  = document.getElementById('current-prayer-name');
const currentTimeEl    = document.getElementById('current-prayer-time');
const nextPrayerEl     = document.getElementById('next-prayer-name');
const countdownEl      = document.getElementById('countdown');
const footerZoneEl     = document.getElementById('footer-zone');
const footerYearEl     = document.getElementById('footer-year');

footerYearEl.textContent = new Date().getFullYear();

/* ── State ─────────────────────────────────────────────────── */
let prayerTimes        = null;
let lastNotifiedPrayer = null;

/* ── Helpers ───────────────────────────────────────────────── */
function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime(date) {
  if (!date || isNaN(date.getTime())) return '--:--';
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${pad2(h12)}:${pad2(m)} ${ampm}`;
}

function toHijri(date) {
  // Simple Hijri approximation using Intl if available, fallback to empty
  try {
    const intlDate = new Intl.DateTimeFormat('ms-MY-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    return intlDate;
  } catch {
    return '';
  }
}

/* ── Selected zone coordinates ─────────────────────────────── */
function getSelectedCoords() {
  const opt = zoneSelect.options[zoneSelect.selectedIndex];
  const lat = parseFloat(opt.dataset.lat);
  const lng = parseFloat(opt.dataset.lng);
  return { lat, lng };
}

/* ── Calculate prayer times for today ──────────────────────── */
function computePrayerTimes(date) {
  const { lat, lng } = getSelectedCoords();
  const raw = window.electronAPI.computePrayerTimes(lat, lng, date.getTime());
  // Convert millisecond timestamps back to Date objects
  prayerTimes = {};
  for (const key of Object.keys(raw)) {
    prayerTimes[key] = raw[key] !== null ? new Date(raw[key]) : null;
  }
  return prayerTimes;
}

/* ── Update prayer table ────────────────────────────────────── */
function updateTable(pt) {
  document.getElementById('time-fajr').textContent    = formatTime(pt.fajr);
  document.getElementById('time-sunrise').textContent = formatTime(pt.sunrise);
  document.getElementById('time-dhuhr').textContent   = formatTime(pt.dhuhr);
  document.getElementById('time-asr').textContent     = formatTime(pt.asr);
  document.getElementById('time-maghrib').textContent = formatTime(pt.maghrib);
  document.getElementById('time-isha').textContent    = formatTime(pt.isha);
}

/* ── Highlight active row ───────────────────────────────────── */
function highlightRow(prayerKey) {
  const rowMap = {
    fajr:    0,
    sunrise: 1,
    dhuhr:   2,
    asr:     3,
    maghrib: 4,
    isha:    5,
  };
  const rows = document.querySelectorAll('#prayer-tbody tr');
  rows.forEach((r) => r.classList.remove('active-prayer'));
  if (prayerKey !== null && rowMap[prayerKey] !== undefined) {
    rows[rowMap[prayerKey]].classList.add('active-prayer');
  }
}

/* ── Determine current and next prayer ─────────────────────── */
function getCurrentAndNext(pt, now) {
  const times = {
    fajr:    pt.fajr,
    sunrise: pt.sunrise,
    dhuhr:   pt.dhuhr,
    asr:     pt.asr,
    maghrib: pt.maghrib,
    isha:    pt.isha,
  };

  let currentKey = null;
  let nextKey    = null;
  let nextTime   = null;

  // Find the latest prayer that has already started
  for (let i = PRAYER_IDS.length - 1; i >= 0; i--) {
    const key = PRAYER_IDS[i];
    if (times[key] && now >= times[key]) {
      currentKey = key;
      break;
    }
  }

  // Next prayer is the first one strictly in the future (today)
  for (let i = 0; i < PRAYER_IDS.length; i++) {
    const key = PRAYER_IDS[i];
    if (times[key] && now < times[key]) {
      nextKey  = key;
      nextTime = times[key];
      break;
    }
  }

  // If no next prayer today, show tomorrow's Fajr
  if (!nextKey) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { lat, lng } = getSelectedCoords();
    const rawTomorrow = window.electronAPI.computePrayerTimes(lat, lng, tomorrow.getTime());
    if (rawTomorrow && rawTomorrow.fajr !== null) {
      nextKey  = 'fajr';
      nextTime = new Date(rawTomorrow.fajr);
    }
  }

  return { currentKey, nextKey, nextTime, times };
}

/* ── Countdown string ───────────────────────────────────────── */
function buildCountdown(targetDate, now) {
  const diffMs = targetDate - now;
  if (diffMs <= 0) return '00:00:00';
  const totalSecs = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/* ── Send desktop notification ──────────────────────────────── */
function maybeNotify(prayerKey) {
  if (!window.electronAPI) return;
  if (prayerKey && prayerKey !== lastNotifiedPrayer) {
    lastNotifiedPrayer = prayerKey;
    if (prayerKey !== 'sunrise') {
      window.electronAPI.sendPrayerNotification(
        `Waktu ${PRAYER_NAMES[prayerKey]} Telah Masuk`,
        'Marilah kita menunaikan solat.'
      );
    }
  }
}

/* ── Main tick function (called every second) ───────────────── */
function tick() {
  const now = new Date();

  // ── Clock & date
  clockEl.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  dateEl.textContent  = now.toLocaleDateString('ms-MY', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  hijriEl.textContent = toHijri(now);

  // ── Recompute once per minute (or first run)
  const prayerTimeCacheKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  if (tick._lastCacheKey !== prayerTimeCacheKey || !prayerTimes) {
    tick._lastCacheKey = prayerTimeCacheKey;
    const pt = computePrayerTimes(now);
    updateTable(pt);
  }

  const { currentKey, nextKey, nextTime, times } = getCurrentAndNext(prayerTimes, now);

  // ── Current prayer
  if (currentKey) {
    currentPrayerEl.textContent = PRAYER_NAMES[currentKey];
    currentTimeEl.textContent   = formatTime(times[currentKey]);
    highlightRow(currentKey);
    maybeNotify(currentKey);
  } else {
    currentPrayerEl.textContent = '---';
    currentTimeEl.textContent   = '--:--';
    highlightRow(null);
  }

  // ── Next prayer & countdown
  if (nextKey && nextTime) {
    nextPrayerEl.textContent = PRAYER_NAMES[nextKey];
    countdownEl.textContent  = buildCountdown(nextTime, now);
    if (window.electronAPI) {
      window.electronAPI.updateTrayTooltip(
        `Azan Malaysia — ${PRAYER_NAMES[nextKey]} dalam ${buildCountdown(nextTime, now)}`
      );
    }
  } else {
    nextPrayerEl.textContent = '---';
    countdownEl.textContent  = '--:--:--';
  }
}

/* ── Zone change ────────────────────────────────────────────── */
zoneSelect.addEventListener('change', () => {
  prayerTimes = null; // force recompute
  lastNotifiedPrayer = null;
  const opt = zoneSelect.options[zoneSelect.selectedIndex];
  footerZoneEl.textContent = opt.value;
  tick();
});

/* ── Bootstrap ──────────────────────────────────────────────── */
footerZoneEl.textContent = zoneSelect.value;
tick();
setInterval(tick, 1000);
