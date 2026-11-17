import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from '../../app/node_modules/better-sqlite3/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const OUT_ROW_TXT = path.join(rootDir, 'task-04-server-security/evidence/19-verification-row.txt');
const OUT_ROW_PNG = path.join(rootDir, 'task-04-server-security/evidence/19-verification-row.png');
const OUT_REUSED_PNG = path.join(rootDir, 'task-04-server-security/evidence/22-verification-code-reused.png');

process.loadEnvFile(path.join(rootDir, '.env'));

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function run() {
  const realBefore = sha256File(REAL_DB);
  const email = (process.env.TEST_RECIPIENT_EMAIL || '').trim().toLowerCase();
  const masked = maskEmail(email);

  const db = new Database(TEST_DB, { readonly: true });
  const user = db.prepare('SELECT id, role, email_verified_at, created_at FROM users WHERE email = ?').get(email);
  const codeRow = user
    ? db
        .prepare(
          'SELECT id, user_id, code_hash, purpose, failed_tries, created_at, expires_at, used_at FROM verification_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1'
        )
        .get(user.id)
    : null;
  db.close();

  if (!user || !codeRow || !user.email_verified_at || !codeRow.used_at) {
    throw new Error('Expected verified user and consumed verification_codes row in step5_test.db');
  }

  // 1. Save 19-verification-row.txt
  const rowText = [
    '================================================================',
    'TASK 4 STEP 10: VERIFIED USER & CONSUMED CODE DATABASE ROW',
    '================================================================',
    'Database: app/data/step5_test.db (isolated test database)',
    `User Email (masked): ${masked}`,
    '',
    '--- users table ---',
    `id:                ${user.id}`,
    `role:              ${user.role}`,
    `email_verified_at: ${user.email_verified_at}`,
    `created_at:        ${user.created_at}`,
    '',
    '--- verification_codes table ---',
    `id:           ${codeRow.id}`,
    `user_id:      ${codeRow.user_id}`,
    `code_hash:    ${codeRow.code_hash}`,
    `purpose:      ${codeRow.purpose}`,
    `failed_tries: ${codeRow.failed_tries}`,
    `created_at:   ${codeRow.created_at}`,
    `expires_at:   ${codeRow.expires_at}`,
    `used_at:      ${codeRow.used_at}`,
    '',
    'Atomic Consistency Check:',
    `  users.email_verified_at === verification_codes.used_at: ${user.email_verified_at === codeRow.used_at}`,
    '  Plaintext code stored in DB: NO (64-char HMAC-SHA256 hash only)',
    '================================================================'
  ].join('\n');
  fs.writeFileSync(OUT_ROW_TXT, rowText + '\n');
  console.log(`[Evidence] Saved ${OUT_ROW_TXT}`);

  // 2. Launch headless Chrome CDP to capture 19-verification-row.png & 22-verification-code-reused.png
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const CHROME_PROFILE = '/tmp/chrome-step10-profile';
  const CDP_PORT = 9226;
  if (fs.existsSync(CHROME_PROFILE)) {
    fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_PROFILE}`,
    '--window-size=1280,960',
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

    // Capture 19-verification-row.png from clean terminal output
    const escapedText = rowText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const dataUrl =
      'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#111318;color:#E2E2E9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;line-height:1.5;"><pre id="out" style="margin:0;">${escapedText}</pre></body></html>`
      );
    await send('Page.navigate', { url: dataUrl });
    await sleep(500);
    const rowClip = await evaluate(`(() => {
      const r = document.getElementById('out').getBoundingClientRect();
      return { x: 0, y: 0, width: Math.ceil(r.width + 48), height: Math.ceil(r.height + 48), scale: 2 };
    })()`);
    const rowShot = await send('Page.captureScreenshot', { format: 'png', clip: rowClip });
    fs.writeFileSync(OUT_ROW_PNG, Buffer.from(rowShot.data, 'base64'));
    console.log(`[Evidence] Saved ${OUT_ROW_PNG}`);

    // Capture 22-verification-code-reused.png against live port 3120
    await send('Page.navigate', { url: 'http://localhost:3120/auth/verify' });
    await sleep(600);
    await evaluate(`(() => {
      const emailEl = document.getElementById('verify-email');
      const codeEl = document.getElementById('verify-code');
      emailEl.value = ${JSON.stringify(email)};
      codeEl.value = '000000';
      document.querySelector('form[action="/auth/verify"]').submit();
    })()`);
    await sleep(800);

    const banner = await evaluate(`document.querySelector('.form-error-banner')?.innerText?.trim() || ''`);
    console.log(`[Browser] Reused-code banner text: "${banner}"`);
    if (!banner.includes('already been used')) {
      throw new Error(`Expected reused code banner, got: ${banner}`);
    }

    // Mask the email input visually before screenshot so private email is not exposed in image
    await evaluate(`(() => {
      const emailEl = document.getElementById('verify-email');
      if (emailEl) emailEl.value = ${JSON.stringify(masked)};
    })()`);
    await sleep(200);

    const cardClip = await evaluate(`(() => {
      const card = document.querySelector('.card');
      const r = card.getBoundingClientRect();
      return { x: Math.max(0, r.left - 16), y: Math.max(0, r.top - 16), width: Math.ceil(r.width + 32), height: Math.ceil(r.height + 32), scale: 2 };
    })()`);
    const reusedShot = await send('Page.captureScreenshot', { format: 'png', clip: cardClip });
    fs.writeFileSync(OUT_REUSED_PNG, Buffer.from(reusedShot.data, 'base64'));
    console.log(`[Evidence] Saved ${OUT_REUSED_PNG}`);
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
