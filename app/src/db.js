import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/nits_cut.db');

  // Ensure parent directory exists if using standard local file
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[Database] Connecting to SQLite database at: ${dbPath}`);
  dbInstance = new Database(dbPath, {
    verbose: process.env.NODE_ENV !== 'production' ? (msg) => console.log(`[SQL] ${msg}`) : null
  });

  // Optimize concurrent reads with Write-Ahead Logging
  dbInstance.pragma('journal_mode = WAL');

  // Execute versioned migration files in order
  const migrationsDir = path.join(__dirname, '../migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`[Database] Running migration: ${file}`);
      dbInstance.exec(sql);
    }
  }

  return dbInstance;
}

// Prepared statements with bound parameters for safe, SQL-injection-proof queries
export function createInquiry({ clientName, phone, garmentType, fabricChoice, fittingDate }) {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO inquiries (client_name, phone, garment_type, fabric_choice, fitting_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const info = insertStmt.run(clientName, phone, garmentType, fabricChoice, fittingDate);
  const selectStmt = db.prepare('SELECT * FROM inquiries WHERE id = ?');
  const record = selectStmt.get(info.lastInsertRowid);
  return record;
}

export function getAllInquiries() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM inquiries ORDER BY id DESC');
  return stmt.all();
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

