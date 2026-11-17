import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { normalizePassword } from './auth.js';

export const OUTCOMES = Object.freeze({
  BREACHED: 'breached',
  NOT_FOUND: 'not_found',
  UNAVAILABLE: 'unavailable'
});

export const DEFAULT_TIMEOUT_MS = 2000;
export const DEFAULT_API_URL = 'https://api.pwnedpasswords.com/range/';

// Suffix: strictly 35 hexadecimal characters
const SUFFIX_REGEX = /^[0-9A-Fa-f]{35}$/;
// Count: complete non-negative integer ("0" or positive integer without leading zeros)
const COUNT_REGEX = /^(?:0|[1-9]\d*)$/;

/**
 * Checks whether a candidate password has appeared in a known data breach
 * using the Have I Been Pwned (HIBP) k-anonymity hash-prefix model.
 *
 * Privacy & Security Constraints:
 * 1. Only the first 5 characters of the SHA-1 hash (prefix) are sent over HTTPS.
 * 2. Add-Padding: true is sent to reduce response-length traffic-analysis disclosure.
 * 3. The 35-character suffix is compared strictly locally in volatile memory.
 * 4. Padding dummy entries (count === 0) are ignored and never treated as breached.
 * 5. Passwords, full hashes, suffixes, prefixes, and URLs with prefixes are NEVER logged.
 * 6. Logs record only necessary operational information: duration, outcome, and error category.
 *
 * Strict Response Validation:
 * - Accepts only HTTP 200. Non-200 responses (including HTTP 201) are treated as unavailable.
 * - Validates every non-empty response line. Normal trailing blank lines are allowed.
 * - Requires a 35-character hexadecimal suffix and a complete non-negative integer count.
 *   Permissive parsing that accepts values such as "0garbage", decimals, or negatives is strictly rejected.
 * - Any malformed non-empty line causes the entire response to be treated as unavailable.
 *
 * Three explicit outcomes:
 * - 'breached': matched a known breach entry with count > 0.
 * - 'not_found': range query succeeded with valid lines and suffix was not found (or had count === 0).
 * - 'unavailable': timeout, network error, non-200 HTTP status, empty body, or malformed lines.
 *   Never treated as 'not_found'.
 *
 * @param {string} password Candidate password
 * @param {Object} [options]
 * @param {number} [options.timeoutMs] Hard ceiling in ms covering request & body read (default: 2000)
 * @param {string} [options.apiUrl] Base URL for range endpoint
 * @param {Function} [options.fetchFn] Fetch implementation (defaults to globalThis.fetch)
 * @param {string} [options.userAgent] Request User-Agent header
 * @returns {Promise<{outcome: 'breached'|'not_found'|'unavailable', count?: number, errorCategory?: string, durationMs: number}>}
 */
export async function checkPasswordBreached(password, options = {}) {
  const start = performance.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.apiUrl || process.env.BREACH_CHECK_API_URL || DEFAULT_API_URL;
  const fetchFn = options.fetchFn || globalThis.fetch;
  const userAgent = options.userAgent || 'NitsCut-Assessment/1.0 (Task 4 Security Audit)';

  if (typeof password !== 'string' || password.length === 0) {
    const durationMs = performance.now() - start;
    console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: INVALID_INPUT`);
    return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'INVALID_INPUT', durationMs };
  }

  const trimmed = normalizePassword(password);
  const fullHash = crypto.createHash('sha1').update(trimmed).digest('hex').toUpperCase();
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);

  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const targetUrl = `${cleanBase}${prefix}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('TIMEOUT')), timeoutMs);

  try {
    const res = await fetchFn(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Add-Padding': 'true',
        'Accept': 'text/plain'
      },
      signal: controller.signal
    });

    // Accept only HTTP 200
    if (res.status !== 200) {
      const durationMs = performance.now() - start;
      const errorCategory = `HTTP_STATUS_${res.status}`;
      console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: ${errorCategory}`);
      return { outcome: OUTCOMES.UNAVAILABLE, errorCategory, durationMs };
    }

    const body = await res.text();
    const durationMs = performance.now() - start;

    if (!body || body.trim().length === 0) {
      console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: EMPTY_RESPONSE`);
      return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'EMPTY_RESPONSE', durationMs };
    }

    const rawLines = body.split(/\r?\n/);

    // Locate the last non-empty line to allow normal trailing blank lines
    let lastNonEmptyIdx = -1;
    for (let i = rawLines.length - 1; i >= 0; i--) {
      if (rawLines[i].trim() !== '') {
        lastNonEmptyIdx = i;
        break;
      }
    }

    if (lastNonEmptyIdx === -1) {
      console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: EMPTY_RESPONSE`);
      return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'EMPTY_RESPONSE', durationMs };
    }

    let validLineCount = 0;
    let matched = false;
    let breachCount = 0;

    for (let i = 0; i <= lastNonEmptyIdx; i++) {
      const line = rawLines[i].trim();

      // An internal blank line before the end is considered malformed
      if (!line) {
        console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: MALFORMED_RESPONSE`);
        return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'MALFORMED_RESPONSE', durationMs };
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: MALFORMED_RESPONSE`);
        return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'MALFORMED_RESPONSE', durationMs };
      }

      const lineSuffix = line.slice(0, colonIdx);
      const countStr = line.slice(colonIdx + 1);

      // Suffix must be strictly 35 hexadecimal characters
      if (!SUFFIX_REGEX.test(lineSuffix)) {
        console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: MALFORMED_RESPONSE`);
        return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'MALFORMED_RESPONSE', durationMs };
      }

      // Count must be a complete non-negative integer string
      if (!COUNT_REGEX.test(countStr)) {
        console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: MALFORMED_RESPONSE`);
        return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'MALFORMED_RESPONSE', durationMs };
      }

      const count = Number(countStr);
      if (!Number.isSafeInteger(count) || count < 0) {
        console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: MALFORMED_RESPONSE`);
        return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'MALFORMED_RESPONSE', durationMs };
      }

      validLineCount++;

      if (lineSuffix.toUpperCase() === suffix) {
        if (count > 0) {
          matched = true;
          breachCount = count;
        }
        // count === 0 is valid artificial padding entry; intentionally not treated as breached
      }
    }

    if (validLineCount === 0) {
      console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: MALFORMED_RESPONSE`);
      return { outcome: OUTCOMES.UNAVAILABLE, errorCategory: 'MALFORMED_RESPONSE', durationMs };
    }

    if (matched) {
      console.log(`[BreachCheck] Outcome: breached, Duration: ${durationMs.toFixed(1)}ms`);
      return { outcome: OUTCOMES.BREACHED, count: breachCount, durationMs };
    }

    console.log(`[BreachCheck] Outcome: not_found, Duration: ${durationMs.toFixed(1)}ms`);
    return { outcome: OUTCOMES.NOT_FOUND, durationMs };
  } catch (err) {
    const durationMs = performance.now() - start;
    const isTimeout =
      controller.signal.aborted ||
      err?.name === 'AbortError' ||
      err?.message === 'TIMEOUT' ||
      err?.cause?.name === 'TimeoutError';

    const errorCategory = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
    console.log(`[BreachCheck] Outcome: unavailable, Duration: ${durationMs.toFixed(1)}ms, Category: ${errorCategory}`);
    return { outcome: OUTCOMES.UNAVAILABLE, errorCategory, durationMs };
  } finally {
    clearTimeout(timer);
  }
}
