import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'evidence');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const CDP_PORT = 9370;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-step5-capture',
  '--window-size=1200,900',
  `${BASE}/auth/recovery?version=revealing`
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

  async function captureCard(filename) {
    const clip = await evaluate(`(() => {
      const card = document.querySelector('.card');
      const r = card.getBoundingClientRect();
      return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40, scale: 2 };
    })()`);

    const res = await send('Page.captureScreenshot', { format: 'png', clip });
    const data = res.data;
    const outPath = join(OUT_DIR, filename);
    writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`Saved ${filename} (${(data.length * 0.75 / 1024).toFixed(1)} KB)`);
  }

  // 1. BEFORE: Revealing Code Shape
  console.log('\n--- CAPTURING BEFORE: REVEALING CODE SHAPE ---');
  await send('Page.navigate', { url: `${BASE}/auth/recovery?version=revealing` });
  await sleep(1000);

  // Capture initial state showing revealing placeholder "e.g. 6-digit PIN: 492018" and helper text
  await captureCard('step5-before-revealing-code-shape.png');

  // Trigger error state revealing length requirement "Code must be exactly 6 digits (numbers only)"
  await evaluate(`(() => {
    const input = document.getElementById('recovery-code-rev');
    input.value = '123';
    document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
  })()`);
  await sleep(300);
  await captureCard('step5-before-revealing-error-state.png');

  // 2. AFTER: Generic Guidance (Protected)
  console.log('\n--- CAPTURING AFTER: GENERIC GUIDANCE (SHAPE PROTECTED) ---');
  await send('Page.navigate', { url: `${BASE}/auth/recovery?version=generic` });
  await sleep(1000);

  // Capture initial state showing clean input and guidance "Enter the code from your recovery message."
  await captureCard('step5-after-generic-code-shape.png');

  // Trigger empty submission error showing generic non-revealing error
  await evaluate(`(() => {
    document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
  })()`);
  await sleep(300);
  await captureCard('step5-after-generic-error-state.png');

  // 3. SUBMISSION TEST
  console.log('\n--- EXERCISING FICTIONAL CODE SUBMISSION ---');
  await send('Page.navigate', { url: `${BASE}/auth/recovery?version=generic` });
  await sleep(800);
  await evaluate(`(() => {
    const input = document.getElementById('recovery-code-gen');
    input.value = '492018';
  })()`);
  await evaluate(`document.querySelector('form').submit()`);
  await sleep(1000);
  await captureCard('step5-after-submission-result.png');

  ws.close();
} finally {
  chromeProc.kill();
}

