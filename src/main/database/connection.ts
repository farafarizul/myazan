import BetterSqlite3, { Database } from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database | null = null;

/**
 * Kembalikan laluan fail database berdasarkan userData Electron.
 * Pada mod pembangunan, ia menggunakan direktori data pengguna Electron.
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'myazan.db');
}

/**
 * Buka atau kembalikan sambungan database sedia ada.
 * Sambungan dikongsi (singleton) sepanjang hayat aplikasi.
 */
export function openDatabase(): Database {
  if (db) return db;

  const dbPath = getDatabasePath();
  console.log(`[db] Membuka database: ${dbPath}`);

  db = new BetterSqlite3(dbPath, {
    verbose:
      process.env['NODE_ENV'] === 'development'
        ? (msg: unknown): void => console.log('[db-query]', msg)
        : undefined,
  });

  // Aktifkan WAL mode untuk prestasi yang lebih baik
  db.pragma('journal_mode = WAL');
  // Aktifkan foreign key enforcement
  db.pragma('foreign_keys = ON');

  console.log('[db] Sambungan berjaya dibuka.');
  return db;
}

/**
 * Tutup sambungan database dengan selamat.
 * Harus dipanggil semasa app quit.
 */
export function closeDatabase(): void {
  if (db && db.open) {
    db.close();
    db = null;
    console.log('[db] Sambungan ditutup.');
  }
}

/**
 * Kembalikan sambungan aktif.
 * Lempar ralat jika belum dibuka.
 */
export function getDatabase(): Database {
  if (!db || !db.open) {
    throw new Error('[db] Database belum dibuka. Panggil openDatabase() dahulu.');
  }
  return db;
}
