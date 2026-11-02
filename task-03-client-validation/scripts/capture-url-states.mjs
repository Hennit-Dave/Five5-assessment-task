#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import http from 'node:http';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'evidence');
mkdirSync(OUT_DIR, { recursive: true });
const OUT_PNG = join(OUT_DIR, '03-url-states.png');

const PORT = 3105;
const CDP_PORT = 9338;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 1. Start app server
const appServer = spawn('node', ['src/server.js'], {
  cwd: join(here, '..', '..', 'app'),
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'inherit'
});

await delay(1000);

// 2. Prepare composite HTML with realistic browser windows showing address bars
const compositeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>03 URL States - Nit's Cut</title>
<style>
  :root {
    --bg: #121316;
    --window-bg: #1e1f24;
    --border: #2e3038;
    --url-bg: #141519;
    --text-primary: #e6e6ec;
    --text-secondary: #90929e;
    --accent: #d4af37;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--accent);
    letter-spacing: 0.02em;
  }
  p.subtitle {
    font-size: 13px;
    color: var(--text-secondary);
  }
  .states-grid {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .window {
    background: var(--window-bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.45);
    overflow: hidden;
  }
  .window-header {
    background: #18191e;
    border-bottom: 1px solid var(--border);
    padding: 10px 14px 8px;
  }
  .window-topbar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
  }
  .traffic-lights {
    display: flex;
    gap: 7px;
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
  }
  .dot-red { background: #ff5f56; }
  .dot-yellow { background: #ffbd2e; }
  .dot-green { background: #27c93f; }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--window-bg);
    padding: 6px 14px;
    border-radius: 6px 6px 0 0;
    font-size: 12px;
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-bottom: none;
  }
  .tab-fav {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background: var(--accent);
    display: inline-block;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .nav-btns {
    display: flex;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
  }
  .address-bar {
    flex: 1;
    background: var(--url-bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'SF Mono', Menlo, Consolas, Monaco, monospace;
    font-size: 12.5px;
    color: var(--text-primary);
  }
  .lock-icon {
    font-size: 11px;
    color: #4ade80;
  }
  .url-query {
    color: #38bdf8;
    font-weight: 600;
  }
  .viewport-frame {
    width: 100%;
    height: 380px;
    border: none;
    display: block;
    background: #0a0a0c;
  }
</style>
</head>
<body>
<header>
  <h1>Task 3 Step 1 — Address Bar URL States (/auth?mode=...)</h1>
  <p class="subtitle">Single authentication page route (/auth) with client-side & server-side mode selection via URL query parameter</p>
</header>

<div class="states-grid">
  <!-- State 1: Login -->
  <div class="window">
    <div class="window-header">
      <div class="window-topbar">
        <div class="traffic-lights">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <div class="tab">
          <span class="tab-fav"></span>
          <span>Log in — Nit's Cut</span>
        </div>
      </div>
      <div class="toolbar">
        <div class="nav-btns">
          <span>&#8592;</span>
          <span>&#8594;</span>
          <span>&#8635;</span>
        </div>
        <div class="address-bar">
          <span class="lock-icon">&#128274;</span>
          <span>http://localhost:3000/auth<span class="url-query">?mode=login</span></span>
        </div>
      </div>
    </div>
    <iframe class="viewport-frame" src="http://127.0.0.1:${PORT}/auth?mode=login"></iframe>
  </div>

  <!-- State 2: Signup -->
  <div class="window">
    <div class="window-header">
      <div class="window-topbar">
        <div class="traffic-lights">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <div class="tab">
          <span class="tab-fav"></span>
          <span>Sign up — Nit's Cut</span>
        </div>
      </div>
      <div class="toolbar">
        <div class="nav-btns">
          <span>&#8592;</span>
          <span>&#8594;</span>
          <span>&#8635;</span>
        </div>
        <div class="address-bar">
          <span class="lock-icon">&#128274;</span>
          <span>http://localhost:3000/auth<span class="url-query">?mode=signup</span></span>
        </div>
      </div>
    </div>
    <iframe class="viewport-frame" src="http://127.0.0.1:${PORT}/auth?mode=signup"></iframe>
  </div>

  <!-- State 3: Reset -->
  <div class="window">
    <div class="window-header">
      <div class="window-topbar">
        <div class="traffic-lights">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <div class="tab">
          <span class="tab-fav"></span>
          <span>Reset password — Nit's Cut</span>
        </div>
      </div>
      <div class="toolbar">
        <div class="nav-btns">
          <span>&#8592;</span>
          <span>&#8594;</span>
          <span>&#8635;</span>
        </div>
        <div class="address-bar">
          <span class="lock-icon">&#128274;</span>
          <span>http://localhost:3000/auth<span class="url-query">?mode=reset</span></span>
        </div>
      </div>
    </div>
    <iframe class="viewport-frame" src="http://127.0.0.1:${PORT}/auth?mode=reset"></iframe>
  </div>
</div>
</body>
</html>`;

const COMPOSITE_FILE = join('/tmp', 'nc-url-states.html');
writeFileSync(COMPOSITE_FILE, compositeHtml);

// 3. Launch headless chrome
const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-url-states',
  '--window-size=1200,1600',
  `file://${COMPOSITE_FILE}`
]);

await delay(1500);

try {
  const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) throw new Error('No page target found');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res) => ws.addEventListener('open', res, { once: true }));

  let reqId = 1;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      pending.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await call('Page.enable');
  await delay(2000); // allow iframes and fonts to finish rendering

  const { data } = await call('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });

  writeFileSync(OUT_PNG, Buffer.from(data, 'base64'));
  console.log(`Saved screenshot to ${OUT_PNG} (${(data.length * 0.75 / 1024).toFixed(1)} KB)`);

  ws.close();
} finally {
  chromeProc.kill();
  appServer.kill();
}
