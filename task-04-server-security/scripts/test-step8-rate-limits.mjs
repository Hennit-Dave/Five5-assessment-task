import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import Database from '../../app/node_modules/better-sqlite3/lib/index.js';

// Task 4 Step 8: trigger each rate limit, then demonstrate a LOCAL source-address change
// (127.0.0.1 versus this machine's own LAN address) against ONE continuously running
// server process. No restart, no counter reset, no header tricks, trust proxy stays off.
// This is a local source-address demonstration, not proof of changing public IP networks.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(rootDir, 'task-04-server-security/evidence');
const OUT_OK = path.join(EVIDENCE_DIR, '14-rate-limit-defeated.txt');
const OUT_INCONCLUSIVE = path.join(EVIDENCE_DIR, '14-rate-limit-local-address-attempt-inconclusive.txt');
const PORT = 3110;
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');

for (const f of [OUT_OK, OUT_INCONCLUSIVE]) {
  if (fs.existsSync(f)) {
    console.error(`Refusing to overwrite existing evidence: ${f}`);
    process.exit(1);
  }
}

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const realBefore = sha(REAL_DB);
const roDb = new Database(TEST_DB, { readonly: true });
const usersBefore = roDb.prepare('SELECT COUNT(*) c FROM users').get().c;

// Discover current addresses at test time.
const lanAddresses = [];
for (const [name, list] of Object.entries(os.networkInterfaces())) {
  for (const a of list || []) {
    if (a.family === 'IPv4' && !a.internal) lanAddresses.push({ iface: name, address: a.address });
  }
}
const addrA = '127.0.0.1';
const addrB = lanAddresses[0]?.address || null;

const diag = [];
const serverProc = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATABASE_PATH: TEST_DB,
    RATE_LIMIT_DIAGNOSTICS: '1',
    RATE_LIMIT_MODE: 'on'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
const serverStderr = [];
serverProc.stdout.on('data', (d) => {
  for (const line of d.toString().split('\n')) {
    if (line.startsWith('[rate-limit-diagnostic] ')) diag.push(JSON.parse(line.slice(24)));
  }
});
serverProc.stderr.on('data', (d) => serverStderr.push(d.toString().trim()));

let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  try { ready = (await fetch(`http://${addrA}:${PORT}/auth?mode=login`)).ok; } catch {}
  if (!ready) await sleep(200);
}
if (!ready) { serverProc.kill(); throw new Error('server did not start'); }

const log = [];
const out = (s = '') => log.push(s);

async function send(host, route, body, extraHeaders = {}) {
  const before = diag.length;
  const res = await fetch(`http://${host}:${PORT}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...extraHeaders },
    body
  });
  const text = await res.text();
  for (let i = 0; i < 20 && diag.length === before; i++) await sleep(50);
  const headers = {};
  for (const [k, v] of res.headers.entries()) headers[k] = v;
  const d = diag.length > before ? diag[diag.length - 1] : null;
  return { status: res.status, headers, text, diag: d };
}

const pick = (h) =>
  ['ratelimit', 'ratelimit-policy', 'retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining']
    .filter((k) => k in h)
    .map((k) => `${k}: ${h[k]}`)
    .join(' | ') || '(none)';
const bannerText = (t) => (t.match(/form-error-banner[^>]*>\s*([^<]+?)\s*</) || [])[1] || null;

const SIGNUP_BAD = 'name=A&email=not-an-email&password=short';
const LOGIN_BODY = 'email=ade.kolawole%40example.com&password=Definitely-Wrong-Password-1';
const RESET_BODY = 'email=reset.test%40example.com';

const summary = {};
let distinct = false;
let defeated = false;
let stayedBlocked = false;
let forgedStillBlocked = false;

try {
  out(`Server: app/src/server.js on port ${PORT}, DATABASE_PATH=app/data/step5_test.db (isolated), one process for the whole run.`);
  out(`express-rate-limit version: ${JSON.parse(fs.readFileSync(path.join(rootDir, 'app/node_modules/express-rate-limit/package.json'), 'utf8')).version}`);
  out('Settings under test: login 5/15 min, signup 5/hour, reset 3/hour, per client address; all POSTs counted; in-memory store; trust proxy OFF.');
  out(`Addresses discovered at test time: loopback ${addrA}; non-internal IPv4: ${lanAddresses.map((a) => `${a.address} (${a.iface})`).join(', ') || 'none'}`);
  out('');
  out('PART 1: TRIGGER EACH LIMIT (all requests from destination http://127.0.0.1)');
  out('-----------------------------------------------------------------------');

  const plans = [
    ['signup', '/auth/signup', SIGNUP_BAD, 5, 'validation failure (400)'],
    ['login', '/auth/login', LOGIN_BODY, 5, 'wrong password (401)'],
    ['reset', '/auth/reset', RESET_BODY, 3, 'valid email (200)']
  ];
  for (const [name, route, body, limit, kind] of plans) {
    out('');
    out(`${name.toUpperCase()}  POST ${route}  limit ${limit}  request kind: ${kind}`);
    const rows = [];
    for (let i = 1; i <= limit; i++) {
      const r = await send(addrA, route, body);
      rows.push(r);
      out(`  request ${i}: HTTP ${r.status}  ${pick(r.headers)}  limiter used=${r.diag?.used}/${r.diag?.limit}`);
    }
    const blocked = await send(addrA, route, body);
    out(`  request ${limit + 1}: HTTP ${blocked.status}  ${pick(blocked.headers)}`);
    out(`    customer-facing banner: "${bannerText(blocked.text)}"`);
    out(`    server-side diagnostic (not shown to customers): peer=${blocked.diag?.peer} req.ip=${blocked.diag?.reqIp} limiterKey=${blocked.diag?.limiterKey}`);
    const jsonRes = await send(addrA, route, body, { Accept: 'application/json' });
    out(`  JSON client request: HTTP ${jsonRes.status}  ${pick(jsonRes.headers)}  body=${jsonRes.text.trim()}`);
    summary[name] = {
      allowedStatuses: rows.map((r) => r.status),
      blockedStatus: blocked.status,
      jsonStatus: jsonRes.status
    };
    if (name === 'signup') {
      out(`    page leaks password? ${blocked.text.includes('short') && /type="password"[^>]*value=/.test(blocked.text) ? 'YES' : 'no (password field has no value attribute)'}`);
    }
  }

  out('');
  out('PART 2: LOCAL SOURCE-ADDRESS DEMONSTRATION (login endpoint, same server process, no reset)');
  out('-----------------------------------------------------------------------------------------');
  if (!addrB) {
    out('No non-internal IPv4 address was found. Part 2 cannot run. Use the phone test.');
  } else {
    const a1 = await send(addrA, '/auth/login', LOGIN_BODY);
    out(`Step 1. Address A via http://${addrA}: another login request -> HTTP ${a1.status}  ${pick(a1.headers)}`);
    out(`        observed peer=${a1.diag?.peer} req.ip=${a1.diag?.reqIp} limiterKey=${a1.diag?.limiterKey}`);

    const b1 = await send(addrB, '/auth/login', LOGIN_BODY);
    out(`Step 2. Same request sent to http://${addrB} (this machine's own LAN address)`);
    out(`        -> HTTP ${b1.status}  ${pick(b1.headers)}`);
    out(`        observed peer=${b1.diag?.peer} req.ip=${b1.diag?.reqIp} limiterKey=${b1.diag?.limiterKey} used=${b1.diag?.used}/${b1.diag?.limit}`);

    distinct = !!(a1.diag && b1.diag && a1.diag.limiterKey !== b1.diag.limiterKey && a1.diag.peer !== b1.diag.peer);
    out(`        server-observed peer addresses distinct? ${distinct ? 'YES' : 'NO'}  (A key=${a1.diag?.limiterKey}, B key=${b1.diag?.limiterKey})`);

    if (distinct) {
      defeated = b1.status !== 429;
      out(`        second address rate-limited? ${b1.status === 429 ? 'YES (not defeated)' : 'NO (limit not applied to the new address)'}`);
      const a2 = await send(addrA, '/auth/login', LOGIN_BODY);
      stayedBlocked = a2.status === 429;
      out(`Step 3. Original address A again via http://${addrA}: HTTP ${a2.status}  ${pick(a2.headers)}  -> ${stayedBlocked ? 'still blocked' : 'NOT blocked'}`);
      out(`        observed peer=${a2.diag?.peer} limiterKey=${a2.diag?.limiterKey}`);

      const f = await send(addrA, '/auth/login', LOGIN_BODY, { 'X-Forwarded-For': '203.0.113.77' });
      forgedStillBlocked = f.status === 429;
      out('');
      out('FORGED HEADER CHECK (trust proxy is off)');
      out(`  From address A with "X-Forwarded-For: 203.0.113.77": HTTP ${f.status}  ${pick(f.headers)}`);
      out(`  observed peer=${f.diag?.peer} req.ip=${f.diag?.reqIp} limiterKey=${f.diag?.limiterKey} xForwardedForReceived=${f.diag?.xForwardedForReceived}`);
      out(`  forged header bypassed the limit? ${forgedStillBlocked ? 'NO (still HTTP 429, key unchanged)' : 'YES'}`);
    } else {
      out('STOP: Option A did not produce distinct server-observed addresses. Remaining steps skipped.');
    }
  }
} finally {
  serverProc.kill();
}

const usersAfter = roDb.prepare('SELECT COUNT(*) c FROM users').get().c;
roDb.close();
out('');
out('INTEGRITY');
out(`  test DB users: ${usersBefore} -> ${usersAfter} (no accounts were created by these requests)`);
const realAfter = sha(REAL_DB);
out(`  real database SHA-256 unchanged: ${realBefore === realAfter} (${realAfter})`);
if (serverStderr.length) {
  out('  server stderr (library validation warnings, if any):');
  for (const l of serverStderr) out('    ' + l.split('\n').join('\n    '));
}

const ok = distinct && defeated && stayedBlocked && forgedStillBlocked;
const header = [
  ok
    ? 'EVIDENCE 14: RATE LIMIT TRIGGERED, THEN BYPASSED BY A SECOND LOCAL SOURCE ADDRESS (TASK 4 STEP 8)'
    : 'EVIDENCE 14 ATTEMPT (INCONCLUSIVE): LOCAL SOURCE-ADDRESS DEMONSTRATION DID NOT COMPLETE',
  `Generated: ${new Date().toISOString()}`,
  'Script: task-04-server-security/scripts/test-step8-rate-limits.mjs',
  'Scope: a local source-address demonstration on one machine. It is NOT proof of changing public IP networks.',
  '================================================================================'
];
fs.writeFileSync(ok ? OUT_OK : OUT_INCONCLUSIVE, [...header, ...log, ''].join('\n'), 'utf8');
console.log([...header, ...log].join('\n'));
console.log(`\nResult: ${ok ? 'complete' : 'INCONCLUSIVE'}; evidence written to ${ok ? OUT_OK : OUT_INCONCLUSIVE}`);
process.exit(ok ? 0 : 2);
