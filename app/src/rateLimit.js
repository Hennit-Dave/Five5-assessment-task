import { rateLimit } from 'express-rate-limit';
import { normalizeEmail } from './auth.js';

/**
 * Task 4 Step 8: IP-only rate limiting for signup, login and reset.
 *
 * Initial assessment settings (documented in docs/rate-limiting.md):
 *   login : 5 POST requests per 15 minutes per client address
 *   signup: 5 POST requests per hour per client address
 *   reset : 3 POST requests per hour per client address
 *
 * Every POST counts: successful requests and validation failures included.
 * These limits slow guessing; they do not stop it.
 *
 * Client address: the library's default key generator on `req.ip`. `trust proxy`
 * is deliberately NOT enabled, so `req.ip` is the TCP peer address and an
 * X-Forwarded-For header sent by a client is ignored. The default key generator
 * also groups IPv6 addresses by subnet (default /56) instead of per address.
 *
 * Counters live in the library's default in-memory store: they reset when the
 * process restarts and are not shared between instances.
 */

export const RATE_LIMIT_SETTINGS = Object.freeze({
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  reset: { limit: 3, windowMs: 60 * 60 * 1000 },
  verify: { limit: 10, windowMs: 15 * 60 * 1000 },
  resend: { limit: 5, windowMs: 60 * 60 * 1000 }
});

function retrySeconds(req) {
  const info = req.rateLimit;
  const resetMs = info && info.resetTime ? info.resetTime.getTime() - Date.now() : 0;
  return Math.max(1, Math.ceil(resetMs / 1000));
}

function waitWording(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? 'about 1 minute' : `about ${minutes} minutes`;
}

function safeFields(mode, body) {
  const b = body && typeof body === 'object' ? body : {};
  const email = typeof b.email === 'string' ? normalizeEmail(b.email) : '';
  if (mode === 'signup') {
    return { name: typeof b.name === 'string' ? b.name.trim() : '', email };
  }
  return { email };
}

/**
 * Optional diagnostics for test evidence only. Enabled with RATE_LIMIT_DIAGNOSTICS=1.
 * Writes the observed socket peer address, req.ip and the limiter key to the server log
 * (never into a customer-facing response).
 */
function diagnostics(name) {
  return (req, res, next) => {
    if (process.env.RATE_LIMIT_DIAGNOSTICS === '1') {
      res.on('finish', () => {
        const info = req.rateLimit || {};
        console.log(
          '[rate-limit-diagnostic] ' +
            JSON.stringify({
              endpoint: name,
              status: res.statusCode,
              peer: req.socket.remoteAddress,
              reqIp: req.ip,
              limiterKey: info.key,
              used: info.used,
              limit: info.limit,
              xForwardedForReceived: req.headers['x-forwarded-for'] || null
            })
        );
      });
    }
    next();
  };
}

function buildLimiter(name, mode, authModes) {
  const { limit, windowMs } = RATE_LIMIT_SETTINGS[name];
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Test-harness switch: only bypassed when NODE_ENV=test AND RATE_LIMIT_MODE=off.
    // In normal development, production, and Step 8 tests, rate limiting remains strictly active.
    skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_MODE === 'off',
    handler: (req, res) => {
      const seconds = retrySeconds(req);
      if (!res.getHeader('Retry-After')) res.setHeader('Retry-After', String(seconds));
      const message = `Too many attempts. Please wait ${waitWording(seconds)} and try again.`;
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res
          .status(429)
          .json({ success: false, error: message, retryAfterSeconds: seconds });
      }
      if (mode === 'verify' || mode === 'resend') {
        return res.status(429).render('verify', {
          pageTitle: "Verify Your Email — Nit's Cut",
          isMarketingPage: false,
          activePath: '/auth/verify',
          errorMessage: message,
          email: safeFields('login', req.body).email
        });
      }
      return res.status(429).render('auth', {
        mode,
        pageTitle: authModes[mode].title,
        isMarketingPage: false,
        activePath: '/auth',
        authModes,
        scripts: ['/js/auth.js'],
        errorMessage: message,
        formData: safeFields(mode, req.body)
      });
    }
  });
}

/**
 * @param {Record<string, {title: string}>} authModes
 * @returns {{signup: Function[], login: Function[], reset: Function[], verify: Function[], resend: Function[]}}
 */
export function createAuthRateLimiters(authModes) {
  return {
    signup: [diagnostics('signup'), buildLimiter('signup', 'signup', authModes)],
    login: [diagnostics('login'), buildLimiter('login', 'login', authModes)],
    reset: [diagnostics('reset'), buildLimiter('reset', 'reset', authModes)],
    verify: [diagnostics('verify'), buildLimiter('verify', 'verify', authModes)],
    resend: [diagnostics('resend'), buildLimiter('resend', 'resend', authModes)]
  };
}
