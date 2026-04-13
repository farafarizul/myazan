/**
 * Jenis data dikongsi antara main process dan renderer melalui IPC.
 * Jangan import Electron API dalam fail ini.
 */

export interface AppInfo {
  name: string;
  version: string;
  author: string;
  email: string;
  phone: string;
  objective: string;
  license: string;
}

export interface Zone {
  code: string;
  stateName: string;
  zoneName: string;
  sortOrder: number;
}

export interface PrayerTime {
  id: number;
  zoneCode: string;
  year: number;
  date: string;
  hijri: string | null;
  dayLabel: string | null;
  imsak: string | null;
  fajr: string;
  syuruk: string | null;
  dhuha: string | null;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  source: string;
}

export interface AudioSettings {
  azanSubuhFilePath: string | null;
  azanOtherFilePath: string | null;
  idleFolderPath: string | null;
  idleEnabled: boolean;
  idleResumeMode: 'restart_playlist' | 'restart_track' | 'resume_track';
  idleSortMode: 'filename_asc';
}

export interface NotificationSetting {
  eventName: string;
  enabled: boolean;
  minutesBefore: number;
  audioFilePath: string | null;
  volume: number | null;
}

export type AudioPriority = 'azan' | 'notification' | 'idle';

/**
 * Tetapan aplikasi yang dikongsi antara main process dan renderer.
 * Menggabungkan app_settings, audio_settings, dan notifikasi asas.
 */
export interface AppSettings {
  /** Kod zon JAKIM yang dipilih pengguna, e.g. 'WLY01'. */
  activeZoneCode: string | null;
  /** Laluan fail MP3 azan Subuh. */
  azanSubuhFilePath: string | null;
  /** Laluan fail MP3 azan selain Subuh. */
  azanOtherFilePath: string | null;
  /** Laluan folder MP3 idle (al-Quran / zikir). */
  idleFolderPath: string | null;
  /** Sama ada audio idle diaktifkan. */
  idleEnabled: boolean;
  /** Tetapan notifikasi untuk setiap waktu solat. */
  notificationSettings: NotificationSetting[];
}

/**
 * Payload untuk IPC SYNC_PRAYER_TIMES — zon dan tahun yang ingin disync.
 */
export interface SyncPrayerTimesPayload {
  zoneCode: string;
  year?: number; // jika tidak diberikan, gunakan tahun semasa
}

/**
 * Keputusan operasi sync waktu solat.
 */
export interface SyncResult {
  ok: boolean;
  /** Mesej ralat jika ok === false */
  error?: string;
}

/**
 * Waktu solat untuk satu tarikh, dikembalikan melalui IPC.
 */
export interface PrayerTimeForDate {
  zoneCode: string;
  date: string;
  hijri: string | null;
  dayLabel: string | null;
  imsak: string | null;
  fajr: string;
  syuruk: string | null;
  dhuha: string | null;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}
export interface SaveSettingsPayload {
  activeZoneCode?: string | null;
  azanSubuhFilePath?: string | null;
  azanOtherFilePath?: string | null;
  idleFolderPath?: string | null;
  idleEnabled?: boolean;
  notificationSettings?: NotificationSetting[];
}
