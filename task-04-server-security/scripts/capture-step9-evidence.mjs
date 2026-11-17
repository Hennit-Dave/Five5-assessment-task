import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const PORT = 3115;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CDP_PORT = 9225;
const OUT_FILE = path.join(rootDir, 'task-04-server-security/evidence/15-breach-check-rejection.png');

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('================================================================');
  console.log('TASK 4 STEP 9: CAPTURE LIVE BREACH REJECTION EVIDENCE');
  console.log('================================================================');

  const realDbHashBefore = sha256File(REAL_DB);
  console.log(`[Safety] Real DB SHA-256 before: ${realDbHashBefore}`);

  // 1. Start Express server with live HIBP configuration
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

  serverProc.stderr.on('data', (d) => {
    const text = d.toString().trim();
    if (text) console.error(`  [Server Stderr] ${text}`);
  });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/auth?mode=signup`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await sleep(200);
  }
  if (!serverReady) {
    serverProc.kill();
    throw new Error('Server failed to start within timeout');
  }
  console.log('[Setup] Express server is ready.');

  // 2. Launch Google Chrome headless with remote debugging
  console.log(`[Setup] Launching headless Chrome with CDP on port ${CDP_PORT}...`);
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const CHROME_PROFILE = '/tmp/chrome-step9-profile';
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
    if (!pageTarget) throw new Error('No page target found in Chrome CDP');

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

    await send('Page.enable');
    await send('DOM.enable');

    console.log('[Browser] Navigating to signup form...');
    await navigate(`${BASE_URL}/auth?mode=signup`);

    // Fill form with valid fields and live-confirmed breached password
    console.log('[Browser] Populating registration form with breached test password...');
    await evaluate(`(() => {
      const nameEl = document.getElementById('signup-name');
      const emailEl = document.getElementById('signup-email');
      const pwEl = document.getElementById('signup-password');
      const termsEl = document.getElementById('signup-terms');

      nameEl.value = 'Ade Kolawole';
      nameEl.dispatchEvent(new Event('input', { bubbles: true }));

      emailEl.value = 'ade.kolawole@example.com';
      emailEl.dispatchEvent(new Event('input', { bubbles: true }));

      pwEl.value = 'password12345678';
      pwEl.dispatchEvent(new Event('input', { bubbles: true }));

      if (termsEl) {
        termsEl.checked = true;
        termsEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);

    await sleep(400);

    // Submit form and wait for live HIBP API response & render
    console.log('[Browser] Submitting registration form (querying live HIBP API)...');
    await evaluate(`(() => {
      const form = document.querySelector('form[action="/auth/signup"]');
      if (form) form.submit();
    })()`);

    // Wait for the round trip through HIBP range API and server re-render
    await sleep(2500);

    // Verify rejection elements in DOM
    const bannerText = await evaluate(`(() => {
      const b = document.querySelector('.form-error-banner');
      return b ? b.innerText.trim() : null;
    })()`);
    console.log(`[Browser] Rendered Error Banner: "${bannerText}"`);

    const preservedName = await evaluate(`(() => document.getElementById('signup-name')?.value)()`);
    const preservedEmail = await evaluate(`(() => document.getElementById('signup-email')?.value)()`);
    const passwordField = await evaluate(`(() => document.getElementById('signup-password')?.value)()`);

    console.log(`[Browser] Preserved Name: "${preservedName}"`);
    console.log(`[Browser] Preserved Email: "${preservedEmail}"`);
    console.log(`[Browser] Password Value (must be empty): "${passwordField}"`);

    if (!bannerText || !bannerText.includes('known data breach')) {
      throw new Error(`Expected breach rejection banner, got: ${bannerText}`);
    }

    // Capture screenshot of the auth card
    console.log(`[Browser] Capturing screenshot of rejection card...`);
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

    fs.writeFileSync(OUT_FILE, Buffer.from(screenshot.data, 'base64'));
    const sizeKb = Math.round((screenshot.data.length * 0.75) / 1024);
    console.log(`[Evidence] Saved: ${OUT_FILE} (${sizeKb} KB)`);
  } finally {
    if (ws) ws.close();
    chromeProc.kill();
    serverProc.kill();
    await sleep(500);
    try {
      if (fs.existsSync(CHROME_PROFILE)) {
        fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
      }
    } catch {}
  }

  // Safety check on production DB
  const realDbHashAfter = sha256File(REAL_DB);
  console.log(`[Safety] Real DB SHA-256 after: ${realDbHashAfter}`);
  if (realDbHashBefore !== realDbHashAfter) {
    throw new Error('CRITICAL: Real database was modified!');
  }
  console.log('[Safety] Real production database is 100% untouched.');
  console.log('\nStep 9 visual evidence captured successfully.');
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
