import argon2 from 'argon2';

/**
 * Normalizes an email address per assessment requirements:
 * 1. Trims surrounding whitespace.
 * 2. Lowercases the entire email address.
 * Applied consistently across registration, login, and password reset.
 *
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes a password per the assessment's chosen policy:
 * 1. Trims leading and trailing whitespace only (preventing invisible clipboard copy-paste errors).
 * 2. Preserves all internal spaces and exact character capitalization intact.
 *
 * @param {string} password
 * @returns {string}
 */
export function normalizePassword(password) {
  if (typeof password !== 'string') return '';
  return password.trim();
}

/**
 * Validates email format according to the application standard.
 *
 * @param {string} email
 * @returns {boolean}
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates full name:
 * Allows single names (mononyms like "Chinedu", "Dapo", "Zendaya").
 * Requires at least 2 characters and at least one letter.
 *
 * @param {string} name
 * @returns {boolean}
 */
const LETTER_REGEX = /\p{L}/u;
export function validateName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && LETTER_REGEX.test(trimmed);
}

/**
 * Validates signup password against the 15-character minimum requirement.
 * Length is evaluated AFTER trimming leading/trailing whitespace per assessment policy.
 * Counts Unicode code points using Array.from().
 *
 * @param {string} password
 * @returns {boolean}
 */
export function validateSignupPassword(password) {
  if (typeof password !== 'string') return false;
  const trimmed = normalizePassword(password);
  return Array.from(trimmed).length >= 15;
}

/**
 * Argon2id configuration conforming to RFC 9106 Section 7.4 Second Recommended Profile:
 * - type: Argon2id (variant 2)
 * - memoryCost: 65536 KiB (64 MiB)
 * - timeCost: 3 iterations
 * - parallelism: 4 lanes/threads
 * - hashLength: 32 bytes output digest
 */
export const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32
};

/**
 * Hashes a plain text password using Argon2id.
 * Each call automatically generates a fresh 16-byte cryptographically secure random salt.
 *
 * @param {string} plainPassword
 * @returns {Promise<string>} Encoded Argon2id hash string
 */
export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || !plainPassword) {
    throw new Error('Password must be a non-empty string');
  }
  return argon2.hash(plainPassword, ARGON2_CONFIG);
}

/**
 * Verifies a candidate plain text password against a stored encoded Argon2id hash.
 *
 * @param {string} hash
 * @param {string} plainPassword
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 */
export async function verifyPassword(hash, plainPassword) {
  if (typeof hash !== 'string' || typeof plainPassword !== 'string') {
    return false;
  }
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}
