import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

/**
 * Loads .env from project root or app/ if present and not already loaded.
 * Never logs or prints secret values.
 */
export function loadEnvIfPresent() {
  const candidates = [path.join(rootDir, '.env'), path.join(rootDir, 'app/.env')];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        process.loadEnvFile(p);
      } catch {
        // Ignore if already loaded or unreadable
      }
      break;
    }
  }
}

loadEnvIfPresent();

export const SMTP_CONFIG = Object.freeze({
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // false for port 587 (STARTTLS)
  requireTLS: true,
  user: process.env.SMTP_USER || 'resend',
  from: process.env.EMAIL_FROM || "Nit's Cut <onboarding@resend.dev>"
});

function redactSecrets(str) {
  if (typeof str !== 'string') return String(str);
  let out = str;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    out = out.replaceAll(key, '[REDACTED_API_KEY]');
  }
  out = out.replace(/re_[A-Za-z0-9_]{10,}/g, '[REDACTED_API_KEY]');
  return out;
}

function maskEmail(email) {
  if (typeof email !== 'string') return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

let customTransportOverride = null;
export function setMailTransportForTest(transport) {
  customTransportOverride = transport;
}

function createSmtpTransport() {
  if (customTransportOverride) return customTransportOverride;

  const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : '';
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    requireTLS: SMTP_CONFIG.requireTLS,
    auth: {
      user: SMTP_CONFIG.user,
      pass: apiKey
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

/**
 * Enforces the TEST_RECIPIENT_EMAIL allowlist at the email-sending boundary.
 * Rejects any other recipient BEFORE any SMTP connection is opened.
 * Neither NODE_ENV nor EMAIL_DELIVERY_MODE can bypass this check.
 */
export function assertRecipientAllowed(toEmail) {
  const allowed = (process.env.TEST_RECIPIENT_EMAIL || '').trim().toLowerCase();
  const candidate = typeof toEmail === 'string' ? toEmail.trim().toLowerCase() : '';
  if (!allowed) {
    const err = new Error('TEST_RECIPIENT_EMAIL allowlist is not configured.');
    err.code = 'RECIPIENT_NOT_ALLOWED';
    throw err;
  }
  if (!candidate || candidate !== allowed) {
    const err = new Error(
      `Recipient ${maskEmail(candidate)} is rejected: only the configured TEST_RECIPIENT_EMAIL is allowed.`
    );
    err.code = 'RECIPIENT_NOT_ALLOWED';
    throw err;
  }
  return candidate;
}

/**
 * Builds the Step 11 branded verification email message.
 * Task 1 colour, typography, and layout token values from nc-tokens.css and nc-layout-tokens.css
 * are manually mapped into literal inline CSS values with email-compatible font fallbacks
 * (not automatically synchronized). Intentional email-specific exceptions include the 520px
 * email container width, table-based layout, and monospace verification code formatting.
 */
export function buildVerificationMessage({ toEmail, fullName, code, expiryMinutes = 10 }) {
  const safeName = (fullName || 'Client').replace(/[<>&"']/g, '');
  const subject = "Verify your email address — Nit's Cut";

  const text = [
    `Hello ${safeName},`,
    '',
    "Welcome to Nit's Cut. Confirm your email to finish setting up your account.",
    '',
    `Your verification code is ${code}.`,
    '',
    `This code expires in ${expiryMinutes} minutes and can only be used once.`,
    'If you didn’t create this account, you can ignore this email.'
  ].join('\n');

  const displayFont = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
  const bodyFont = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const monoFont = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address — Nit's Cut</title>
</head>
<body bgcolor="#FBF8FF" style="margin:0;padding:24px;background-color:#FBF8FF;font-family:${bodyFont};color:#1B1B21;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FBF8FF" style="background-color:#FBF8FF;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="max-width:520px;margin:0 auto;background-color:#FFFFFF;border:1px solid #C6C5D0;border-radius:14px;overflow:hidden;">
          <tr>
            <td bgcolor="#334DAF" style="background-color:#334DAF;padding:20px 24px;color:#FFFFFF;">
              <h1 style="margin:0;font-family:${displayFont};font-size:28px;font-weight:600;line-height:1.4;letter-spacing:0px;color:#FFFFFF;">Nit's Cut</h1>
              <p style="margin:4px 0 0;font-family:${bodyFont};font-size:12px;font-weight:400;line-height:1.4;color:#DDE1FF;">Bespoke Men's Tailoring</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 20px;">
              <p style="margin:0 0 12px;font-family:${bodyFont};font-size:14px;font-weight:600;line-height:1.6;color:#1B1B21;">Hello ${safeName},</p>
              <p style="margin:0 0 20px;font-family:${bodyFont};font-size:14px;font-weight:400;line-height:1.6;color:#45464F;">
                Welcome to Nit's Cut. Confirm your email to finish setting up your account.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                <tr>
                  <td bgcolor="#DDE1FF" align="center" style="padding:16px 20px;background-color:#DDE1FF;border:1px solid #334DAF;border-radius:8px;">
                    <p style="margin:0 0 6px;font-family:${bodyFont};font-size:12px;font-weight:600;line-height:1.4;color:#001454;">Your verification code is</p>
                    <span style="font-family:${monoFont};font-size:28px;font-weight:700;letter-spacing:6px;color:#001454;">${code}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:${bodyFont};font-size:14px;font-weight:400;line-height:1.6;color:#45464F;">
                This code expires in <strong>${expiryMinutes} minutes</strong> and can only be used once.
              </p>
              <p style="margin:0;font-family:${bodyFont};font-size:12px;font-weight:400;line-height:1.6;color:#45464F;">
                If you didn’t create this account, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    from: SMTP_CONFIG.from,
    to: toEmail,
    subject,
    text,
    html
  };
}

/**
 * Sends a verification email synchronously over Resend SMTP.
 * Enforces TEST_RECIPIENT_EMAIL allowlist BEFORE any SMTP connection is created.
 * Never logs the verification code or API key.
 */
export async function sendVerificationEmail({ toEmail, fullName, code, expiryMinutes = 10 }) {
  assertRecipientAllowed(toEmail);
  const transporter = createSmtpTransport();
  const message = buildVerificationMessage({ toEmail, fullName, code, expiryMinutes });
  const info = await transporter.sendMail(message);
  console.log(
    `[Email] SMTP accepted verification email to=${maskEmail(toEmail)} messageId=${info.messageId}`
  );
  return {
    messageId: info.messageId,
    response: redactSecrets(info.response || '250 OK')
  };
}

/**
 * In-process background job queue with bounded exponential-backoff retries
 * (maxAttempts = 3 means 3 total attempts: 1 initial attempt + 2 retries).
 *
 * Limitations (documented in docs/verification-design.md):
 * - Pending jobs live in Node.js memory. If the server process crashes or restarts
 *   while a job is queued or retrying, that job is lost.
 * - Users recover from lost or failed deliveries by clicking "Resend code" after the
 *   60-second cooldown, which issues a fresh code and enqueues a new delivery job.
 */
const pendingJobs = new Set();

export function getPendingEmailJobCount() {
  return pendingJobs.size;
}

export async function waitForPendingEmailJobs() {
  while (pendingJobs.size > 0) {
    await Promise.allSettled(Array.from(pendingJobs));
  }
}

export function enqueueVerificationEmail(
  { toEmail, fullName, code, expiryMinutes = 10 },
  { maxAttempts = 3, baseDelayMs = 500 } = {}
) {
  const jobPromise = new Promise((resolve) => {
    setImmediate(async () => {
      try {
        assertRecipientAllowed(toEmail);
      } catch (allowErr) {
        console.warn(`[EmailJob] Blocked before SMTP connection: ${allowErr.message}`);
        resolve({ ok: false, reason: 'RECIPIENT_NOT_ALLOWED', attempts: 0 });
        return;
      }

      let lastErr = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await sendVerificationEmail({ toEmail, fullName, code, expiryMinutes });
          resolve({ ok: true, attempt, messageId: result.messageId });
          return;
        } catch (err) {
          lastErr = err;
          if (err?.code === 'RECIPIENT_NOT_ALLOWED') {
            console.warn(`[EmailJob] Blocked before SMTP connection: ${err.message}`);
            resolve({ ok: false, reason: 'RECIPIENT_NOT_ALLOWED', attempts: 0 });
            return;
          }
          const safeMsg = redactSecrets(err?.response || err?.message || 'Unknown SMTP error');
          console.error(
            `[EmailJob] Attempt ${attempt}/${maxAttempts} failed for ${maskEmail(toEmail)}: ${safeMsg}`
          );
          if (attempt < maxAttempts) {
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
      console.error(
        `[EmailJob] Exhausted ${maxAttempts} total attempts (1 initial + ${maxAttempts - 1} retries) for ${maskEmail(toEmail)}. Last error: ${redactSecrets(lastErr?.message || 'SMTP failure')}`
      );
      resolve({ ok: false, attempts: maxAttempts });
    });
  });

  pendingJobs.add(jobPromise);
  jobPromise.finally(() => pendingJobs.delete(jobPromise));
  return jobPromise;
}
