import crypto from 'node:crypto';
import { getDb } from './db.js';
import { normalizeEmail } from './auth.js';

export const PURPOSE_EMAIL_VERIFICATION = 'email_verification';
export const EXPIRY_MINUTES = 10;
export const MAX_FAILED_TRIES = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export const MIN_HMAC_SECRET_LENGTH = 32;

export class VerificationConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VerificationConfigError';
    this.code = 'MISSING_VERIFICATION_SECRET';
  }
}

/**
 * Validates that VERIFICATION_HMAC_SECRET is configured with sufficient length (>= 32 chars).
 * Throws VerificationConfigError if missing or too short; never uses a hardcoded fallback.
 *
 * @returns {string}
 */
export function assertVerificationSecretConfigured() {
  const secret = (process.env.VERIFICATION_HMAC_SECRET || '').trim();
  if (secret.length < MIN_HMAC_SECRET_LENGTH) {
    throw new VerificationConfigError(
      `VERIFICATION_HMAC_SECRET must be configured with at least ${MIN_HMAC_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

function getHmacSecret() {
  return assertVerificationSecretConfigured();
}

/**
 * Generates a cryptographically random 6-digit numeric string,
 * strictly preserving leading zeros (e.g. "004219").
 * Uses Node.js CSPRNG (crypto.randomInt), never Math.random().
 *
 * @returns {string}
 */
export function generateVerificationCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

/**
 * Computes a keyed HMAC-SHA-256 digest of the 6-digit code bound to user, purpose, and timestamp.
 * Protects against brute-force inversion of the 1,000,000-code space if the table is leaked.
 *
 * @param {string} code
 * @param {number} userId
 * @param {string} createdAt
 * @param {string} [purpose]
 * @returns {string} 64-char hex digest
 */
export function hashVerificationCode(code, userId, createdAt, purpose = PURPOSE_EMAIL_VERIFICATION) {
  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(`${userId}:${purpose}:${createdAt}:${code}`)
    .digest('hex');
}

/**
 * Issues a new verification code for a user inside an atomic transaction:
 * - Enforces resend cooldown (60 seconds) unless ignoreCooldown is true.
 * - Invalidates any prior unused, unexpired codes for the same user and purpose.
 * - Stores only code_hash (never plaintext) in verification_codes.
 *
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} [params.purpose]
 * @param {Date} [params.now]
 * @param {boolean} [params.ignoreCooldown]
 */
export function issueVerificationCode({
  userId,
  purpose = PURPOSE_EMAIL_VERIFICATION,
  now = new Date(),
  ignoreCooldown = false
}) {
  const db = getDb();
  const nowIso = now.toISOString();

  const tx = db.transaction(() => {
    if (!ignoreCooldown) {
      const latest = db
        .prepare(
          `SELECT id, created_at, expires_at, used_at
           FROM verification_codes
           WHERE user_id = ? AND purpose = ?
           ORDER BY id DESC LIMIT 1`
        )
        .get(userId, purpose);

      if (latest && latest.used_at === null && latest.expires_at > nowIso) {
        const elapsedSec = (now.getTime() - new Date(latest.created_at).getTime()) / 1000;
        if (elapsedSec < RESEND_COOLDOWN_SECONDS) {
          return {
            ok: false,
            reason: 'COOLDOWN',
            retryAfterSeconds: Math.max(1, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSec))
          };
        }
      }
    }

    // Invalidate all previous unused, unexpired codes for this user & purpose
    db.prepare(
      `UPDATE verification_codes
       SET expires_at = ?
       WHERE user_id = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?`
    ).run(nowIso, userId, purpose, nowIso);

    const code = generateVerificationCode();
    const expiresAt = new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000).toISOString();
    const codeHash = hashVerificationCode(code, userId, nowIso, purpose);

    const info = db
      .prepare(
        `INSERT INTO verification_codes (user_id, code_hash, purpose, failed_tries, created_at, expires_at, used_at)
         VALUES (?, ?, ?, 0, ?, ?, NULL)`
      )
      .run(userId, codeHash, purpose, nowIso, expiresAt);

    return {
      ok: true,
      id: Number(info.lastInsertRowid),
      code,
      createdAt: nowIso,
      expiresAt
    };
  });

  return tx();
}

/**
 * Atomically verifies a submitted 6-digit code and marks the user's email as verified.
 * - Rejects expired, exhausted, already-used, or mismatched codes.
 * - Increments failed_tries on mismatch.
 * - Uses conditional UPDATE (used_at IS NULL AND expires_at > ? AND failed_tries < ?)
 *   and updates users.email_verified_at in the same SQLite transaction.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.code
 * @param {string} [params.purpose]
 * @param {Date} [params.now]
 */
export function verifyEmailCode({
  email,
  code,
  purpose = PURPOSE_EMAIL_VERIFICATION,
  now = new Date()
}) {
  const db = getDb();
  const normEmail = normalizeEmail(email);
  const nowIso = now.toISOString();

  const tx = db.transaction(() => {
    const user = db
      .prepare('SELECT id, email, full_name, email_verified_at FROM users WHERE email = ?')
      .get(normEmail);

    if (!user) {
      return {
        ok: false,
        reason: 'INVALID_CODE',
        message: 'Invalid email address or verification code.'
      };
    }

    const row = db
      .prepare(
        `SELECT id, user_id, code_hash, purpose, failed_tries, created_at, expires_at, used_at
         FROM verification_codes
         WHERE user_id = ? AND purpose = ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(user.id, purpose);

    if (!row) {
      return {
        ok: false,
        reason: 'NO_ACTIVE_CODE',
        message: 'No active verification code was found. Please request a new code.'
      };
    }

    if (row.used_at !== null) {
      return {
        ok: false,
        reason: 'CODE_REUSED',
        message: 'This verification code has already been used.'
      };
    }

    if (row.expires_at <= nowIso) {
      return {
        ok: false,
        reason: 'CODE_EXPIRED',
        message: 'This verification code has expired. Please request a new code.'
      };
    }

    if (row.failed_tries >= MAX_FAILED_TRIES) {
      return {
        ok: false,
        reason: 'ATTEMPTS_EXHAUSTED',
        message: 'Too many incorrect attempts. Please request a new verification code.'
      };
    }

    const candidateHash = hashVerificationCode(code, user.id, row.created_at, purpose);
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(row.code_hash, 'hex');
    const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    if (!isMatch) {
      const nextTries = row.failed_tries + 1;
      db.prepare('UPDATE verification_codes SET failed_tries = ? WHERE id = ?').run(nextTries, row.id);

      if (nextTries >= MAX_FAILED_TRIES) {
        return {
          ok: false,
          reason: 'ATTEMPTS_EXHAUSTED',
          remainingTries: 0,
          message: 'Too many incorrect attempts. Please request a new verification code.'
        };
      }

      return {
        ok: false,
        reason: 'INVALID_CODE',
        remainingTries: MAX_FAILED_TRIES - nextTries,
        message: 'The verification code is incorrect. Please check your email and try again.'
      };
    }

    // Atomic conditional consumption
    const consumeRes = db
      .prepare(
        `UPDATE verification_codes
         SET used_at = ?
         WHERE id = ? AND used_at IS NULL AND expires_at > ? AND failed_tries < ?`
      )
      .run(nowIso, row.id, nowIso, MAX_FAILED_TRIES);

    if (consumeRes.changes !== 1) {
      return {
        ok: false,
        reason: 'CODE_REUSED',
        message: 'This verification code has already been used.'
      };
    }

    db.prepare(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, ?)
       WHERE id = ?`
    ).run(nowIso, user.id);

    return {
      ok: true,
      userId: user.id,
      email: user.email,
      verifiedAt: nowIso
    };
  });

  return tx();
}
