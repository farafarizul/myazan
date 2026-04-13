import EventEmitter from 'events';
import { PRAYER_EVENTS } from '../../../shared/constants';
import type { PrayerEvent } from '../../../shared/constants';
import {
  getAllNotificationSettings,
  hasTriggered,
  insertTriggerLog,
  clearOldTriggerLogs,
} from '../../database';
import type { PrayerTimeRow } from '../../database';
import type { TriggerType } from '../../database/repositories/trigger-log.repository';
import { getActiveZoneCode } from '../settings';
import { getPrayerTimesForDate, syncPrayerTimesForZone, PrayerTimeSyncError } from '../prayer-time';

// ============================================================
// Types
// ============================================================

/** Event yang dihantar apabila scheduler menentukan sesuatu trigger perlu dicetuskan. */
export interface SchedulerEvent {
  /** Tarikh trigger dalam format YYYY-MM-DD. */
  date: string;
  /** Kod zon JAKIM aktif, contoh: 'WLY01'. */
  zoneCode: string;
  /** Nama event, contoh: 'fajr', 'maghrib'. */
  eventName: PrayerEvent;
  /** Jenis trigger: 'azan' atau 'notification'. */
  triggerType: TriggerType;
  /** Masa trigger yang dijadualkan dalam format HH:mm. */
  scheduledTime: string;
}

// ============================================================
// Constants
// ============================================================

/** Selang antara setiap semakan masa dalam milisaat. */
const TICK_INTERVAL_MS = 10_000; // 10 saat

/**
 * Tetingkap toleransi dalam saat.
 * Trigger dianggap sah jika masa semasa berada antara
 * [scheduledTime, scheduledTime + TRIGGER_TOLERANCE_SECS].
 */
const TRIGGER_TOLERANCE_SECS = 30;

/** Bilangan hari untuk menyimpan trigger_log sebelum dipadam. */
const LOG_RETENTION_DAYS = 90;

/**
 * Event-event ini layak untuk trigger azan.
 * imsak, syuruk, dan dhuha tidak mempunyai azan.
 */
const AZAN_EVENTS = new Set<PrayerEvent>(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

// ============================================================
// State dalaman
// ============================================================

let tickTimer: ReturnType<typeof setInterval> | null = null;
let currentDate = ''; // YYYY-MM-DD, dijejak untuk tangani pertukaran hari

/** EventEmitter dalaman — digunakan oleh audio engine untuk melanggan trigger. */
const emitter = new EventEmitter();

// ============================================================
// API awam
// ============================================================

/**
 * Mulakan scheduler.
 * Hanya satu instance dibenarkan berjalan pada satu masa.
 * Tick pertama dijalankan serta-merta selepas dipanggil.
 */
export function startScheduler(): void {
  if (tickTimer !== null) {
    console.warn('[scheduler] Scheduler sudah berjalan — panggilan diabaikan.');
    return;
  }

  currentDate = '';
  console.log('[scheduler] Dimulakan.');

  // Jalankan tick pertama serta-merta, kemudian ulang pada setiap selang
  void tick();
  tickTimer = setInterval(() => void tick(), TICK_INTERVAL_MS);
}

/**
 * Hentikan scheduler dan bersihkan timer.
 */
export function stopScheduler(): void {
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
    console.log('[scheduler] Dihentikan.');
  }
}

/**
 * Daftar pendengar untuk trigger event daripada scheduler.
 * Digunakan oleh audio engine (Fasa 4) untuk bertindak balas.
 *
 * @returns Fungsi untuk menyah-daftar pendengar.
 */
export function onSchedulerTrigger(
  listener: (event: SchedulerEvent) => void,
): () => void {
  emitter.on('trigger', listener);
  return () => emitter.off('trigger', listener);
}

// ============================================================
// Logik tick dalaman
// ============================================================

async function tick(): Promise<void> {
  try {
    const now = new Date();
    const todayDate = formatDate(now);

    // Tangani pertukaran hari
    if (todayDate !== currentDate) {
      currentDate = todayDate;
      await onDayChange(todayDate);
    }

    const zoneCode = getActiveZoneCode();
    if (!zoneCode) return;

    const prayerTimes = getPrayerTimesForDate(zoneCode, todayDate);
    if (!prayerTimes) {
      console.warn(
        `[scheduler] Tiada data waktu solat untuk ${zoneCode}/${todayDate} — tunggu sync.`,
      );
      return;
    }

    const notificationSettings = getAllNotificationSettings();

    for (const eventName of PRAYER_EVENTS) {
      const prayerTimeHHMM = getPrayerTimeField(prayerTimes, eventName);
      if (!prayerTimeHHMM) continue;

      // Semak trigger azan (pada waktu tepat)
      if (AZAN_EVENTS.has(eventName)) {
        checkAndTrigger({
          now,
          todayDate,
          zoneCode,
          eventName,
          scheduledHHMM: prayerTimeHHMM,
          triggerType: 'azan',
        });
      }

      // Semak trigger notifikasi (sebelum waktu)
      const notifSetting = notificationSettings.find((n) => n.event_name === eventName);
      if (notifSetting && notifSetting.enabled === 1 && notifSetting.minutes_before > 0) {
        const notifHHMM = subtractMinutes(prayerTimeHHMM, notifSetting.minutes_before);
        if (notifHHMM) {
          checkAndTrigger({
            now,
            todayDate,
            zoneCode,
            eventName,
            scheduledHHMM: notifHHMM,
            triggerType: 'notification',
          });
        }
      }
    }
  } catch (err) {
    console.error('[scheduler] Ralat semasa tick:', err);
  }
}

// ============================================================
// Trigger
// ============================================================

interface TriggerCheckParams {
  now: Date;
  todayDate: string;
  zoneCode: string;
  eventName: PrayerEvent;
  scheduledHHMM: string;
  triggerType: TriggerType;
}

/**
 * Semak syarat trigger dan cetuskan event jika perlu.
 * Elakkan trigger berganda dengan menyemak trigger_log.
 */
function checkAndTrigger(params: TriggerCheckParams): void {
  const { now, todayDate, zoneCode, eventName, scheduledHHMM, triggerType } = params;

  // Hanya trigger jika masa semasa berada dalam tetingkap
  if (!isWithinTriggerWindow(scheduledHHMM, now, TRIGGER_TOLERANCE_SECS)) return;

  // Elakkan trigger berganda untuk event yang sama pada hari yang sama
  if (hasTriggered(todayDate, zoneCode, eventName, triggerType)) return;

  // Rekod dalam trigger_log (INSERT OR IGNORE — selamat jika ada race condition)
  insertTriggerLog({
    date: todayDate,
    zone_code: zoneCode,
    event_name: eventName,
    trigger_type: triggerType,
    scheduled_time: scheduledHHMM,
    triggered_at: now.toISOString(),
    status: 'played',
    message: null,
  });

  const event: SchedulerEvent = {
    date: todayDate,
    zoneCode,
    eventName,
    triggerType,
    scheduledTime: scheduledHHMM,
  };

  console.log(
    `[scheduler] Trigger: ${triggerType} — ${eventName} @ ${scheduledHHMM} (${todayDate}, ${zoneCode})`,
  );

  emitter.emit('trigger', event);
}

// ============================================================
// Pertukaran hari & tahun
// ============================================================

/**
 * Dipanggil sekali setiap kali tarikh bertukar.
 * Menguruskan sync data waktu solat (termasuk pertukaran tahun)
 * dan pembersihan log lama.
 */
async function onDayChange(todayDate: string): Promise<void> {
  console.log(`[scheduler] Pertukaran hari: ${todayDate}`);

  const zoneCode = getActiveZoneCode();
  if (!zoneCode) return;

  // Sync data waktu solat — tangani pertukaran tahun dan pra-muat tahun berikutnya
  try {
    await syncPrayerTimesForZone(zoneCode);
  } catch (err) {
    if (err instanceof PrayerTimeSyncError) {
      console.warn(`[scheduler] Amaran sync data waktu solat: ${err.message}`);
    } else {
      console.error('[scheduler] Ralat tidak dijangka semasa sync waktu solat:', err);
    }
  }

  // Bersihkan rekod trigger_log lama
  const cutoffDate = subtractDays(todayDate, LOG_RETENTION_DAYS);
  const deleted = clearOldTriggerLogs(cutoffDate);
  if (deleted > 0) {
    console.log(
      `[scheduler] Padam ${deleted} rekod trigger_log lama (sebelum ${cutoffDate}).`,
    );
  }
}

// ============================================================
// Pembantu masa
// ============================================================

/**
 * Semak sama ada masa semasa berada dalam tetingkap trigger.
 * Tetingkap: [scheduledHHMM, scheduledHHMM + toleranceSecs]
 */
function isWithinTriggerWindow(
  scheduledHHMM: string,
  now: Date,
  toleranceSecs: number,
): boolean {
  const scheduledSecs = hhmmToSeconds(scheduledHHMM);
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return nowSecs >= scheduledSecs && nowSecs <= scheduledSecs + toleranceSecs;
}

/** Tukar HH:mm ke bilangan saat dari tengah malam. */
function hhmmToSeconds(hhmm: string): number {
  const parts = hhmm.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return h * 3600 + m * 60;
}

/**
 * Tolak bilangan minit dari masa HH:mm.
 * Pulangkan null jika keputusan jatuh sebelum tengah malam (tidak sah).
 */
function subtractMinutes(hhmm: string, minutes: number): string | null {
  if (!hhmm || minutes <= 0) return null;
  const totalSecs = hhmmToSeconds(hhmm) - minutes * 60;
  if (totalSecs < 0) return null;
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format objek Date ke string YYYY-MM-DD menggunakan waktu tempatan. */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Tolak bilangan hari dari tarikh YYYY-MM-DD dan pulangkan tarikh baharu. */
function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

// ============================================================
// Pembantu akses medan prayer_times
// ============================================================

/**
 * Dapatkan nilai masa (HH:mm) untuk event tertentu daripada rekod prayer_times.
 */
function getPrayerTimeField(row: PrayerTimeRow, event: PrayerEvent): string | null {
  switch (event) {
    case 'imsak':   return row.imsak;
    case 'fajr':    return row.fajr;
    case 'syuruk':  return row.syuruk;
    case 'dhuha':   return row.dhuha;
    case 'dhuhr':   return row.dhuhr;
    case 'asr':     return row.asr;
    case 'maghrib': return row.maghrib;
    case 'isha':    return row.isha;
    default:        return null;
  }
}
