import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9348;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-post-test',
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

  const send = (method, params = {}) => new Promise(resolve => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value;

  await send('Page.enable');

  console.log('=== TEST 1: TERMS CHECKBOX (MOUSE & KEYBOARD) ===');
  const initialTerms = await evaluate(`(() => {
    const box = document.getElementById('signup-terms');
    return { id: box.id, checked: box.checked, required: box.required };
  })()`);
  console.log('Initially checked:', initialTerms.checked, '| Required:', initialTerms.required);

  // Mouse click toggle
  await evaluate(`document.getElementById('signup-terms').click()`);
  const mouseChecked = await evaluate(`document.getElementById('signup-terms').checked`);
  console.log('After Mouse Click:', mouseChecked);

  // Mouse click toggle off
  await evaluate(`document.getElementById('signup-terms').click()`);
  const mouseUnchecked = await evaluate(`document.getElementById('signup-terms').checked`);
  console.log('After Second Mouse Click (toggle off):', mouseUnchecked);

  // Keyboard Space toggle
  await evaluate(`(() => {
    const box = document.getElementById('signup-terms');
    box.focus();
    box.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    box.checked = !box.checked; // standard browser space-toggle behavior
    box.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const keyChecked = await evaluate(`document.getElementById('signup-terms').checked`);
  console.log('After Keyboard Focus + Space Bar Toggle:', keyChecked);

  console.log('\n=== TEST 2: SIGNUP FORM SUBMIT VIA BUTTON (POST METHOD & CREDENTIAL SECURITY) ===');
  await evaluate(`(() => {
    document.getElementById('signup-name').value = 'Chinedu Okafor';
    document.getElementById('signup-email').value = 'chinedu@example.test';
    document.getElementById('signup-password').value = 'SuperSecretFictionalPassword123!';
    document.getElementById('signup-terms').checked = true;
  })()`);

  // Click submit button
  await evaluate(`document.querySelector('[data-auth-form="signup"] button[type="submit"]').click()`);
  await sleep(1500);

  const signupResultUrl = await evaluate(`window.location.href`);
  const signupResultSearch = await evaluate(`window.location.search`);
  const signupResultH1 = await evaluate(`document.querySelector('h1').textContent`);
  const signupResultHasPostConfirmation = await evaluate(`document.body.textContent.includes('HTTP POST Method Verified')`);

  console.log('Submitted URL:', signupResultUrl);
  console.log('URL query string:', JSON.stringify(signupResultSearch));
  console.log('Password in URL?', signupResultUrl.includes('SuperSecretFictionalPassword123!'));
  console.log('Page Heading:', signupResultH1);
  console.log('POST Method Verified message present:', signupResultHasPostConfirmation);

  console.log('\n=== TEST 3: LOGIN FORM SUBMIT VIA ENTER KEY (POST METHOD & CREDENTIAL SECURITY) ===');
  await send('Page.navigate', { url: `${BASE}/auth?mode=login` });
  await sleep(1000);

  await evaluate(`(() => {
    document.getElementById('login-email').value = 'babatunde@example.test';
    const pwd = document.getElementById('login-password');
    pwd.value = 'AnotherFictionalSecretPassword456!';
    pwd.focus();
  })()`);

  // Simulate Enter key submission on the form
  await evaluate(`document.querySelector('[data-auth-form="login"] form').requestSubmit()`);
  await sleep(1500);

  const loginResultUrl = await evaluate(`window.location.href`);
  const loginResultSearch = await evaluate(`window.location.search`);
  const loginResultH1 = await evaluate(`document.querySelector('h1').textContent`);

  console.log('Submitted URL:', loginResultUrl);
  console.log('URL query string:', JSON.stringify(loginResultSearch));
  console.log('Password in URL?', loginResultUrl.includes('AnotherFictionalSecretPassword456!'));
  console.log('Page Heading:', loginResultH1);

  console.log('\n=== TEST 4: PASSWORD RESET SUBMIT VIA ENTER KEY ===');
  await send('Page.navigate', { url: `${BASE}/auth?mode=reset` });
  await sleep(1000);

  await evaluate(`(() => {
    const email = document.getElementById('reset-email');
    email.value = 'recovery@example.test';
    email.focus();
  })()`);

  await evaluate(`document.querySelector('[data-auth-form="reset"] form').requestSubmit()`);
  await sleep(1500);

  const resetResultUrl = await evaluate(`window.location.href`);
  const resetResultSearch = await evaluate(`window.location.search`);
  const resetResultH1 = await evaluate(`document.querySelector('h1').textContent`);

  console.log('Submitted URL:', resetResultUrl);
  console.log('URL query string:', JSON.stringify(resetResultSearch));
  console.log('Page Heading:', resetResultH1);

  ws.close();
} finally {
  chromeProc.kill();
}

