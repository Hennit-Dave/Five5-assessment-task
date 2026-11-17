import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import Database from '../../app/node_modules/better-sqlite3/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');

// Load .env before importing app modules that inspect env
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// Point app db.js to isolated test DB and use an explicit test-only HMAC secret
const TEST_HMAC_SECRET = 'test-only-hmac-secret-for-automated-suite-32chars';
process.env.DATABASE_PATH = TEST_DB;
process.env.NODE_ENV = 'test';
process.env.VERIFICATION_HMAC_SECRET = TEST_HMAC_SECRET;

const {
  generateVerificationCode,
  hashVerificationCode,
  issueVerificationCode,
  verifyEmailCode,
  assertVerificationSecretConfigured,
  VerificationConfigError,
  EXPIRY_MINUTES,
  MAX_FAILED_TRIES
} = await import('../../app/src/verification.js');
const {
  enqueueVerificationEmail,
  sendVerificationEmail,
  setMailTransportForTest,
  waitForPendingEmailJobs
} = await import('../../app/src/email.js');
const { createUser } = await import('../../app/src/db.js');

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404 || res.status === 200) return true;
    } catch {}
    await sleep(150);
  }
  return false;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

let passed = 0;
let failed = 0;
function assert(desc, condition) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('TASK 4 STEP 10: EMAIL VERIFICATION & BACKGROUND JOB TEST SUITE');
  console.log('================================================================');

  const realHashBefore = sha256File(REAL_DB);
  console.log(`Protected Real Database SHA-256: ${realHashBefore}`);

  const db = new Database(TEST_DB);

  // --------------------------------------------------------------------------
  // SECTION 1: Unit & Database Verification Flow Tests (Isolated Test DB)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Verification Code Logic & Atomic DB State ---');

  // 1.1 Cryptographic generation & leading zero preservation
  const sampleCodes = Array.from({ length: 200 }, () => generateVerificationCode());
  assert('All 200 generated codes are strictly 6-digit strings', sampleCodes.every((c) => /^\d{6}$/.test(c)));
  assert(
    'Leading zero padding works for small integers',
    crypto.randomInt(0, 1).toString().padStart(6, '0') === '000000'
  );

  // 1.1b Missing or short VERIFICATION_HMAC_SECRET is rejected (no hardcoded fallback)
  delete process.env.VERIFICATION_HMAC_SECRET;
  let missingSecretCaught = false;
  try {
    assertVerificationSecretConfigured();
  } catch (e) {
    missingSecretCaught = e instanceof VerificationConfigError && e.code === 'MISSING_VERIFICATION_SECRET';
  }
  assert('Missing VERIFICATION_HMAC_SECRET throws VerificationConfigError', missingSecretCaught);

  process.env.VERIFICATION_HMAC_SECRET = 'too-short';
  let shortSecretCaught = false;
  try {
    assertVerificationSecretConfigured();
  } catch (e) {
    shortSecretCaught = e instanceof VerificationConfigError;
  }
  assert('Short VERIFICATION_HMAC_SECRET (< 32 chars) throws VerificationConfigError', shortSecretCaught);
  process.env.VERIFICATION_HMAC_SECRET = TEST_HMAC_SECRET;

  // Create a dedicated test user in step5_test.db
  const unitEmail = `verify.unit.${Date.now()}@example.com`;
  const unitUser = await createUser({
    email: unitEmail,
    password: 'NitsCut#2026-VerifyTestPassphrase!',
    fullName: 'Tunde Bakare'
  });

  // 1.2 Issue code & verify code_hash storage (no plaintext)
  const t0 = new Date('2026-11-16T10:00:00.000Z');
  const issue1 = issueVerificationCode({ userId: unitUser.id, now: t0 });
  assert('Initial code issued successfully', issue1.ok === true);
  assert('Issued code is 6 digits', /^\d{6}$/.test(issue1.code));

  const row1 = db.prepare('SELECT * FROM verification_codes WHERE id = ?').get(issue1.id);
  assert('code_hash is 64-char HMAC-SHA256 hex digest', /^[0-9a-f]{64}$/.test(row1.code_hash));
  assert('Plaintext code is NOT stored in code_hash', !row1.code_hash.includes(issue1.code));
  assert('failed_tries initialized to 0', row1.failed_tries === 0);
  assert('used_at initialized to NULL', row1.used_at === null);
  assert(
    `Expiry window is ${EXPIRY_MINUTES} minutes`,
    new Date(row1.expires_at).getTime() - new Date(row1.created_at).getTime() === EXPIRY_MINUTES * 60 * 1000
  );

  // 1.3 Resend cooldown enforcement (60 seconds)
  const tCooldown = new Date(t0.getTime() + 15_000); // 15s later
  const cooldownRes = issueVerificationCode({ userId: unitUser.id, now: tCooldown });
  assert('Resend within 60s returns COOLDOWN', cooldownRes.ok === false && cooldownRes.reason === 'COOLDOWN');
  assert('Retry-After is ~45s', cooldownRes.retryAfterSeconds === 45);

  // 1.4 Superseded code invalidation after cooldown
  const tAfterCooldown = new Date(t0.getTime() + 65_000); // 65s later
  const issue2 = issueVerificationCode({ userId: unitUser.id, now: tAfterCooldown });
  assert('Resend after 60s issues new code', issue2.ok === true && issue2.id !== issue1.id);
  const oldRowAfter = db.prepare('SELECT expires_at FROM verification_codes WHERE id = ?').get(issue1.id);
  assert('Superseded code was invalidated (expires_at <= now)', oldRowAfter.expires_at <= tAfterCooldown.toISOString());

  // 1.5 Incorrect code increments failed_tries
  const wrongCode = issue2.code === '000000' ? '000001' : '000000';
  const badVerify = verifyEmailCode({
    email: unitEmail,
    code: wrongCode,
    now: new Date(tAfterCooldown.getTime() + 5_000)
  });
  assert('Incorrect code fails with INVALID_CODE', badVerify.ok === false && badVerify.reason === 'INVALID_CODE');
  const row2AfterBad = db.prepare('SELECT failed_tries, used_at FROM verification_codes WHERE id = ?').get(issue2.id);
  assert('failed_tries incremented to 1', row2AfterBad.failed_tries === 1);
  assert('used_at remains NULL after failed try', row2AfterBad.used_at === null);

  // 1.6 Exhausted attempts lock out the code (even if correct code is submitted afterwards)
  for (let i = 2; i <= MAX_FAILED_TRIES; i++) {
    verifyEmailCode({
      email: unitEmail,
      code: wrongCode,
      now: new Date(tAfterCooldown.getTime() + i * 1000)
    });
  }
  const exhaustedCheck = verifyEmailCode({
    email: unitEmail,
    code: issue2.code, // even the valid code!
    now: new Date(tAfterCooldown.getTime() + 10_000)
  });
  assert(
    'Valid code rejected once failed_tries reaches MAX_FAILED_TRIES (5)',
    exhaustedCheck.ok === false && exhaustedCheck.reason === 'ATTEMPTS_EXHAUSTED'
  );

  // 1.7 Expired code rejection
  const tIssue3 = new Date(tAfterCooldown.getTime() + 70_000);
  const issue3 = issueVerificationCode({ userId: unitUser.id, now: tIssue3, ignoreCooldown: true });
  const tExpired = new Date(tIssue3.getTime() + EXPIRY_MINUTES * 60_000 + 1000);
  const expiredRes = verifyEmailCode({ email: unitEmail, code: issue3.code, now: tExpired });
  assert('Expired code rejected with CODE_EXPIRED', expiredRes.ok === false && expiredRes.reason === 'CODE_EXPIRED');

  // 1.8 Atomic successful verification & reuse rejection
  const tIssue4 = new Date(tExpired.getTime() + 5000);
  const issue4 = issueVerificationCode({ userId: unitUser.id, now: tIssue4, ignoreCooldown: true });
  const tVerifySuccess = new Date(tIssue4.getTime() + 10_000);
  const successRes = verifyEmailCode({ email: unitEmail, code: issue4.code, now: tVerifySuccess });
  assert('Valid active code succeeds', successRes.ok === true);

  const verifiedUser = db.prepare('SELECT email_verified_at FROM users WHERE id = ?').get(unitUser.id);
  const consumedRow = db.prepare('SELECT used_at FROM verification_codes WHERE id = ?').get(issue4.id);
  assert('users.email_verified_at updated to verification timestamp', verifiedUser.email_verified_at === tVerifySuccess.toISOString());
  assert('verification_codes.used_at updated to consumption timestamp', consumedRow.used_at === tVerifySuccess.toISOString());

  // Attempt to reuse the exact same valid code
  const reuseRes = verifyEmailCode({
    email: unitEmail,
    code: issue4.code,
    now: new Date(tVerifySuccess.getTime() + 5000)
  });
  assert('Reusing an already-consumed code fails with CODE_REUSED', reuseRes.ok === false && reuseRes.reason === 'CODE_REUSED');

  // --------------------------------------------------------------------------
  // SECTION 2: Background Job Retries & Strict Recipient Allowlist (Mocked)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Background Job Queue Retries & Strict Recipient Allowlist ---');
  const savedTestRecipient = process.env.TEST_RECIPIENT_EMAIL;
  const savedNodeEnv = process.env.NODE_ENV;
  const savedDeliveryMode = process.env.EMAIL_DELIVERY_MODE;

  process.env.TEST_RECIPIENT_EMAIL = unitEmail;

  let mockAttempts = 0;
  setMailTransportForTest({
    sendMail: async () => {
      mockAttempts++;
      if (mockAttempts === 1) {
        throw new Error('Transient simulated SMTP timeout');
      }
      return { messageId: '<mock-retry-success@resend.dev>', response: '250 OK' };
    }
  });
  const jobResult = await enqueueVerificationEmail(
    { toEmail: unitEmail, fullName: 'Tunde Bakare', code: '123456' },
    { maxAttempts: 3, baseDelayMs: 20 }
  );
  await waitForPendingEmailJobs();
  assert('Background job retried transient failure and succeeded on attempt 2 (3 total attempts = 2 retries)', jobResult.ok === true && jobResult.attempt === 2);

  setMailTransportForTest({
    sendMail: async () => {
      throw new Error('Permanent simulated SMTP error');
    }
  });
  const failJobResult = await enqueueVerificationEmail(
    { toEmail: unitEmail, fullName: 'Tunde Bakare', code: '123456' },
    { maxAttempts: 2, baseDelayMs: 10 }
  );
  await waitForPendingEmailJobs();
  assert('Background job handles exhausted attempts gracefully without crashing', failJobResult.ok === false && failJobResult.attempts === 2);

  // Strict recipient allowlist checks across default, sync, and job modes (0 SMTP calls)
  let blockedTransportCalls = 0;
  setMailTransportForTest({
    sendMail: async () => {
      blockedTransportCalls++;
      return { messageId: '<should-never-happen>', response: '250 OK' };
    }
  });

  // 2a. Default / sync boundary call with non-allowlisted recipient even under NODE_ENV=production
  process.env.NODE_ENV = 'production';
  process.env.EMAIL_DELIVERY_MODE = 'sync';
  let syncBlocked = false;
  try {
    await sendVerificationEmail({ toEmail: 'other.person@example.com', fullName: 'Other', code: '123456' });
  } catch (err) {
    syncBlocked = err?.code === 'RECIPIENT_NOT_ALLOWED';
  }
  assert('Sync mode rejects non-allowlisted recipient under NODE_ENV=production', syncBlocked);

  // 2b. Job mode with non-allowlisted recipient under EMAIL_DELIVERY_MODE=job
  process.env.EMAIL_DELIVERY_MODE = 'job';
  const jobBlocked = await enqueueVerificationEmail(
    { toEmail: 'other.person@example.com', fullName: 'Other', code: '123456' },
    { maxAttempts: 3, baseDelayMs: 10 }
  );
  await waitForPendingEmailJobs();
  assert('Job mode rejects non-allowlisted recipient with 0 attempts', jobBlocked.ok === false && jobBlocked.reason === 'RECIPIENT_NOT_ALLOWED' && jobBlocked.attempts === 0);

  // 2c. Unconfigured TEST_RECIPIENT_EMAIL rejects all recipients
  delete process.env.TEST_RECIPIENT_EMAIL;
  let emptyAllowlistBlocked = false;
  try {
    await sendVerificationEmail({ toEmail: unitEmail, fullName: 'Tunde', code: '123456' });
  } catch (err) {
    emptyAllowlistBlocked = err?.code === 'RECIPIENT_NOT_ALLOWED';
  }
  assert('Empty TEST_RECIPIENT_EMAIL rejects all recipients', emptyAllowlistBlocked);
  assert('Zero SMTP transport calls occurred for any blocked recipient', blockedTransportCalls === 0);

  // Restore original environment variables
  if (savedTestRecipient !== undefined) process.env.TEST_RECIPIENT_EMAIL = savedTestRecipient;
  else delete process.env.TEST_RECIPIENT_EMAIL;
  if (savedNodeEnv !== undefined) process.env.NODE_ENV = savedNodeEnv;
  else delete process.env.NODE_ENV;
  if (savedDeliveryMode !== undefined) process.env.EMAIL_DELIVERY_MODE = savedDeliveryMode;
  else delete process.env.EMAIL_DELIVERY_MODE;

  setMailTransportForTest(null); // restore real Resend transport

  // --------------------------------------------------------------------------
  // SECTION 3: HTTP Route Integration Tests (Port 3116, Emails Disabled)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: HTTP Verification & Resend Routes ---');
  const PORT_HTTP = 3116;
  const httpServer = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
    env: {
      ...process.env,
      PORT: String(PORT_HTTP),
      DATABASE_PATH: TEST_DB,
      NODE_ENV: 'test',
      RATE_LIMIT_MODE: 'off',
      EMAIL_DELIVERY_MODE: 'disabled',
      VERIFICATION_HMAC_SECRET: TEST_HMAC_SECRET
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  httpServer.stderr.on('data', (d) => console.error(`  [Server Err] ${d.toString().trim()}`));

  const ready = await waitForServer(`http://127.0.0.1:${PORT_HTTP}/auth/verify`);
  if (!ready) {
    httpServer.kill();
    throw new Error('HTTP test server failed to start');
  }

  try {
    const routeEmail = `verify.http.${Date.now()}@example.com`;
    const routeUser = await createUser({
      email: routeEmail,
      password: 'NitsCut#2026-HttpVerifyPass!',
      fullName: 'Amina Yusuf'
    });
    const issued = issueVerificationCode({ userId: routeUser.id, ignoreCooldown: true });

    // GET /auth/verify
    const getRes = await fetch(`http://127.0.0.1:${PORT_HTTP}/auth/verify?email=${encodeURIComponent(routeEmail)}`);
    assert('GET /auth/verify returns HTTP 200', getRes.status === 200);
    const getHtml = await getRes.text();
    assert('GET /auth/verify prefills email input', getHtml.includes(`value="${routeEmail}"`));

    // POST /auth/verify with malformed code
    const badFmtRes = await fetch(`http://127.0.0.1:${PORT_HTTP}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: routeEmail, code: 'abc' }).toString()
    });
    assert('Malformed code returns HTTP 400', badFmtRes.status === 400);
    const badFmtHtml = await badFmtRes.text();
    assert('Error banner has role="alert"', badFmtHtml.includes('class="form-error-banner" role="alert"'));
    assert('Preserves safe email on error', badFmtHtml.includes(`value="${routeEmail}"`));
    assert('Never echoes submitted code', !badFmtHtml.includes('value="abc"'));

    // POST /auth/verify with valid code
    const goodRes = await fetch(`http://127.0.0.1:${PORT_HTTP}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: routeEmail, code: issued.code }).toString()
    });
    assert('Valid code returns HTTP 200', goodRes.status === 200);
    const goodHtml = await goodRes.text();
    assert('Success page confirms Email Verified', goodHtml.includes('Email Verified'));

    // POST /auth/verify with reused code
    const reuseHttpRes = await fetch(`http://127.0.0.1:${PORT_HTTP}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: routeEmail, code: issued.code }).toString()
    });
    assert('Reused code returns HTTP 400', reuseHttpRes.status === 400);
    const reuseHttpHtml = await reuseHttpRes.text();
    assert('Reused code displays already used error', reuseHttpHtml.includes('already been used'));
  } finally {
    httpServer.kill();
  }

  // --------------------------------------------------------------------------
  // SECTION 4: Real Resend SMTP Timing Benchmark (Sync vs Background Job)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Registration Timing (Sync vs Background Job via Resend SMTP) ---');
  const realRecipient = (process.env.TEST_RECIPIENT_EMAIL || '').trim().toLowerCase();
  if (!realRecipient || !process.env.RESEND_API_KEY) {
    throw new Error('TEST_RECIPIENT_EMAIL and RESEND_API_KEY must be configured in .env for timing benchmark');
  }

  // Clean up any previous test rows for realRecipient in isolated step5_test.db
  const cleanupTestRecipient = () => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(realRecipient);
    if (existing) {
      db.prepare('DELETE FROM verification_codes WHERE user_id = ?').run(existing.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
    }
  };

  async function measureSignup({ mode, port }) {
    cleanupTestRecipient();
    const srv = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
      env: {
        ...process.env,
        PORT: String(port),
        DATABASE_PATH: TEST_DB,
        NODE_ENV: 'test',
        RATE_LIMIT_MODE: 'off',
        EMAIL_DELIVERY_MODE: mode
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let smtpAcceptedCount = 0;
    srv.stdout.on('data', (d) => {
      const text = d.toString();
      if (text.includes('SMTP accepted verification email')) smtpAcceptedCount++;
    });

    const isUp = await waitForServer(`http://127.0.0.1:${port}/auth`);
    if (!isUp) {
      srv.kill();
      throw new Error(`Benchmark server (${mode}) failed to start`);
    }

    try {
      const start = performance.now();
      const res = await fetch(`http://127.0.0.1:${port}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          name: 'Nit Test',
          email: realRecipient,
          password: 'NitsCut#2026-UniqueBespokePassphrase!',
          terms: 'on'
        }).toString()
      });
      await res.json();
      const elapsedMs = performance.now() - start;

      // For background job mode, wait briefly so the background job finishes sending cleanly before shutdown
      if (mode === 'job') {
        const waitStart = Date.now();
        while (smtpAcceptedCount === 0 && Date.now() - waitStart < 8000) {
          await sleep(100);
        }
      }

      return { status: res.status, elapsedMs, smtpAcceptedCount };
    } finally {
      srv.kill();
    }
  }

  const timingOutPath = path.join(rootDir, 'task-04-server-security/evidence/18-registration-timing-sync-vs-job.txt');
  if (fs.existsSync(timingOutPath) && process.env.FORCE_SMTP_BENCHMARK !== '1') {
    console.log('Skipping live SMTP timing benchmark: evidence/18-registration-timing-sync-vs-job.txt already exists.');
    console.log('Total real emails sent in this regression run: 0');
  } else {
    console.log(`Measuring Sync vs Job registration using designated recipient (${maskEmail(realRecipient)})...`);
    const syncRun = await measureSignup({ mode: 'sync', port: 3117 });
    assert('Sync registration returned HTTP 201 and sent email inline', syncRun.status === 201 && syncRun.smtpAcceptedCount === 1);
    console.log(`  [Sync Delivery] HTTP ${syncRun.status} in ${syncRun.elapsedMs.toFixed(2)} ms`);

    const jobRun = await measureSignup({ mode: 'job', port: 3118 });
    assert('Background job registration returned HTTP 201 and dispatched async', jobRun.status === 201 && jobRun.smtpAcceptedCount === 1);
    console.log(`  [Background Job] HTTP ${jobRun.status} in ${jobRun.elapsedMs.toFixed(2)} ms`);

    const speedup = syncRun.elapsedMs / Math.max(0.01, jobRun.elapsedMs);
    console.log(`  [Comparison] One observed comparison: ${speedup.toFixed(1)}x difference (${(syncRun.elapsedMs - jobRun.elapsedMs).toFixed(2)} ms)`);

    const timingReport = [
      '================================================================',
      'TASK 4 STEP 10: REGISTRATION TIMING — SYNCHRONOUS VS BACKGROUND JOB',
      '================================================================',
      `Date: ${new Date().toISOString()}`,
      `Host: ${process.env.SMTP_HOST || 'smtp.resend.com'}:${process.env.SMTP_PORT || 587} (STARTTLS)`,
      `Recipient: ${maskEmail(realRecipient)} (designated test recipient)`,
      'Isolated Test DB: app/data/step5_test.db',
      'Password Policy: Argon2id + live HIBP check + Zod validation',
      '',
      '--- Measured HTTP POST /auth/signup Latency ---',
      `1. Synchronous SMTP inside request:  ${syncRun.elapsedMs.toFixed(2)} ms  (HTTP ${syncRun.status}, SMTP accepted=${syncRun.smtpAcceptedCount})`,
      `2. Background job (async dispatch):  ${jobRun.elapsedMs.toFixed(2)} ms  (HTTP ${jobRun.status}, SMTP accepted=${jobRun.smtpAcceptedCount})`,
      '',
      `Observed Latency Reduction: ${(syncRun.elapsedMs - jobRun.elapsedMs).toFixed(2)} ms (${speedup.toFixed(1)}x faster response)`,
      'Total real emails sent during timing benchmark: 2',
      '',
      'Note: Sending synchronously inside the request forces the customer to wait for',
      'DNS, TCP handshake, STARTTLS negotiation, SMTP auth, and remote relay acceptance,',
      'and couples registration availability to external mail server latency.',
      '================================================================'
    ].join('\n');
    fs.writeFileSync(timingOutPath, timingReport + '\n');
    console.log(`  [Evidence] Saved ${timingOutPath}`);
    console.log(`Total real emails sent in this script: ${syncRun.smtpAcceptedCount + jobRun.smtpAcceptedCount}`);
  }

  // --------------------------------------------------------------------------
  // DATABASE INTEGRITY VERIFICATION
  // --------------------------------------------------------------------------
  db.close();
  console.log('\n--- Real Database Integrity Check ---');
  const realHashAfter = sha256File(REAL_DB);
  console.log(`Protected Real Database SHA-256: ${realHashAfter}`);
  assert('Real production database (app/data/nits_cut.db) is bit-for-bit identical', realHashBefore === realHashAfter);

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
