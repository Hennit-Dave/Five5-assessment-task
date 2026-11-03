import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'evidence');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const CDP_PORT = 9350;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-validation-capture',
  '--window-size=1200,900',
  `${BASE}/auth?mode=signup`
]);

await sleep(1500);

try {
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (msg) => {
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result || msg);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

  await send('Page.enable');

  // Helper to capture screenshot of the active card
  async function captureCard(filename) {
    const clip = await evaluate(`(() => {
      const card = document.querySelector('.card:not([hidden])') || document.querySelector('.card');
      const r = card.getBoundingClientRect();
      return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40, scale: 2 };
    })()`);

    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      clip: clip
    });
    const outPath = join(OUT_DIR, filename);
    writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`Saved ${filename} (${(data.length * 0.75 / 1024).toFixed(1)} KB)`);
  }

  // 1. Capture 05-empty-field-error.png
  // Focus signup-name and blur without typing
  console.log('Capturing 05-empty-field-error.png...');
  await send('Page.navigate', { url: `${BASE}/auth?mode=signup` });
  await sleep(1000);
  await evaluate(`(() => {
    const name = document.getElementById('signup-name');
    name.focus();
    name.blur();
  })()`);
  await sleep(500);
  await captureCard('05-empty-field-error.png');

  // 2. Capture 06-length-rule-blocking.png
  // Type a single token "a" and password "short"
  console.log('Capturing 06-length-rule-blocking.png...');
  await evaluate(`(() => {
    const name = document.getElementById('signup-name');
    name.value = 'a';
    name.dispatchEvent(new Event('input'));
    name.blur();

    const pwd = document.getElementById('signup-password');
    pwd.value = '12345678901234'; // 14 chars, blocks on 15-char rule
    pwd.dispatchEvent(new Event('input'));
    pwd.blur();
  })()`);
  await sleep(500);
  await captureCard('06-length-rule-blocking.png');

  // 3. Capture 07-email-realtime-signup.png
  // On signup, type malformed email in real time
  console.log('Capturing 07-email-realtime-signup.png...');
  await send('Page.navigate', { url: `${BASE}/auth?mode=signup` });
  await sleep(1000);
  await evaluate(`(() => {
    document.getElementById('signup-name').value = 'Babatunde';
    const email = document.getElementById('signup-email');
    email.focus();
    email.value = 'babatunde@';
    email.dispatchEvent(new Event('input'));
  })()`);
  await sleep(500);
  await captureCard('07-email-realtime-signup.png');

  // 4. Capture 08-email-on-submit-login.png
  // On login, type malformed email without error on input, then submit to trigger error
  console.log('Capturing 08-email-on-submit-login.png...');
  await send('Page.navigate', { url: `${BASE}/auth?mode=login` });
  await sleep(1000);
  await evaluate(`(() => {
    const email = document.getElementById('login-email');
    email.focus();
    email.value = 'chinedu@notanemail';
    email.dispatchEvent(new Event('input'));
    // Do not blur; click submit directly to prove submit-time triggering
    document.querySelector('[data-auth-form="login"] button[type="submit"]').click();
  })()`);
  await sleep(500);
  await captureCard('08-email-on-submit-login.png');

  ws.close();
} finally {
  chromeProc.kill();
}
