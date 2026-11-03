import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'evidence');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const CDP_PORT = 9355;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-step4-capture',
  '--window-size=1200,900',
  `${BASE}/orders/lookup?version=number`
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

  // ==========================================
  // PART 1: NUMBER INPUT ANNOYING (09 SEQUENCE)
  // ==========================================
  console.log('\n--- CAPTURING 09 NUMBER INPUT DEFECTS ---');
  await send('Page.navigate', { url: `${BASE}/orders/lookup?version=number` });
  await sleep(1000);

  // Screenshot 1: Starting value set to 0
  await captureCard('09a-number-input-starting-zero.png');

  // Screenshot 2: Typing 400 after 0 produces 0400
  await evaluate(`(() => {
    const input = document.getElementById('order-ref-num');
    input.focus();
    input.value = '0400';
  })()`);
  await sleep(400);
  await captureCard('09b-number-input-typing-0400.png');

  // Screenshot 3: User deletes leading zero, or enters 0042, and submits
  await evaluate(`(() => {
    const input = document.getElementById('order-ref-num');
    input.value = '0042';
  })()`);
  await sleep(400);
  await captureCard('09c-number-input-entering-0042.png');

  // Submit number input to observe submitted value
  await evaluate(`document.querySelector('form').submit()`);
  await sleep(1000);

  const numberSubmitResult = await evaluate(`(() => {
    return {
      url: location.href,
      h1: document.querySelector('h1').textContent.trim(),
      raw: document.body.innerText
    };
  })()`);
  console.log('Number Input submission result summary:\n', numberSubmitResult.raw.substring(0, 300));

  // ==========================================
  // PART 2: TEXT INPUT WORKING (10 SEQUENCE)
  // ==========================================
  console.log('\n--- CAPTURING 10 TEXT INPUT WORKING ---');
  await send('Page.navigate', { url: `${BASE}/orders/lookup?version=text` });
  await sleep(1000);

  // Screenshot 1: Clean text input with numeric mode and placeholder
  await captureCard('10a-text-input-clean-placeholder.png');

  // Screenshot 2: Typing / pasting 0042 preserves all digits
  await evaluate(`(() => {
    const input = document.getElementById('order-ref-text');
    input.focus();
    input.value = '0042';
    input.dispatchEvent(new Event('input'));
  })()`);
  await sleep(400);
  await captureCard('10b-text-input-typing-0042.png');

  // Submit text input to observe submitted value
  await evaluate(`document.querySelector('form').submit()`);
  await sleep(1000);

  // Screenshot 3: Result page confirming raw string "0042" preserved
  await captureCard('10c-text-input-result-preserved.png');

  const textSubmitResult = await evaluate(`(() => {
    return {
      url: location.href,
      raw: document.body.innerText
    };
  })()`);
  console.log('Text Input submission result summary:\n', textSubmitResult.raw.substring(0, 300));

  ws.close();
} finally {
  chromeProc.kill();
}

