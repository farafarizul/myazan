export const APP_NAME = 'myAzan';
export const APP_VERSION = '0.1.0';
export const APP_AUTHOR = 'Fara Farizul';
export const APP_EMAIL = 'farxpeace@gmail.com';
export const APP_PHONE = '+60137974467';

export const JAKIM_API_BASE =
  'https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat';

/** Saluran IPC yang dibenarkan antara preload dan main process. */
export const IPC_CHANNELS = {
  GET_APP_INFO: 'get-app-info',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_ZONES: 'get-zones',
  SET_ACTIVE_ZONE: 'set-active-zone',
  SELECT_AUDIO_FILE: 'select-audio-file',
  SELECT_AUDIO_FOLDER: 'select-audio-folder',
  GET_PLAYBACK_STATUS: 'get-playback-status',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export const PRAYER_EVENTS = [
  'imsak',
  'fajr',
  'syuruk',
  'dhuha',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
] as const;

export type PrayerEvent = (typeof PRAYER_EVENTS)[number];
