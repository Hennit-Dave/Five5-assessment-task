import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9360;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-doubleclick-test',
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
  await send('Network.enable');

  const postRequests = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.method === 'Network.requestWillBeSent' && msg.params.request.method === 'POST') {
      postRequests.push(msg.params.request.url);
    }
  });

  // Fill Signup form validly
  await evaluate(`(() => {
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');

    name.value = 'Folake Adeyemi';
    email.value = 'folake.test@example.com';
    pass.value = 'bespoke lagos suit 2026';
    terms.checked = true;

    name.dispatchEvent(new Event('input', { bubbles: true }));
    email.dispatchEvent(new Event('input', { bubbles: true }));
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    terms.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(100);

  // Rapidly click submit button twice in the exact same event loop / sync execution
  console.log('Simulating rapid double-click on Sign up button...');
  const doubleClickResult = await evaluate(`(() => {
    const btn = document.querySelector('[data-auth-form="signup"] button[type="submit"]');
    const click1 = btn.click();
    const click2 = btn.click();
    return { click1, click2 };
  })()`);

  await sleep(1000);
  console.log('POST requests received during rapid double click:', postRequests);
  console.log('Double submit prevented count:', postRequests.length, '(expected exactly 1)');

} finally {
  chromeProc.kill('SIGKILL');
}

