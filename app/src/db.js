import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  normalizeEmail,
  normalizePassword,
  validateEmail,
  validateName,
  validateSignupPassword,
  hashPassword,
  verifyPassword
} from './auth.js';

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

  // Enforce relational foreign-key constraints on every application connection
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}

// Explicit column contract for inquiries queries (used by application queries).
// Setting SCHEMA_CLIENT_EXPECTS_BRANCH_CODE=1 simulates updating the schema/client
// definition to include `branch_code` during the Step 3 drift exercise.
export const INQUIRIES_SELECT_COLUMNS = [
  'id',
  'client_name',
  'phone',
  'garment_type',
  'fabric_choice',
  'fitting_date',
  'status',
  'created_at',
  ...(process.env.SCHEMA_CLIENT_EXPECTS_BRANCH_CODE === '1' ? ['branch_code'] : [])
];

// Prepared statements with bound parameters for safe, SQL-injection-proof queries
export function createInquiry({ clientName, phone, garmentType, fabricChoice, fittingDate }) {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO inquiries (client_name, phone, garment_type, fabric_choice, fitting_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const info = insertStmt.run(clientName, phone, garmentType, fabricChoice, fittingDate);
  const selectStmt = db.prepare(
    `SELECT ${INQUIRIES_SELECT_COLUMNS.join(', ')} FROM inquiries WHERE id = ?`
  );
  const record = selectStmt.get(info.lastInsertRowid);
  return record;
}

export function getAllInquiries() {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT ${INQUIRIES_SELECT_COLUMNS.join(', ')} FROM inquiries ORDER BY id DESC`
  );
  return stmt.all();
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ============================================================================
// USER PERSISTENCE & AUTHENTICATION (Task 4 Step 5)
// ============================================================================

export class DuplicateEmailError extends Error {
  constructor(email) {
    super(`An account with email "${email}" already exists`);
    this.name = 'DuplicateEmailError';
    this.email = email;
    this.code = 'EMAIL_EXISTS';
  }
}

/**
 * Creates a new user record in the users table.
 * - Normalizes email (trims + lowercases).
 * - Trims leading/trailing whitespace on password per assessment policy.
 * - Validates email format, name, and 15-character minimum password length.
 * - Hashes password using Argon2id (RFC 9106 profile).
 * - Strictly assigns the customer role 'client' on the server (never accepts role from form input).
 * - Uses parameterized queries to prevent SQL injection.
 * - Handles duplicate normalized emails via unique constraint enforcement.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.fullName
 * @param {string} [params.phone]
 * @returns {Promise<Object>} Created user record (excluding password hash)
 */
export async function createUser({ email, password, fullName, phone = null }) {
  const normEmail = normalizeEmail(email);
  const trimmedPassword = normalizePassword(password);
  const trimmedName = typeof fullName === 'string' ? fullName.trim() : '';
  const trimmedPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;

  if (!validateEmail(normEmail)) {
    const err = new Error('Invalid email address format');
    err.code = 'INVALID_EMAIL';
    throw err;
  }
  if (!validateName(trimmedName)) {
    const err = new Error('Full name must be at least 2 characters and contain at least one letter');
    err.code = 'INVALID_NAME';
    throw err;
  }
  if (!validateSignupPassword(trimmedPassword)) {
    const err = new Error('Password must be at least 15 characters long');
    err.code = 'INVALID_PASSWORD';
    throw err;
  }

  const passwordHash = await hashPassword(trimmedPassword);
  const db = getDb();
  const createdAt = new Date().toISOString();

  // Server-assigned customer role: 'client'. Privileged roles are NEVER accepted from client input.
  const insertStmt = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, phone, role, created_at)
    VALUES (?, ?, ?, ?, 'client', ?)
  `);

  try {
    const info = insertStmt.run(normEmail, passwordHash, trimmedName, trimmedPhone, createdAt);
    return {
      id: Number(info.lastInsertRowid),
      email: normEmail,
      fullName: trimmedName,
      phone: trimmedPhone,
      role: 'client',
      emailVerifiedAt: null,
      createdAt
    };
  } catch (dbErr) {
    if (
      dbErr.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      (dbErr.message && dbErr.message.includes('UNIQUE constraint failed: users.email'))
    ) {
      throw new DuplicateEmailError(normEmail);
    }
    throw dbErr;
  }
}

/**
 * Finds a user by normalized email address.
 *
 * @param {string} email
 * @returns {Object|null}
 */
export function findUserByEmail(email) {
  const normEmail = normalizeEmail(email);
  if (!normEmail) return null;
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, email, password_hash, full_name, phone, role, email_verified_at, created_at
    FROM users
    WHERE email = ?
  `);
  return stmt.get(normEmail) || null;
}

/**
 * Finds a user by primary key ID.
 *
 * @param {number} id
 * @returns {Object|null} User record without password hash
 */
export function findUserById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, email, full_name, phone, role, email_verified_at, created_at
    FROM users
    WHERE id = ?
  `);
  return stmt.get(id) || null;
}

/**
 * Verifies candidate credentials against stored user records.
 * - Normalizes email.
 * - Trims candidate password per assessment policy.
 * - Compares password against stored Argon2id hash.
 * - Returns sanitized user record on success, or null on failure (preventing account enumeration).
 *
 * @param {string} email
 * @param {string} plainPassword
 * @returns {Promise<Object|null>}
 */
export async function verifyUserCredentials(email, plainPassword) {
  const normEmail = normalizeEmail(email);
  const trimmedPassword = normalizePassword(plainPassword);
  if (!normEmail || !trimmedPassword) {
    return null;
  }

  const user = findUserByEmail(normEmail);
  if (!user) {
    return null;
  }

  const valid = await verifyPassword(user.password_hash, trimmedPassword);
  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at
  };
}


