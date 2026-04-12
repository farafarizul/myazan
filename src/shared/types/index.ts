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
}

export interface PrayerTime {
  id: number;
  zoneCode: string;
  year: number;
  date: string;
  imsak: string;
  fajr: string;
  syuruk: string;
  dhuha: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface Settings {
  activeZone: string;
  idleEnabled: boolean;
  idleFolderPath: string;
  azanSubuhFile: string;
  azanOtherFile: string;
}

export interface NotificationSetting {
  eventName: string;
  enabled: boolean;
  minutesBefore: number;
  audioFilePath: string;
}

export type AudioPriority = 'azan' | 'notification' | 'idle';
