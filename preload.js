'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const Adhan = require('adhan');

/* ── Malaysian prayer parameters ─────────────────────────── */
function getMalaysiaParams() {
  const params = Adhan.CalculationMethod.UmmAlQura();
  params.fajrAngle = 20;
  params.ishaAngle = 18;
  params.madhab = Adhan.Madhab.Shafi;
  return params;
}

contextBridge.exposeInMainWorld('electronAPI', {
  /** Compute prayer times for a given location and date.
   *  Returns plain objects (no class instances) so they cross the bridge. */
  computePrayerTimes: (lat, lng, dateMs) => {
    const date   = new Date(dateMs);
    const coords = new Adhan.Coordinates(lat, lng);
    const pt     = new Adhan.PrayerTimes(coords, date, getMalaysiaParams());
    return {
      fajr:    pt.fajr    ? pt.fajr.getTime()    : null,
      sunrise: pt.sunrise ? pt.sunrise.getTime() : null,
      dhuhr:   pt.dhuhr   ? pt.dhuhr.getTime()   : null,
      asr:     pt.asr     ? pt.asr.getTime()      : null,
      maghrib: pt.maghrib ? pt.maghrib.getTime()  : null,
      isha:    pt.isha     ? pt.isha.getTime()     : null,
    };
  },

  sendPrayerNotification: (title, body) => {
    ipcRenderer.send('prayer-notification', { title, body });
  },

  updateTrayTooltip: (tooltip) => {
    ipcRenderer.send('update-tray-tooltip', tooltip);
  },
});

