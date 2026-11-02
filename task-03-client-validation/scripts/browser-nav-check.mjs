// Browser-level navigation check for Task 3 Step 1, driven through the Chrome DevTools Protocol.
// No dependencies: uses Node's built-in fetch and WebSocket and a locally installed Google Chrome.
//
// Usage:
//   node browser-nav-check.mjs baseline http://localhost:3102
//   node browser-nav-check.mjs auth     http://localhost:3103
//
// What it measures (all taken from the browser, not from the server):
//   - every network request of type "Document" (a full page load) seen after the first one
//   - whether a JavaScript marker set on `window` survives each click (a reload would erase it)
//   - performance.timeOrigin, which changes whenever the document is reloaded
//   - which form is visible after a direct link, a refresh, Back and Forward
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const scenario = process.argv[2];
const base = process.argv[3];
if (!['baseline', 'auth'].includes(scenario) || !base) {
  console.error('usage: node browser-nav-check.mjs <baseline|auth> <baseUrl>');
  process.exit(2);
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run',
  '--user-data-dir=/tmp/t3-chrome-profile', '--window-size=1280,900', 'about:blank'
], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome not ready yet */ }
    await sleep(200);
  }
  throw new Error('Chrome DevTools endpoint did not come up');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
const documentRequests = [];
let loadEvents = 0;
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Network.requestWillBeSent' && msg.params.type === 'Document') {
    documentRequests.push(msg.params.request.url);
  }
  if (msg.method === 'Page.loadEventFired') loadEvents++;
});
const send = (method, params = {}) => new Promise((resolve) => {
  const id = nextId++;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value;
await send('Page.enable');
await send('Network.enable');

const snapshot = () => evaluate(`JSON.stringify({
  url: location.pathname + location.search,
  title: document.title,
  heading: (document.querySelector('h1')||{}).textContent,
  visibleForms: [...document.querySelectorAll('form[data-auth-form]')].filter(f => !f.hidden).map(f => f.dataset.authForm),
  marker: window.__marker || null,
  timeOrigin: performance.timeOrigin,
  historyLength: history.length
})`).then(JSON.parse);

async function go(url) {
  const before = loadEvents;
  await send('Page.navigate', { url });
  for (let i = 0; i < 50 && loadEvents === before; i++) await sleep(100);
  await sleep(150);
}
async function act(label, expression) {
  const docsBefore = documentRequests.length;
  await evaluate(expression);
  await sleep(500);
  const s = await snapshot();
  const newDocs = documentRequests.length - docsBefore;
  console.log(`${label}`);
  console.log(`    address bar: ${s.url}`);
  console.log(`    heading: ${s.heading} | visible auth forms: ${JSON.stringify(s.visibleForms)}`);
  console.log(`    new Document requests caused by this action: ${newDocs}`);
  console.log(`    marker survived: ${s.marker === markerValue} | timeOrigin unchanged: ${s.timeOrigin === firstOrigin}`);
  return { s, newDocs };
}

console.log(`Scenario: ${scenario}   Base: ${base}   Chrome: headless via DevTools Protocol`);
let firstOrigin;
let markerValue = `marker-${Date.now()}`;

try {
  if (scenario === 'baseline') {
    await go(`${base}/login`);
    await evaluate(`window.__marker = ${JSON.stringify(markerValue)}`);
    let s = await snapshot();
    firstOrigin = s.timeOrigin;
    console.log(`Initial load: ${s.url}  heading: ${s.heading}  Document requests so far: ${documentRequests.length}`);
    // In the separate-page version every link is a normal navigation, so the marker is expected to be lost.
    const docsBefore = documentRequests.length;
    await evaluate(`document.querySelector('a[href="/signup"]').click()`);
    await sleep(1200);
    s = await snapshot();
    console.log(`Click "Create an account" -> ${s.url}  heading: ${s.heading}`);
    console.log(`    new Document requests: ${documentRequests.length - docsBefore} | marker survived: ${s.marker === markerValue} | timeOrigin unchanged: ${s.timeOrigin === firstOrigin}`);
    const docs2 = documentRequests.length;
    await evaluate(`document.querySelector('a[href="/login"]').click()`);
    await sleep(1200);
    s = await snapshot();
    console.log(`Click "I already have an account" -> ${s.url}  heading: ${s.heading}`);
    console.log(`    new Document requests: ${documentRequests.length - docs2}`);
    const docs3 = documentRequests.length;
    await evaluate(`document.querySelector('a[href="/reset"]').click()`);
    await sleep(1200);
    s = await snapshot();
    console.log(`Click "Forgot your password?" -> ${s.url}  heading: ${s.heading}`);
    console.log(`    new Document requests: ${documentRequests.length - docs3}`);
  } else {
    await go(`${base}/auth?mode=login`);
    await evaluate(`window.__marker = ${JSON.stringify(markerValue)}`);
    let s = await snapshot();
    firstOrigin = s.timeOrigin;
    console.log(`Initial load: ${s.url}  heading: ${s.heading}  visible: ${JSON.stringify(s.visibleForms)}  Document requests so far: ${documentRequests.length}`);
    const results = [];
    results.push(await act('Click "Create an account" tab', `document.querySelector('[data-auth-mode="signup"]').click()`));
    results.push(await act('Click "Forgot your password?" link', `document.querySelector('[data-auth-mode="reset"]').click()`));
    results.push(await act('Click "Log in" tab', `document.querySelector('[data-auth-mode="login"]').click()`));
    results.push(await act('Browser Back', `history.back()`));
    results.push(await act('Browser Back again', `history.back()`));
    results.push(await act('Browser Forward', `history.forward()`));
    const total = documentRequests.length;
    console.log(`Total Document requests after initial load, across all six switches: ${total - 1}`);
    console.log(`Page.loadEventFired count (includes the initial load): ${loadEvents}`);
    // Refresh and direct links are real loads on purpose: they prove the server renders the right form.
    await go(`${base}/auth?mode=reset`);
    s = await snapshot();
    console.log(`Direct link ${s.url}: visible forms ${JSON.stringify(s.visibleForms)} | heading: ${s.heading}`);
    await evaluate('location.reload()');
    await sleep(1200);
    s = await snapshot();
    console.log(`After refresh (F5) at ${s.url}: visible forms ${JSON.stringify(s.visibleForms)} | heading: ${s.heading}`);
    await go(`${base}/auth?mode=signup`);
    s = await snapshot();
    console.log(`Direct link ${s.url}: visible forms ${JSON.stringify(s.visibleForms)} | heading: ${s.heading}`);
    await evaluate('location.reload()');
    await sleep(1200);
    s = await snapshot();
    console.log(`After refresh (F5) at ${s.url}: visible forms ${JSON.stringify(s.visibleForms)} | heading: ${s.heading}`);
    await go(`${base}/auth?mode=login`);
    s = await snapshot();
    console.log(`Direct link ${s.url}: visible forms ${JSON.stringify(s.visibleForms)} | heading: ${s.heading}`);
  }
  console.log(`All Document requests seen: ${documentRequests.length}`);
  for (const u of documentRequests) console.log(`    ${u}`);
} finally {
  ws.close();
  chrome.kill();
}
