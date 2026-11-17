import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import Database from '../../app/node_modules/better-sqlite3/lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const PORT = 3109;
const BASE = `http://localhost:${PORT}`;
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const OUT = path.join(
  rootDir,
  'task-04-server-security/evidence/12a-recovery-and-order-lookup-server-checks.txt'
);
if (fs.existsSync(OUT)) {
  console.error(`Refusing to overwrite existing evidence: ${OUT}`);
  process.exit(1);
}

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const realBefore = sha(REAL_DB);
const db = new Database(TEST_DB, { readonly: true });
const tableCounts = () => ({
  users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
  inquiries: db.prepare('SELECT COUNT(*) c FROM inquiries').get().c
});
const before = tableCounts();

const server = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(PORT),
    DATABASE_PATH: TEST_DB,
    RATE_LIMIT_MODE: 'off'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', () => {});
server.stderr.on('data', () => {});

let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  try { ready = (await fetch(`${BASE}/auth/recovery`)).ok; } catch {}
  if (!ready) await sleep(200);
}
if (!ready) { server.kill(); throw new Error('server did not start'); }

const lines = [];
let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) pass++; else fail++;
  lines.push(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  -> ' + detail : ''}`);
}

async function post(route, body, type = 'form') {
  const isJson = type === 'json';
  const res = await fetch(BASE + route, {
    method: 'POST',
    headers: { 'Content-Type': isJson ? 'application/json' : 'application/x-www-form-urlencoded' },
    body: isJson ? JSON.stringify(body) : body
  });
  return { status: res.status, text: await res.text() };
}

const REC_MSG = 'Please enter the code from your recovery message.';

try {
  lines.push('RECOVERY  POST /auth/recovery');
  let r = await post('/auth/recovery', 'recovery_code=ABC123');
  check('valid non-empty code -> 200', r.status === 200);
  check('valid code is not echoed', !r.text.includes('ABC123'));
  check('valid response claims no real verification', r.text.includes('does not check a database'));

  r = await post('/auth/recovery', 'recovery_code=%20%20ab%20%20');
  check('whitespace-padded non-empty code -> 200', r.status === 200);

  r = await post('/auth/recovery', 'recovery_code=');
  check('empty code -> 400', r.status === 400);
  check('empty code shows generic message', r.text.includes(REC_MSG));

  r = await post('/auth/recovery', 'recovery_code=%20%20%20');
  check('whitespace-only code -> 400', r.status === 400);

  r = await post('/auth/recovery', '');
  check('omitted field -> 400', r.status === 400);
  check('omitted field shows generic message, no type text', r.text.includes(REC_MSG) && !r.text.includes('expected string'));

  r = await post('/auth/recovery', 'recovery_code=a&recovery_code=b');
  check('array via repeated key -> 400', r.status === 400);

  r = await post('/auth/recovery', { recovery_code: null }, 'json');
  check('JSON null -> 400', r.status === 400);
  r = await post('/auth/recovery', { recovery_code: { x: 1 } }, 'json');
  check('JSON object -> 400', r.status === 400);
  r = await post('/auth/recovery', { recovery_code: 123456 }, 'json');
  check('JSON number -> 400', r.status === 400);
  check('rejection page has no six-digit hint', !/six|6[- ]digit/i.test(r.text));
  check('rejection page does not echo submitted value', !r.text.includes('123456'));

  lines.push('');
  lines.push('ORDER LOOKUP  POST /orders/lookup');
  r = await post('/orders/lookup', 'version=text&order_ref=0042');
  check('text "0042" -> 200', r.status === 200);
  check('text leading zeros preserved ("0042", length 4)', r.text.includes('"0042"') && r.text.includes('4 character'));

  r = await post('/orders/lookup', 'version=text&order_ref=');
  check('text empty -> 200 (client permits empty)', r.status === 200);

  r = await post('/orders/lookup', 'version=text&order_ref=42abc');
  check('text non-digits -> 400', r.status === 400);
  r = await post('/orders/lookup', 'version=text&order_ref=-1');
  check('text "-1" -> 400', r.status === 400);
  r = await post('/orders/lookup', 'version=text&order_ref=1.5');
  check('text "1.5" -> 400', r.status === 400);

  r = await post('/orders/lookup', 'version=number&order_ref=0042');
  check('number "0042" -> 200 (raw string kept)', r.status === 200 && r.text.includes('"0042"'));
  r = await post('/orders/lookup', 'version=number&order_ref=0');
  check('number default "0" -> 200', r.status === 200);
  r = await post('/orders/lookup', 'version=number&order_ref=');
  check('number empty -> 200 (client permits empty)', r.status === 200);
  r = await post('/orders/lookup', 'version=number&order_ref=-3.5e2');
  check('number "-3.5e2" -> 200 (valid HTML number)', r.status === 200);
  r = await post('/orders/lookup', 'version=number&order_ref=abc');
  check('number "abc" -> 400', r.status === 400);
  r = await post('/orders/lookup', 'version=number&order_ref=1,5');
  check('number "1,5" -> 400', r.status === 400);

  r = await post('/orders/lookup', 'order_ref=0042');
  check('missing version -> 400', r.status === 400);
  r = await post('/orders/lookup', 'version=bogus&order_ref=0042');
  check('unsupported version -> 400', r.status === 400);
  r = await post('/orders/lookup', 'version=text');
  check('omitted order_ref -> 400', r.status === 400);
  check('omitted order_ref has no type text', !r.text.includes('expected string'));

  r = await post('/orders/lookup', 'version=text&order_ref=1&order_ref=2');
  check('array via repeated key -> 400', r.status === 400);
  r = await post('/orders/lookup', { version: 'text', order_ref: null }, 'json');
  check('JSON null -> 400', r.status === 400);
  r = await post('/orders/lookup', { version: 'text', order_ref: ['0042'] }, 'json');
  check('JSON array -> 400', r.status === 400);
  r = await post('/orders/lookup', { version: 'text', order_ref: { a: 1 } }, 'json');
  check('JSON object -> 400', r.status === 400);
  r = await post('/orders/lookup', { version: 'text', order_ref: 42 }, 'json');
  check('JSON number (not a string) -> 400', r.status === 400);
  r = await post('/orders/lookup', { version: ['text'], order_ref: '1' }, 'json');
  check('JSON array version -> 400', r.status === 400);
  check('type-error pages show no internal type text', !r.text.includes('expected') && !r.text.includes('invalid_type'));
} finally {
  server.kill();
}

const after = tableCounts();
db.close();
check('test DB users count unchanged', before.users === after.users, `${before.users} -> ${after.users}`);
check('test DB inquiries count unchanged', before.inquiries === after.inquiries, `${before.inquiries} -> ${after.inquiries}`);
const realAfter = sha(REAL_DB);
check('real database SHA-256 unchanged', realBefore === realAfter, realAfter);

const header = `EVIDENCE 12a: RECOVERY AND ORDER-LOOKUP SERVER-SIDE CHECKS (TASK 4 STEP 7)
Generated: ${new Date().toISOString()}
Script: task-04-server-security/scripts/test-step7-recovery-order.mjs
Server: app/src/server.js on port ${PORT}, DATABASE_PATH=app/data/step5_test.db (isolated). Test DB opened read-only by the script.
These are NEW results from the current code. They are separate from, and do not replace, evidence 12.
Summary: ${pass} passed, ${fail} failed
================================================================================
`;
fs.writeFileSync(OUT, header + lines.join('\n') + '\n', 'utf8');
console.log(header + lines.join('\n'));
if (fail) process.exit(1);
