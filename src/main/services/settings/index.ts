import fs from 'fs';
import { app } from 'electron';
import {
  getActiveZoneCode,
  setActiveZoneCode,
  getAudioSettings,
  saveAudioSettings,
  getAllNotificationSettings,
  saveNotificationSetting,
  getSetting,
  setSetting,
} from '../../database';
import type { AppSettings, SaveSettingsPayload, NotificationSetting } from '../../../shared/types';

// ============================================================
// Pembantu pengesahan laluan
// ============================================================

/** Pulangkan true jika laluan menunjuk ke fail yang wujud. */
function isValidFilePath(filePath: string | null | undefined): boolean {
  if (!filePath) return true; // null/undefined dianggap dibenarkan (reset)
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** Pulangkan true jika laluan menunjuk ke folder yang wujud. */
function isValidFolderPath(folderPath: string | null | undefined): boolean {
  if (!folderPath) return true; // null/undefined dianggap dibenarkan (reset)
  try {
    return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}

// ============================================================
// Baca tetapan
// ============================================================

/**
 * Baca semua tetapan aplikasi daripada database dan pulangkan sebagai objek terpadu.
 */
export function getSettings(): AppSettings {
  const audio = getAudioSettings();
  const notifications = getAllNotificationSettings();

  const notificationSettings: NotificationSetting[] = notifications.map((n) => ({
    eventName: n.event_name,
    enabled: n.enabled === 1,
    minutesBefore: n.minutes_before,
    audioFilePath: n.audio_file_path,
    volume: n.volume,
  }));

  return {
    activeZoneCode: getActiveZoneCode(),
    azanSubuhFilePath: audio?.azan_subuh_file_path ?? null,
    azanOtherFilePath: audio?.azan_other_file_path ?? null,
    idleFolderPath: audio?.idle_folder_path ?? null,
    idleEnabled: (audio?.idle_enabled ?? 0) === 1,
    azanVolume: audio?.azan_volume ?? 100,
    notificationVolume: audio?.notification_volume ?? 100,
    idleVolume: audio?.idle_volume ?? 100,
    notificationSettings,
    launchOnStartup: getSetting('launch_on_startup') !== 'false',
  };
}

// ============================================================
// Tulis tetapan
// ============================================================

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsValidationError';
  }
}

/** Pastikan nilai kelantangan berada dalam julat 0–100. */
function clampVolume(value: number | undefined): number {
  if (value === undefined || isNaN(value)) return 100;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Simpan mana-mana subset tetapan aplikasi.
 * Melempar SettingsValidationError jika laluan fail/folder tidak sah.
 */
export function saveSettings(payload: SaveSettingsPayload): void {
  // Pengesahan laluan fail
  if ('azanSubuhFilePath' in payload && !isValidFilePath(payload.azanSubuhFilePath)) {
    throw new SettingsValidationError(
      `Fail azan Subuh tidak ditemui: ${payload.azanSubuhFilePath}`,
    );
  }
  if ('azanOtherFilePath' in payload && !isValidFilePath(payload.azanOtherFilePath)) {
    throw new SettingsValidationError(
      `Fail azan selain Subuh tidak ditemui: ${payload.azanOtherFilePath}`,
    );
  }
  if ('idleFolderPath' in payload && !isValidFolderPath(payload.idleFolderPath)) {
    throw new SettingsValidationError(
      `Folder audio idle tidak ditemui: ${payload.idleFolderPath}`,
    );
  }

  // Simpan active_zone_code
  if ('activeZoneCode' in payload) {
    if (payload.activeZoneCode !== undefined) {
      if (payload.activeZoneCode === null) {
        setActiveZoneCode('');
      } else {
        setActiveZoneCode(payload.activeZoneCode);
      }
    }
  }

  // Simpan tetapan audio
  const audioUpdate: Record<string, unknown> = {};
  if ('azanSubuhFilePath' in payload)
    audioUpdate['azan_subuh_file_path'] = payload.azanSubuhFilePath ?? null;
  if ('azanOtherFilePath' in payload)
    audioUpdate['azan_other_file_path'] = payload.azanOtherFilePath ?? null;
  if ('idleFolderPath' in payload)
    audioUpdate['idle_folder_path'] = payload.idleFolderPath ?? null;
  if ('idleEnabled' in payload)
    audioUpdate['idle_enabled'] = payload.idleEnabled ? 1 : 0;
  if ('azanVolume' in payload)
    audioUpdate['azan_volume'] = clampVolume(payload.azanVolume);
  if ('notificationVolume' in payload)
    audioUpdate['notification_volume'] = clampVolume(payload.notificationVolume);
  if ('idleVolume' in payload)
    audioUpdate['idle_volume'] = clampVolume(payload.idleVolume);

  if (Object.keys(audioUpdate).length > 0) {
    saveAudioSettings(audioUpdate as Parameters<typeof saveAudioSettings>[0]);
  }

  // Simpan tetapan notifikasi
  if (payload.notificationSettings && payload.notificationSettings.length > 0) {
    for (const ns of payload.notificationSettings) {
      saveNotificationSetting(ns.eventName, {
        enabled: ns.enabled ? 1 : 0,
        minutes_before: ns.minutesBefore,
        audio_file_path: ns.audioFilePath,
        volume: ns.volume,
      });
    }
  }

  // Simpan dan pakai tetapan "buka pada startup"
  if ('launchOnStartup' in payload && payload.launchOnStartup !== undefined) {
    const enabled = payload.launchOnStartup;
    setSetting('launch_on_startup', enabled ? 'true' : 'false', 'boolean');
    app.setLoginItemSettings({ openAtLogin: enabled });
  }
}

export { getActiveZoneCode, setActiveZoneCode };
