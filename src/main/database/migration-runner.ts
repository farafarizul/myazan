import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';

interface MigrationRow {
  version: string;
  applied_at: string;
}

/**
 * Pastikan jadual schema_migrations wujud sebelum runner dijalankan.
 */
function ensureMigrationsTable(): void {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      version    TEXT    NOT NULL UNIQUE,
      applied_at TEXT    NOT NULL
    )
  `);
}

/**
 * Dapatkan senarai versi migrasi yang telah dijalankan.
 */
function getAppliedVersions(): Set<string> {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT version FROM schema_migrations ORDER BY id ASC')
    .all() as MigrationRow[];
  return new Set(rows.map((r) => r.version));
}

/**
 * Jalankan semua fail migrasi SQL yang belum dijalankan mengikut susunan nama fail.
 * Fail migrasi perlu mengikut format: `NNN_nama.sql`
 */
export function runMigrations(): void {
  ensureMigrationsTable();

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn('[migration] Direktori migrations tidak dijumpai:', migrationsDir);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = getAppliedVersions();
  const db = getDatabase();

  for (const file of files) {
    const version = path.basename(file, '.sql');

    if (applied.has(version)) {
      console.log(`[migration] Langkau (sudah dijalankan): ${version}`);
      continue;
    }

    const sqlPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`[migration] Menjalankan: ${version}`);

    // Jalankan keseluruhan fail SQL dan rekod versi dalam satu transaksi
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      ).run(version, new Date().toISOString());
    });

    applyMigration();
    console.log(`[migration] Berjaya: ${version}`);
  }

  console.log('[migration] Semua migrasi selesai.');
}
