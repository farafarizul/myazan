import fs from 'fs';
import path from 'path';

/** Satu sumber untuk senarai UI dan enjin: MP3 sahaja, tanpa subfolder. */
export function readIdlePlaylist(folderPath: string | null): string[] {
  if (!folderPath) return [];
  try {
    return fs.readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'ms-MY', { numeric: true, sensitivity: 'base' }))
      .map((name) => path.join(folderPath, name));
  } catch {
    return [];
  }
}
