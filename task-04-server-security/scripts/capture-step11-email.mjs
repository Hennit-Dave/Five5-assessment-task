import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildVerificationMessage } from '../../app/src/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const OUT_PNG = path.join(rootDir, 'task-04-server-security/evidence/23-rendered-email.png');

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const realBefore = sha256File(REAL_DB);

  // Fictional, inactive fixture (no real email sent)
  const msg = buildVerificationMessage({
    toEmail: 'ade.kolawole@example.com',
    fullName: 'Ade Kolawole',
    code: '048291',
    expiryMinutes: 10
  });

  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const CHROME_PROFILE = '/tmp/chrome-step11-profile';
  const CDP_PORT = 9227;
  if (fs.existsSync(CHROME_PROFILE)) {
    fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_PROFILE}`,
    '--window-size=800,700',
    'about:blank'
  ]);

  await sleep(1500);
  let ws;
  try {
    const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target in Chrome CDP');

    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

    let msgId = 1;
    const pending = new Map();
    ws.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, (msg) => {
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result || msg);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true });
      return res.result.value;
    };

    await send('Page.enable');
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(msg.html);
    await send('Page.navigate', { url: dataUrl });
    await sleep(600);

    const clip = await evaluate(`(() => {
      const card = document.querySelector('table table');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return {
        x: Math.max(0, r.left - 24),
        y: Math.max(0, r.top - 24),
        width: Math.ceil(r.width + 48),
        height: Math.ceil(r.height + 48),
        scale: 2
      };
    })()`);

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: clip || undefined
    });
    fs.writeFileSync(OUT_PNG, Buffer.from(shot.data, 'base64'));
    console.log(`[Evidence] Saved browser-rendered email preview: ${OUT_PNG}`);
  } finally {
    if (ws) ws.close();
    chromeProc.kill();
    await sleep(400);
    try {
      if (fs.existsSync(CHROME_PROFILE)) fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
    } catch {}
  }

  const realAfter = sha256File(REAL_DB);
  if (realBefore !== realAfter) throw new Error('CRITICAL: Real DB modified!');
  console.log('[Safety] Real production database is 100% untouched.');
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
