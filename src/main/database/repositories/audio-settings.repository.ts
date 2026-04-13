import { getDatabase } from '../connection';

export interface AudioSettingsRow {
  id: 1;
  azan_subuh_file_path: string | null;
  azan_other_file_path: string | null;
  idle_folder_path: string | null;
  idle_enabled: number;
  idle_resume_mode: string;
  idle_sort_mode: string;
  updated_at: string;
}

export function getAudioSettings(): AudioSettingsRow | undefined {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM audio_settings WHERE id = 1')
    .get() as AudioSettingsRow | undefined;
}

export function saveAudioSettings(
  payload: Partial<Omit<AudioSettingsRow, 'id' | 'updated_at'>>,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const current = getAudioSettings();
  if (!current) {
    // Rekod singleton belum wujud — cipta rekod baru
    db.prepare(
      `INSERT INTO audio_settings
         (id, azan_subuh_file_path, azan_other_file_path, idle_folder_path,
          idle_enabled, idle_resume_mode, idle_sort_mode, updated_at)
       VALUES
         (1, @azan_subuh_file_path, @azan_other_file_path, @idle_folder_path,
          @idle_enabled, @idle_resume_mode, @idle_sort_mode, @updated_at)`,
    ).run({
      azan_subuh_file_path: null,
      azan_other_file_path: null,
      idle_folder_path: null,
      idle_enabled: 0,
      idle_resume_mode: 'restart_playlist',
      idle_sort_mode: 'filename_asc',
      ...payload,
      updated_at: now,
    });
  } else {
    const merged = { ...current, ...payload, updated_at: now };
    db.prepare(
      `UPDATE audio_settings SET
         azan_subuh_file_path = @azan_subuh_file_path,
         azan_other_file_path = @azan_other_file_path,
         idle_folder_path     = @idle_folder_path,
         idle_enabled         = @idle_enabled,
         idle_resume_mode     = @idle_resume_mode,
         idle_sort_mode       = @idle_sort_mode,
         updated_at           = @updated_at
       WHERE id = 1`,
    ).run(merged);
  }
}
