import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'evidence');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const CDP_PORT = 9367;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-real-step4-v2',
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
  // PART 1: NUMBER INPUT REAL INTERACTION (E09)
  // ==========================================
  console.log('\n--- EXERCISING REAL BROWSER INPUT FOR E09 (NUMBER INPUT) ---');
  await send('Page.navigate', { url: `${BASE}/orders/lookup?version=number` });
  await sleep(1000);

  // Panel 1: Initial state showing starting 0
  const initialNumVal = await evaluate(`document.getElementById('order-ref-num').value`);
  console.log(`Panel 1 initial value: "${initialNumVal}"`);
  await captureCard('09a-number-input-starting-zero.png');

  // Click input with left mouse button
  const numBox = await evaluate(`(() => {
    const el = document.getElementById('order-ref-num');
    const r = el.getBoundingClientRect();
    return { x: r.left + 50, y: r.top + r.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: numBox.x, y: numBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: numBox.x, y: numBox.y, button: 'left', clickCount: 1 });
  await sleep(100);

  // Place cursor after the 0
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(50);

  // Type 4, 0, 0 via real keyboard input
  for (const c of ['4', '0', '0']) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: c, unmodifiedText: c, key: c, code: `Digit${c}` });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: c, code: `Digit${c}` });
    await sleep(80);
  }

  const typedVal = await evaluate(`document.getElementById('order-ref-num').value`);
  console.log(`Panel 2 after typing 400: "${typedVal}"`);
  await captureCard('09b-number-input-typing-0400.png');

  // Move cursor left 3 positions (between 0 and 4)
  for (let i = 0; i < 3; i++) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
    await sleep(60);
  }

  // Press Backspace to delete the leading 0
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await sleep(100);

  const correctedVal = await evaluate(`document.getElementById('order-ref-num').value`);
  console.log(`Panel 3 after deleting leading 0 (corrected): "${correctedVal}"`);
  await captureCard('09c-number-input-corrected-400.png');

  // ==========================================
  // PART 2: TEXT INPUT REAL INTERACTION (E10)
  // ==========================================
  console.log('\n--- EXERCISING REAL BROWSER INPUT FOR E10 (TEXT INPUT) ---');
  await send('Page.navigate', { url: `${BASE}/orders/lookup?version=text` });
  await sleep(1000);

  // Panel 1: Initial state showing clean placeholder
  const initialTextVal = await evaluate(`document.getElementById('order-ref-text').value`);
  console.log(`Panel 1 initial text value: "${initialTextVal}"`);
  await captureCard('10a-text-input-clean-placeholder.png');

  // Click input with left mouse button
  const textBox = await evaluate(`(() => {
    const el = document.getElementById('order-ref-text');
    const r = el.getBoundingClientRect();
    return { x: r.left + 50, y: r.top + r.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: textBox.x, y: textBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: textBox.x, y: textBox.y, button: 'left', clickCount: 1 });
  await sleep(100);

  // Type 0, 0, 4, 2 via real keyboard input
  for (const c of ['0', '0', '4', '2']) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: c, unmodifiedText: c, key: c, code: `Digit${c}` });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: c, code: `Digit${c}` });
    await sleep(80);
  }

  const typedTextVal = await evaluate(`document.getElementById('order-ref-text').value`);
  console.log(`Panel 2 after typing 0042: "${typedTextVal}"`);
  await captureCard('10b-text-input-typing-0042.png');

  // Click visible submit button
  const btnBox = await evaluate(`(() => {
    const btn = document.querySelector('button[type=submit]');
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: btnBox.x, y: btnBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btnBox.x, y: btnBox.y, button: 'left', clickCount: 1 });
  await sleep(1500);

  // Panel 3: Result page confirming submitted string and length
  await captureCard('10c-text-input-result-preserved.png');

  const resultBody = await evaluate(`document.body.innerText`);
  const contains0042 = resultBody.includes('"0042"');
  const containsLength4 = resultBody.includes('4 character(s)');
  console.log(`Panel 3 verification - string "0042": ${contains0042}, length 4: ${containsLength4}`);

  // ==========================================
  // PART 3: SEPARATE CHECKS (CLEARING & NON-DIGITS)
  // ==========================================
  console.log('\n--- EXERCISING CLEARING & NON-DIGIT CHECKS ---');
  await send('Page.navigate', { url: `${BASE}/orders/lookup?version=text` });
  await sleep(800);

  // Click input
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: textBox.x, y: textBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: textBox.x, y: textBox.y, button: 'left', clickCount: 1 });
  await sleep(100);

  // Type non-digits: "NC-0042"
  for (const c of ['N', 'C', '-', '0', '0', '4', '2']) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: c, unmodifiedText: c, key: c });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: c });
    await sleep(50);
  }
  const nonDigitVal = await evaluate(`document.getElementById('order-ref-text').value`);
  console.log(`Value after typing "NC-0042" (letters and hyphen rejected): "${nonDigitVal}"`);

  // Clear the field using Backspace repeatedly
  for (let i = 0; i < 4; i++) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await sleep(50);
  }
  const clearedVal = await evaluate(`document.getElementById('order-ref-text').value`);
  console.log(`Value after clearing field: "${clearedVal}"`);

  ws.close();
} finally {
  chromeProc.kill();
}
