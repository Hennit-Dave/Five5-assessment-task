import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9356;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-contrast-test',
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
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  function luminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function contrast(rgb1, rgb2) {
    const l1 = luminance(...rgb1);
    const l2 = luminance(...rgb2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function parseRgb(str) {
    const m = str.match(/\d+/g);
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }

  // Dark Mode test
  await send('Emulation.setEmulatedMedia', { media: 'page', features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await sleep(200);

  const darkMetrics = await evaluate(`(() => {
    const btn = document.querySelector('[data-auth-form="signup"] button[type="submit"]');
    const style = getComputedStyle(btn);
    return {
      bg: style.backgroundColor,
      fg: style.color,
      outline: style.outlineColor
    };
  })()`);

  const darkRatio = contrast(parseRgb(darkMetrics.bg), parseRgb(darkMetrics.fg));
  console.log('DARK MODE INACTIVE BUTTON:');
  console.log('  Background:', darkMetrics.bg);
  console.log('  Foreground:', darkMetrics.fg);
  console.log('  Contrast Ratio:', darkRatio.toFixed(2) + ':1');

  // Light Mode test
  await send('Emulation.setEmulatedMedia', { media: 'page', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await sleep(200);

  const lightMetrics = await evaluate(`(() => {
    const btn = document.querySelector('[data-auth-form="signup"] button[type="submit"]');
    const style = getComputedStyle(btn);
    return {
      bg: style.backgroundColor,
      fg: style.color,
      outline: style.outlineColor
    };
  })()`);

  const lightRatio = contrast(parseRgb(lightMetrics.bg), parseRgb(lightMetrics.fg));
  console.log('LIGHT MODE INACTIVE BUTTON:');
  console.log('  Background:', lightMetrics.bg);
  console.log('  Foreground:', lightMetrics.fg);
  console.log('  Contrast Ratio:', lightRatio.toFixed(2) + ':1');

} finally {
  chromeProc.kill('SIGKILL');
}

