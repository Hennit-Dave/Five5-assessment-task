import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9352;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-val-test',
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

  console.log('=== TEST 1: PASSWORD POLICY & UNICODE BOUNDARY TESTS (SIGNUP) ===');
  
  // 14 characters boundary
  const test14 = await evaluate(`(() => {
    const p = document.getElementById('signup-password');
    p.value = '12345678901234'; // exactly 14 characters
    p.focus();
    p.blur();
    const err = document.getElementById('signup-password-error');
    return { value: p.value, length: p.value.length, invalid: p.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('14 characters boundary:', test14);

  // 15 characters boundary
  const test15 = await evaluate(`(() => {
    const p = document.getElementById('signup-password');
    p.value = '123456789012345'; // exactly 15 characters
    p.focus();
    p.blur();
    const err = document.getElementById('signup-password-error');
    return { value: p.value, length: p.value.length, invalid: p.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('15 characters boundary:', test15);

  // All-spaces input (15 spaces)
  const testSpaces = await evaluate(`(() => {
    const p = document.getElementById('signup-password');
    p.value = '               '; // 15 spaces
    p.focus();
    p.blur();
    const err = document.getElementById('signup-password-error');
    return { length: p.value.length, invalid: p.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('All-spaces password (15 spaces):', testSpaces);

  // Passphrase with spaces
  const testPassphrase = await evaluate(`(() => {
    const p = document.getElementById('signup-password');
    p.value = 'bespoke lagos suit 2026'; // 23 characters with spaces
    p.focus();
    p.blur();
    const err = document.getElementById('signup-password-error');
    return { value: p.value, length: p.value.length, invalid: p.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('Passphrase containing spaces:', testPassphrase);

  // Unicode code points test (e.g. 15 code points including multi-byte emoji)
  const testUnicode = await evaluate(`(() => {
    const p = document.getElementById('signup-password');
    // 'Babatunde ✂️ 🧵 26' has 15 Unicode code points
    p.value = 'Babatunde ✂️ 🧵 26';
    const codePoints = Array.from(p.value).length;
    p.focus();
    p.blur();
    const err = document.getElementById('signup-password-error');
    return { value: p.value, codePoints, invalid: p.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('Unicode code points test:', testUnicode);

  console.log('\n=== TEST 2: LOGIN EMAIL SUBMIT-ONLY FORMAT SEQUENCE ===');
  await send('Page.navigate', { url: `${BASE}/auth?mode=login` });
  await sleep(1000);

  // Step 2a: Focus empty email and leave it (blur 1)
  const blur1 = await evaluate(`(() => {
    const email = document.getElementById('login-email');
    email.value = '';
    email.focus();
    email.blur();
    const err = document.getElementById('login-email-error');
    return { invalid: email.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('Step 2a - Blur 1 (empty field):', blur1);

  // Step 2b: Return and type malformed address, then leave it (blur 2)
  const blur2 = await evaluate(`(() => {
    const email = document.getElementById('login-email');
    email.focus();
    email.value = 'chinedu@notanemail';
    email.dispatchEvent(new Event('input'));
    email.blur();
    const err = document.getElementById('login-email-error');
    return { invalid: email.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('Step 2b - Blur 2 (after typing malformed address):', blur2);

  // Step 2c: Submit login form -> format error should now appear and field should be focused
  const submitCheck = await evaluate(`(() => {
    const form = document.querySelector('[data-auth-form="login"] form');
    const email = document.getElementById('login-email');
    // Click submit
    form.querySelector('button[type="submit"]').click();
    const err = document.getElementById('login-email-error');
    const isFocused = document.activeElement === email;
    return { invalid: email.getAttribute('aria-invalid'), errorText: err.textContent.trim(), isFocused };
  })()`);
  console.log('Step 2c - Submit (triggers format error & focus):', submitCheck);

  console.log('\n=== TEST 3: LIVE EMAIL FORMAT ON SIGNUP ===');
  await send('Page.navigate', { url: `${BASE}/auth?mode=signup` });
  await sleep(1000);

  const signupLive = await evaluate(`(() => {
    const email = document.getElementById('signup-email');
    email.focus();
    email.value = 'babatunde@';
    email.dispatchEvent(new Event('input'));
    const errTyping = document.getElementById('signup-email-error').textContent.trim();

    email.value = 'babatunde@example.test';
    email.dispatchEvent(new Event('input'));
    const errValid = document.getElementById('signup-email-error').textContent.trim();

    return { whileMalformed: errTyping, onceValid: errValid };
  })()`);
  console.log('Signup live format feedback:', signupLive);

  console.log('\n=== TEST 4: LOGIN PASSWORD (SEPARATE POLICY FROM SIGNUP) ===');
  await send('Page.navigate', { url: `${BASE}/auth?mode=login` });
  await sleep(1000);

  const loginPasswordShort = await evaluate(`(() => {
    const p = document.getElementById('login-password');
    p.value = 'short'; // 5 chars: would fail signup's 15-char rule
    p.focus();
    p.blur();
    const err = document.getElementById('login-password-error');
    return { value: p.value, invalid: p.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);
  console.log('Login password short (5 chars):', loginPasswordShort);

  ws.close();
} finally {
  chromeProc.kill();
}
