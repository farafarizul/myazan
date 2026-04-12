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
