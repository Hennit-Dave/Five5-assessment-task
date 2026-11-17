// capture-step5-evidence.mjs
// Drives real headless Chrome via DevTools Protocol (CDP) to interact with the
// authentication application on an isolated database and capture authentic evidence panels.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const PORT = 3105;
const CDP_PORT = 9405;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const MIGRATIONS_DIR = path.join(rootDir, 'app/migrations');
const EVIDENCE_DIR = path.join(rootDir, 'task-04-server-security/evidence');
const TMP_DIR = path.join(EVIDENCE_DIR, 'tmp-step5');

fs.mkdirSync(TMP_DIR, { recursive: true });

// 1. Verify isolated test database without running migrations
console.log(`[Setup] Verifying isolated test database at ${TEST_DB}...`);
if (!fs.existsSync(TEST_DB)) {
  console.error(`[Error] Test database ${TEST_DB} not found.`);
  process.exit(1);
}
const Database = (await import('../../app/node_modules/better-sqlite3/lib/index.js')).default;
const testDb = new Database(TEST_DB, { readonly: true });
const tableCheck = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!tableCheck) {
  console.error('[Error] Existing test database lacks users table. Stopping per instructions.');
  testDb.close();
  process.exit(1);
}
testDb.close();
console.log('[Setup] Test database schema verified. No migrations executed.');

// 2. Start Express app on isolated port pointing to test database
console.log(`[Setup] Starting Express server on port ${PORT}...`);
const serverProc = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATABASE_PATH: TEST_DB,
    NODE_ENV: 'test',
    RATE_LIMIT_MODE: 'off'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

serverProc.stdout.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.log(`  [App Server] ${line}`);
});
serverProc.stderr.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.error(`  [App Server Error] ${line}`);
});

// Wait for server to be responsive
let serverReady = false;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(`${BASE_URL}/auth?mode=login`);
    if (res.ok) {
      serverReady = true;
      break;
    }
  } catch {}
  await sleep(200);
}
if (!serverReady) {
  serverProc.kill();
  throw new Error('Express server failed to start within timeout');
}
console.log('[Setup] Express server is ready.');

// 3. Launch Google Chrome headless
console.log(`[Setup] Launching Google Chrome headless with CDP port ${CDP_PORT}...`);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_PROFILE = '/tmp/chrome-step5-profile';
if (fs.existsSync(CHROME_PROFILE)) {
  fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
}

const chromeProc = spawn(CHROME_PATH, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${CHROME_PROFILE}`,
  '--window-size=1280,960',
  `${BASE_URL}/auth?mode=signup`
]);

await sleep(1500);

let ws;
try {
  const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) throw new Error('No page target found in Chrome');

  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

  let msgId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result || msg);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result.value;
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await sleep(600);
  };

  const captureCard = async (outputPath) => {
    const clip = await evaluate(`(() => {
      const card = document.querySelector('.card:not([hidden])') || document.querySelector('.card');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return {
        x: Math.max(0, r.left - 16),
        y: Math.max(0, r.top - 16),
        width: Math.ceil(r.width + 32),
        height: Math.ceil(r.height + 32),
        scale: 2
      };
    })()`);

    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: clip || undefined
    });
    fs.writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`  [Screenshot] Saved: ${path.basename(outputPath)} (${Math.round(screenshot.data.length * 0.75 / 1024)} KB)`);
  };

  await send('Page.enable');
  await send('DOM.enable');

  // =========================================================================
  // SCENARIO 1: EMAIL NORMALIZATION
  // =========================================================================
  console.log('\n--- Capturing Scenario 1: Email Case Normalization ---');

  // 1a. Fill signup form with uppercase / mixed-case email
  await navigate(`${BASE_URL}/auth?mode=signup`);
  await evaluate(`(() => {
    const nameEl = document.getElementById('signup-name');
    const emailEl = document.getElementById('signup-email');
    const pwEl = document.getElementById('signup-password');
    const termsEl = document.getElementById('signup-terms');

    nameEl.value = 'Simi Adeyemi';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));

    emailEl.value = 'Simi.Adeyemi@EXAMPLE.COM';
    emailEl.dispatchEvent(new Event('input', { bubbles: true }));

    pwEl.value = 'BespokeKaftan#2026!';
    pwEl.dispatchEvent(new Event('input', { bubbles: true }));

    termsEl.checked = true;
    termsEl.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(400);

  const panel09a = path.join(TMP_DIR, '09a-signup-mixed-case.png');
  await captureCard(panel09a);

  // Submit signup form
  await evaluate(`document.querySelector('[data-auth-form="signup"] form').submit()`);
  await sleep(1000);

  // 1b. Navigate to login form and log in using ALL LOWERCASE email
  await navigate(`${BASE_URL}/auth?mode=login`);
  await evaluate(`(() => {
    const emailEl = document.getElementById('login-email');
    const pwEl = document.getElementById('login-password');

    emailEl.value = 'simi.adeyemi@example.com';
    emailEl.dispatchEvent(new Event('input', { bubbles: true }));

    pwEl.value = 'BespokeKaftan#2026!';
    pwEl.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);

  // Submit login form
  await evaluate(`document.querySelector('[data-auth-form="login"] form').submit()`);
  await sleep(1000);

  const panel09b = path.join(TMP_DIR, '09b-login-lowercase-success.png');
  await captureCard(panel09b);

  // =========================================================================
  // SCENARIO 2: PASSWORD TRIMMING
  // =========================================================================
  console.log('\n--- Capturing Scenario 2: Password Whitespace Trimming ---');

  // 2a. Fill signup form with password containing trailing spaces
  await navigate(`${BASE_URL}/auth?mode=signup`);
  await evaluate(`(() => {
    const nameEl = document.getElementById('signup-name');
    const emailEl = document.getElementById('signup-email');
    const pwEl = document.getElementById('signup-password');
    const termsEl = document.getElementById('signup-terms');

    nameEl.value = 'Kolawole Davies';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));

    emailEl.value = 'kola.davies@example.com';
    emailEl.dispatchEvent(new Event('input', { bubbles: true }));

    pwEl.value = 'BespokeKaftan#2026!   '; // 3 trailing spaces
    pwEl.dispatchEvent(new Event('input', { bubbles: true }));

    termsEl.checked = true;
    termsEl.dispatchEvent(new Event('change', { bubbles: true }));

    // Click password visibility toggle to make trailing spaces visually evident
    const toggleBtn = document.querySelector('[data-auth-form="signup"] .password-toggle-btn');
    if (toggleBtn) toggleBtn.click();
  })()`);
  await sleep(400);

  const panel10a = path.join(TMP_DIR, '10a-signup-trailing-space.png');
  await captureCard(panel10a);

  // Submit signup form
  await evaluate(`document.querySelector('[data-auth-form="signup"] form').submit()`);
  await sleep(1000);

  // 2b. Navigate to login form, enter password WITHOUT trailing spaces, show password toggle
  await navigate(`${BASE_URL}/auth?mode=login`);
  await evaluate(`(() => {
    const emailEl = document.getElementById('login-email');
    const pwEl = document.getElementById('login-password');

    emailEl.value = 'kola.davies@example.com';
    emailEl.dispatchEvent(new Event('input', { bubbles: true }));

    pwEl.value = 'BespokeKaftan#2026!'; // Clean trimmed password
    pwEl.dispatchEvent(new Event('input', { bubbles: true }));

    const toggleBtn = document.querySelector('[data-auth-form="login"] .password-toggle-btn');
    if (toggleBtn) toggleBtn.click();
  })()`);
  await sleep(400);

  const panel10b = path.join(TMP_DIR, '10b-login-trimmed-password.png');
  await captureCard(panel10b);

  // Submit login form
  await evaluate(`document.querySelector('[data-auth-form="login"] form').submit()`);
  await sleep(1000);

  const panel10c = path.join(TMP_DIR, '10c-login-success-result.png');
  await captureCard(panel10c);

  console.log('\n[Capture] All panels captured successfully.');

} finally {
  if (ws) ws.close();
  chromeProc.kill();
  serverProc.kill();
}
