import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const opts = {
    dbPath: process.env.DATABASE_PATH || path.join(__dirname, '../data/nits_cut.db'),
    migrationsDir: process.env.MIGRATIONS_DIR || path.join(__dirname, '../migrations'),
    statusOnly: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--db' && argv[i + 1]) {
      opts.dbPath = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
    } else if (arg === '--dir' && argv[i + 1]) {
      opts.migrationsDir = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
    } else if (arg === '--status') {
      opts.statusOnly = true;
    }
  }

  return opts;
}

function sha256Hex(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function hasTrackingTable(db) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get();
  return Boolean(row);
}

function listSqlFiles(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory does not exist: ${migrationsDir}`);
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function printDatabaseSummary(db, { trackingInitialized = true } = {}) {
  const fkState = db.pragma('foreign_keys', { simple: true });
  const journalMode = db.pragma('journal_mode', { simple: true });
  console.log(`\n[Migrate Summary] journal_mode=${journalMode} | foreign_keys=${fkState}`);

  if (trackingInitialized) {
    const applied = db
      .prepare(
        'SELECT filename, substr(checksum_sha256, 1, 12) AS sha256_prefix, applied_at FROM schema_migrations ORDER BY filename'
      )
      .all();
    console.log(`[Migrate Summary] Recorded migrations in schema_migrations (${applied.length}):`);
    for (const row of applied) {
      console.log(`  - ${row.filename} | sha256:${row.sha256_prefix}... | applied_at=${row.applied_at}`);
    }
  } else {
    console.log('[Migrate Summary] schema_migrations table: absent (tracking not initialized)');
  }

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all();
  console.log(`[Migrate Summary] Application tables (${tables.length}):`);
  for (const { name } of tables) {
    const countRow = db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get();
    console.log(`  - ${name}: ${countRow.count} row(s)`);
  }

  const indexes = db
    .prepare(
      "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY tbl_name, name"
    )
    .all();
  console.log(`[Migrate Summary] Explicit indexes (${indexes.length}):`);
  for (const idx of indexes) {
    console.log(`  - ${idx.name} on ${idx.tbl_name}`);
  }
}

export function inspectMigrationStatus({ dbPath, migrationsDir }) {
  console.log(`[Migrate Status] Mode: READ-ONLY (readonly=true, fileMustExist=true)`);
  console.log(`[Migrate Status] Target database: ${dbPath}`);
  console.log(`[Migrate Status] Migrations directory: ${migrationsDir}`);

  const files = listSqlFiles(migrationsDir);
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  try {
    const trackingInitialized = hasTrackingTable(db);

    if (!trackingInitialized) {
      console.log(
        '[Migrate Status] Tracking table "schema_migrations" is absent — migration tracking has not been initialized.'
      );
      for (const file of files) {
        const fullPath = path.join(migrationsDir, file);
        const checksum = sha256Hex(fs.readFileSync(fullPath, 'utf8'));
        console.log(`[Migrate Status] PENDING: ${file} [sha256:${checksum.slice(0, 12)}]`);
      }
      printDatabaseSummary(db, { trackingInitialized: false });
      return;
    }

    const selectApplied = db.prepare(
      'SELECT filename, checksum_sha256, applied_at FROM schema_migrations WHERE filename = ?'
    );

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const checksum = sha256Hex(fs.readFileSync(fullPath, 'utf8'));
      const existing = selectApplied.get(file);

      if (!existing) {
        console.log(`[Migrate Status] PENDING: ${file} [sha256:${checksum.slice(0, 12)}]`);
        continue;
      }

      if (existing.checksum_sha256 !== checksum) {
        throw new Error(
          `Forward-only violation: migration "${file}" was recorded at ${existing.applied_at} ` +
            `with sha256 ${existing.checksum_sha256.slice(0, 12)}..., but current file has sha256 ${checksum.slice(0, 12)}...`
        );
      }

      console.log(
        `[Migrate Status] APPLIED (at ${existing.applied_at}): ${file} [sha256:${checksum.slice(0, 12)}]`
      );
    }

    printDatabaseSummary(db, { trackingInitialized: true });
  } finally {
    db.close();
  }
}

export function runMigrations({ dbPath, migrationsDir }) {
  const files = listSqlFiles(migrationsDir);

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[Migrate] Target database: ${dbPath}`);
  console.log(`[Migrate] Migrations directory: ${migrationsDir}`);

  const db = new Database(dbPath);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT NOT NULL PRIMARY KEY,
        checksum_sha256 TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const selectApplied = db.prepare(
      'SELECT filename, checksum_sha256, applied_at FROM schema_migrations WHERE filename = ?'
    );
    const insertApplied = db.prepare(
      'INSERT INTO schema_migrations (filename, checksum_sha256, applied_at) VALUES (?, ?, ?)'
    );

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const checksum = sha256Hex(sql);
      const existing = selectApplied.get(file);

      if (existing) {
        if (existing.checksum_sha256 !== checksum) {
          throw new Error(
            `Forward-only violation: migration "${file}" was already applied at ${existing.applied_at} ` +
              `with sha256 ${existing.checksum_sha256.slice(0, 12)}..., but current file has sha256 ${checksum.slice(0, 12)}... ` +
              `Never edit a migration that has already run; create a new forward migration instead.`
          );
        }
        console.log(
          `[Migrate] SKIP (already applied at ${existing.applied_at}): ${file} [sha256:${checksum.slice(0, 12)}]`
        );
        continue;
      }

      console.log(`[Migrate] APPLYING: ${file} [sha256:${checksum.slice(0, 12)}]...`);
      const nowIso = new Date().toISOString();

      const applySingleMigration = db.transaction(() => {
        db.exec(sql);
        const fkViolations = db.pragma('foreign_key_check');
        if (fkViolations.length > 0) {
          throw new Error(
            `Foreign key violation detected during migration ${file}: ${JSON.stringify(fkViolations)}`
          );
        }
        insertApplied.run(file, checksum, nowIso);
      });

      applySingleMigration();
      console.log(`[Migrate] APPLIED: ${file} at ${nowIso}`);
    }

    printDatabaseSummary(db, { trackingInitialized: true });
  } finally {
    db.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const opts = parseArgs(process.argv.slice(2));
  try {
    if (opts.statusOnly) {
      inspectMigrationStatus(opts);
    } else {
      runMigrations(opts);
    }
  } catch (err) {
    console.error(`\n[Migrate ERROR] ${err.code ? `${err.code}: ` : ''}${err.message}`);
    process.exit(1);
  }
}
