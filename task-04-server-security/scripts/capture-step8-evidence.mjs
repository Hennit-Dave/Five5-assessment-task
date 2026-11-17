// capture-step8-evidence.mjs
// Drives headless Chrome via CDP to trigger the rate limit on login (5 attempts),
// observe the 6th attempt returning HTTP 429, and capture evidence/13-rate-limit-triggered.png.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const PORT = 3112;
const CDP_PORT = 9408;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const EVIDENCE_FILE = path.join(rootDir, 'task-04-server-security/evidence/13-rate-limit-triggered.png');

if (fs.existsSync(EVIDENCE_FILE)) {
  console.error(`Refusing to overwrite existing evidence: ${EVIDENCE_FILE}`);
  process.exit(1);
}

// 1. Start Express app on isolated port pointing to test database with rate limiting ON
console.log(`[Setup] Starting Express server on port ${PORT}...`);
const serverProc = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATABASE_PATH: TEST_DB,
    RATE_LIMIT_MODE: 'on'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

serverProc.stdout.on('data', () => {});
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

// 2. Launch Google Chrome headless
console.log(`[Setup] Launching Google Chrome headless with CDP port ${CDP_PORT}...`);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_PROFILE = '/tmp/chrome-step8-profile';
if (fs.existsSync(CHROME_PROFILE)) {
  fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
}

const chromeProc = spawn(CHROME_PATH, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${CHROME_PROFILE}`,
  '--window-size=1280,960',
  `${BASE_URL}/auth?mode=login`
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

  console.log('\n--- Exhausting Login Rate Limit (5 attempts allowed) ---');
  await navigate(`${BASE_URL}/auth?mode=login`);

  // Fill in email and password
  await evaluate(`(() => {
    const emailEl = document.getElementById('login-email');
    const pwEl = document.getElementById('login-password');
    emailEl.value = 'ade.kolawole@example.com';
    emailEl.dispatchEvent(new Event('input', { bubbles: true }));
    pwEl.value = 'WrongPasswordAttempt#1';
    pwEl.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);

  // Submit attempts 1 through 5 (these consume the limit: status 401)
  for (let i = 1; i <= 5; i++) {
    console.log(`  Attempt ${i}: Submitting login...`);
    await evaluate(`document.querySelector('[data-auth-form="login"] form').submit()`);
    await sleep(800);
    // After reload, re-enter password so client validation doesn't block submission
    await evaluate(`(() => {
      const pwEl = document.getElementById('login-password');
      if (pwEl) {
        pwEl.value = 'WrongPasswordAttempt#${i + 1}';
        pwEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await sleep(200);
  }

  // Attempt 6 triggers rate limit (HTTP 429)
  console.log(`  Attempt 6: Submitting 6th request to trigger HTTP 429...`);
  await evaluate(`document.querySelector('[data-auth-form="login"] form').submit()`);
  await sleep(1000);

  // Check that the error banner contains the 429 message
  const bannerText = await evaluate(`(() => {
    const b = document.querySelector('.form-error-banner');
    return b ? b.textContent.trim() : null;
  })()`);
  console.log(`  [Page State] Form error banner text: "${bannerText}"`);

  const preservedEmail = await evaluate(`(() => {
    const el = document.getElementById('login-email');
    return el ? el.value : null;
  })()`);
  console.log(`  [Page State] Preserved email: "${preservedEmail}"`);

  const passwordVal = await evaluate(`(() => {
    const el = document.getElementById('login-password');
    return el ? el.value : null;
  })()`);
  console.log(`  [Page State] Password input value: "${passwordVal}" (must be empty)`);

  if (!bannerText || !bannerText.includes('Too many attempts')) {
    throw new Error(`Expected rate limit banner text, got: ${bannerText}`);
  }

  console.log(`\n--- Capturing Evidence 13 ---`);
  await captureCard(EVIDENCE_FILE);
  console.log(`[Success] Evidence 13 captured to: ${EVIDENCE_FILE}`);

} finally {
  if (ws) ws.close();
  chromeProc.kill();
  serverProc.kill();
}
