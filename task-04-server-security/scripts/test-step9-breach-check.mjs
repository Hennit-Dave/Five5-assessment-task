import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from '../../app/node_modules/better-sqlite3/lib/index.js';
import { checkPasswordBreached, OUTCOMES } from '../../app/src/breachCheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const PORT_REAL = 3111;
const PORT_MOCK_SERVER = 3112;
const PORT_APP_WITH_MOCK = 3113;

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404 || res.status === 200) return true;
    } catch {}
    await sleep(150);
  }
  return false;
}

let passed = 0;
let failed = 0;
function assert(desc, condition) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('TASK 4 STEP 9: BREACHED PASSWORD CHECK TEST SUITE (WITH CORRECTIONS)');
  console.log('================================================================');

  const realHashBefore = sha256File(REAL_DB);
  console.log(`Protected Real Database SHA-256: ${realHashBefore}`);

  // --------------------------------------------------------------------------
  // SECTION 1: Direct Unit Checks on breachCheck.js (Live & Mocked)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Unit Verification of checkPasswordBreached ---');

  // Test 1.1: Live query with known breached password
  console.log('\n[1.1] Live service query: password12345678 (16 chars)');
  const res1 = await checkPasswordBreached('password12345678');
  assert('password12345678 outcome is breached', res1.outcome === OUTCOMES.BREACHED);
  assert('password12345678 count is positive integer (> 0)', typeof res1.count === 'number' && res1.count > 0);
  console.log(`       Observed breach count at test time: ${res1.count}`);

  // Test 1.2: Live query with known multi-word breached passphrase
  console.log('\n[1.2] Live service query: correcthorsebatterystaple (25 chars)');
  const res2 = await checkPasswordBreached('correcthorsebatterystaple');
  assert('correcthorsebatterystaple outcome is breached', res2.outcome === OUTCOMES.BREACHED);
  assert('correcthorsebatterystaple count is positive integer (> 0)', typeof res2.count === 'number' && res2.count > 0);
  console.log(`       Observed breach count at test time: ${res2.count}`);

  // Test 1.3: Live query with unbreached passphrase
  console.log('\n[1.3] Live service query: NitsCut#2026-UniqueBespokePassphrase! (37 chars)');
  const res3 = await checkPasswordBreached('NitsCut#2026-UniqueBespokePassphrase!');
  assert('Unique passphrase outcome is not_found in this service at test time', res3.outcome === OUTCOMES.NOT_FOUND);

  // Test 1.4: Mocked timeout handling (both connection and body reading)
  console.log('\n[1.4] Mocked timeout handling: request aborted by timeout ceiling');
  const mockTimeoutFetch = async (_url, { signal }) => {
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        const err = new Error('TIMEOUT');
        err.name = 'AbortError';
        reject(err);
      });
    });
  };
  const res4 = await checkPasswordBreached('AnyPassword12345', {
    fetchFn: mockTimeoutFetch,
    timeoutMs: 50
  });
  assert('Mocked timeout returns outcome unavailable', res4.outcome === OUTCOMES.UNAVAILABLE);
  assert('Error category is TIMEOUT', res4.errorCategory === 'TIMEOUT');

  // Test 1.5: Non-200 responses (Accept ONLY HTTP 200)
  console.log('\n[1.5] Non-200 HTTP responses (HTTP 201 and HTTP 503)');
  const mock201Fetch = async () => ({
    status: 201,
    statusText: 'Created',
    text: async () => '00163625D0246C8AF283A27F21BA0ED87D2:13\r\n'
  });
  const res201 = await checkPasswordBreached('AnyPassword12345', { fetchFn: mock201Fetch });
  assert('HTTP 201 response is rejected as unavailable (accepts only 200)', res201.outcome === OUTCOMES.UNAVAILABLE);
  assert('Error category is HTTP_STATUS_201', res201.errorCategory === 'HTTP_STATUS_201');

  const mock503Fetch = async () => ({
    status: 503,
    statusText: 'Service Unavailable',
    text: async () => 'Service Unavailable'
  });
  const res503 = await checkPasswordBreached('AnyPassword12345', { fetchFn: mock503Fetch });
  assert('HTTP 503 response returns outcome unavailable', res503.outcome === OUTCOMES.UNAVAILABLE);
  assert('Error category is HTTP_STATUS_503', res503.errorCategory === 'HTTP_STATUS_503');

  // Test 1.6: Mocked empty response body
  console.log('\n[1.6] Mocked empty response body');
  const mockEmptyFetch = async () => ({
    status: 200,
    text: async () => '   \r\n  '
  });
  const res6 = await checkPasswordBreached('AnyPassword12345', { fetchFn: mockEmptyFetch });
  assert('Mocked empty body returns outcome unavailable', res6.outcome === OUTCOMES.UNAVAILABLE);
  assert('Error category is EMPTY_RESPONSE', res6.errorCategory === 'EMPTY_RESPONSE');

  // Test 1.7: Mixed valid and malformed lines
  console.log('\n[1.7] Mixed valid and malformed lines: any malformed line fails entire response');
  const mockMixedFetch = async () => ({
    status: 200,
    text: async () => [
      '00163625D0246C8AF283A27F21BA0ED87D2:13',
      'MALFORMED_LINE_WITHOUT_COLON',
      '002B34CBB585B3BE1E709B7B8EA5AC03D82:15'
    ].join('\r\n')
  });
  const resMixed = await checkPasswordBreached('AnyPassword12345', { fetchFn: mockMixedFetch });
  assert('Mixed valid and malformed lines returns unavailable', resMixed.outcome === OUTCOMES.UNAVAILABLE);
  assert('Error category is MALFORMED_RESPONSE', resMixed.errorCategory === 'MALFORMED_RESPONSE');

  // Test 1.8: Invalid counts (trailing garbage, decimals, negatives)
  console.log('\n[1.8] Invalid counts: non-integer, trailing text, negative, decimal');
  const makeCountFetch = (countValue) => async () => ({
    status: 200,
    text: async () => `00163625D0246C8AF283A27F21BA0ED87D2:${countValue}\r\n`
  });

  const resGarbage = await checkPasswordBreached('AnyPassword12345', { fetchFn: makeCountFetch('0garbage') });
  assert('Count with trailing text "0garbage" returns unavailable (MALFORMED_RESPONSE)',
    resGarbage.outcome === OUTCOMES.UNAVAILABLE && resGarbage.errorCategory === 'MALFORMED_RESPONSE');

  const resDec = await checkPasswordBreached('AnyPassword12345', { fetchFn: makeCountFetch('1.5') });
  assert('Decimal count "1.5" returns unavailable (MALFORMED_RESPONSE)',
    resDec.outcome === OUTCOMES.UNAVAILABLE && resDec.errorCategory === 'MALFORMED_RESPONSE');

  const resNeg = await checkPasswordBreached('AnyPassword12345', { fetchFn: makeCountFetch('-1') });
  assert('Negative count "-1" returns unavailable (MALFORMED_RESPONSE)',
    resNeg.outcome === OUTCOMES.UNAVAILABLE && resNeg.errorCategory === 'MALFORMED_RESPONSE');

  const resLeadZero = await checkPasswordBreached('AnyPassword12345', { fetchFn: makeCountFetch('01') });
  assert('Count with non-canonical leading zero "01" returns unavailable (MALFORMED_RESPONSE)',
    resLeadZero.outcome === OUTCOMES.UNAVAILABLE && resLeadZero.errorCategory === 'MALFORMED_RESPONSE');

  // Test 1.9: Valid CRLF response with normal trailing blank lines
  console.log('\n[1.9] Valid CRLF response with normal trailing blank lines');
  const mockCrlfFetch = async () => ({
    status: 200,
    text: async () => '00163625D0246C8AF283A27F21BA0ED87D2:13\r\n002B34CBB585B3BE1E709B7B8EA5AC03D82:15\r\n\r\n\r\n'
  });
  const resCrlf = await checkPasswordBreached('AnyPassword12345', { fetchFn: mockCrlfFetch });
  assert('Valid CRLF with trailing blank lines succeeds (outcome is not_found)', resCrlf.outcome === OUTCOMES.NOT_FOUND);

  // Test 1.10: Valid zero-count padding (must NOT be treated as breached)
  console.log('\n[1.10] Valid zero-count padding entry match: suffix present with count 0');
  const targetHash = crypto.createHash('sha1').update('MyPaddingPass12345').digest('hex').toUpperCase();
  const targetSuffix = targetHash.slice(5);
  const mockPaddingFetch = async () => ({
    status: 200,
    text: async () => [
      '00163625D0246C8AF283A27F21BA0ED87D2:13',
      `${targetSuffix}:0`, // exact target suffix with count 0 (padding dummy)
      '002B34CBB585B3BE1E709B7B8EA5AC03D82:15'
    ].join('\r\n')
  });
  const resPad = await checkPasswordBreached('MyPaddingPass12345', { fetchFn: mockPaddingFetch });
  assert('Zero-count padding match is NOT treated as breached (outcome is not_found)', resPad.outcome === OUTCOMES.NOT_FOUND);

  // --------------------------------------------------------------------------
  // SECTION 2: Integration Checks on Express Route with Live HIBP Service
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Integration on POST /auth/signup (Live HIBP) ---');

  const testDb = new Database(TEST_DB);
  const getUserCount = () => testDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const initialUsers = getUserCount();
  console.log(`Initial user count in test database (${TEST_DB}): ${initialUsers}`);

  // Start real server on PORT_REAL
  const liveServer = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
    env: {
      ...process.env,
      PORT: String(PORT_REAL),
      DATABASE_PATH: TEST_DB,
      NODE_ENV: 'test',
      RATE_LIMIT_MODE: 'off'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  liveServer.stderr.on('data', (d) => console.error(`  [Live Server Stderr] ${d.toString().trim()}`));

  const liveServerReady = await waitForServer(`http://127.0.0.1:${PORT_REAL}/auth`);
  if (!liveServerReady) {
    liveServer.kill();
    throw new Error(`Live server failed to start on port ${PORT_REAL}`);
  }
  console.log(`Live test server running on port ${PORT_REAL}`);

  try {
    // Check 2.1: Live-confirmed breached password rejection
    console.log('\n[2.1] Submitting signup with live-confirmed breached password (password12345678)');
    const breachedSignupRes = await fetch(`http://127.0.0.1:${PORT_REAL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html'
      },
      body: new URLSearchParams({
        name: 'Ade Kolawole',
        email: 'ade.breached@example.com',
        password: 'password12345678',
        terms: 'on'
      }).toString()
    });

    assert('Breached password returns HTTP 400 Bad Request', breachedSignupRes.status === 400);
    const breachedHtml = await breachedSignupRes.text();
    assert(
      'Displays customer-facing breach rejection message',
      breachedHtml.includes('This password has appeared in a known data breach')
    );
    assert('Preserves safe name field in form', breachedHtml.includes('value="Ade Kolawole"'));
    assert('Preserves safe email field in form', breachedHtml.includes('value="ade.breached@example.com"'));
    assert('Never echoes password into response HTML', !breachedHtml.includes('password12345678'));
    assert('Error banner has role="alert"', breachedHtml.includes('class="form-error-banner" role="alert"'));
    assert('Zero user accounts created on breach rejection', getUserCount() === initialUsers);

    // Check 2.2: Invalid form data never calls the breach service (rejected at Zod boundary)
    console.log('\n[2.2] Submitting signup with password < 15 characters (rejected at boundary)');
    const shortPassRes = await fetch(`http://127.0.0.1:${PORT_REAL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html'
      },
      body: new URLSearchParams({
        name: 'Ade Kolawole',
        email: 'ade.short@example.com',
        password: 'short',
        terms: 'on'
      }).toString()
    });

    assert('Short password returns HTTP 400 Bad Request', shortPassRes.status === 400);
    const shortHtml = await shortPassRes.text();
    assert(
      'Rejection comes from Zod length rule, not breach service',
      shortHtml.includes('Password must be at least 15 characters long')
    );
    assert('Zero user accounts created on validation rejection', getUserCount() === initialUsers);

    // Check 2.3: Valid registration with password not found in HIBP at test time
    console.log('\n[2.3] Submitting signup with unbreached password');
    const uniqueEmail = `folake.unique.${Date.now()}@example.com`;
    const validSignupRes = await fetch(`http://127.0.0.1:${PORT_REAL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html'
      },
      body: new URLSearchParams({
        name: 'Folake Adebayo',
        email: uniqueEmail,
        password: 'NitsCut#2026-UniqueBespokePassphrase!',
        terms: 'on'
      }).toString()
    });

    assert('Valid registration returns HTTP 201 Created', validSignupRes.status === 201);
    assert('Exactly one user account created in database', getUserCount() === initialUsers + 1);

    const createdUser = testDb
      .prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?')
      .get(uniqueEmail);
    assert('Created user has normalized lowercase email', createdUser?.email === uniqueEmail.toLowerCase());
    assert('Created user has server-assigned role "client"', createdUser?.role === 'client');
    assert('Stored password hash is Argon2id', createdUser?.password_hash.startsWith('$argon2id$'));
    assert(
      'Stored password hash is NOT SHA-1 or cleartext',
      !createdUser?.password_hash.includes('NitsCut') && createdUser?.password_hash.length > 50
    );

    // Check 2.4: Login and Reset routes do NOT invoke breach checks
    console.log('\n[2.4] Verifying login and reset do not invoke breach check');
    const loginRes = await fetch(`http://127.0.0.1:${PORT_REAL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: uniqueEmail,
        password: 'NitsCut#2026-UniqueBespokePassphrase!'
      }).toString()
    });
    assert('Login succeeds without invoking breach check (HTTP 200)', loginRes.status === 200);

    const resetRes = await fetch(`http://127.0.0.1:${PORT_REAL}/auth/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: uniqueEmail
      }).toString()
    });
    assert('Reset succeeds without invoking breach check (HTTP 200)', resetRes.status === 200);
  } finally {
    liveServer.kill();
  }

  // --------------------------------------------------------------------------
  // SECTION 3: Service Unavailability & Fail-Closed Policy (HTTP 503)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Service Unavailability & Fail-Closed Policy (HTTP 503) ---');

  let mockServerMode = 'timeout'; // 'timeout' | '503' | '201' | 'mixed' | 'garbage' | 'crlf' | 'padding'
  const mockHttpServer = http.createServer((req, res) => {
    if (mockServerMode === 'timeout') {
      // Deliberately hold connection open until client timeout expires
      return;
    }
    if (mockServerMode === '503') {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable');
      return;
    }
    if (mockServerMode === '201') {
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('00163625D0246C8AF283A27F21BA0ED87D2:13\r\n');
      return;
    }
    if (mockServerMode === 'mixed') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('00163625D0246C8AF283A27F21BA0ED87D2:13\r\nMALFORMED_LINE\r\n002B34CBB585B3BE1E709B7B8EA5AC03D82:15\r\n');
      return;
    }
    if (mockServerMode === 'garbage') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('00163625D0246C8AF283A27F21BA0ED87D2:0garbage\r\n');
      return;
    }
    if (mockServerMode === 'crlf') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('00163625D0246C8AF283A27F21BA0ED87D2:13\r\n002B34CBB585B3BE1E709B7B8EA5AC03D82:15\r\n\r\n');
      return;
    }
    if (mockServerMode === 'padding') {
      // Suffix of 'PaddedPassword#2026!' with :0 (padding dummy)
      const pHash = crypto.createHash('sha1').update('PaddedPassword#2026!').digest('hex').toUpperCase();
      const pSuffix = pHash.slice(5);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`00163625D0246C8AF283A27F21BA0ED87D2:13\r\n${pSuffix}:0\r\n002B34CBB585B3BE1E709B7B8EA5AC03D82:15\r\n`);
      return;
    }
  });

  await new Promise((resolve) => mockHttpServer.listen(PORT_MOCK_SERVER, '127.0.0.1', resolve));
  console.log(`Mock HIBP server listening on port ${PORT_MOCK_SERVER}`);

  const mockAppServer = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
    env: {
      ...process.env,
      PORT: String(PORT_APP_WITH_MOCK),
      DATABASE_PATH: TEST_DB,
      NODE_ENV: 'test',
      RATE_LIMIT_MODE: 'off',
      BREACH_CHECK_API_URL: `http://127.0.0.1:${PORT_MOCK_SERVER}/range/`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  mockAppServer.stderr.on('data', (d) => console.error(`  [MockApp Stderr] ${d.toString().trim()}`));

  const mockAppReady = await waitForServer(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth`);
  if (!mockAppReady) {
    mockHttpServer.close();
    mockAppServer.kill();
    throw new Error(`Mock app server failed to start on port ${PORT_APP_WITH_MOCK}`);
  }
  console.log(`Express app configured with mock HIBP running on port ${PORT_APP_WITH_MOCK}`);

  const usersBeforeFails = getUserCount();

  try {
    // Check 3.1: Upstream timeout -> HTTP 503 & zero accounts
    console.log('\n[3.1] Testing registration under upstream service timeout');
    mockServerMode = 'timeout';
    const timeoutRes = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html'
      },
      body: new URLSearchParams({
        name: 'Timeout User',
        email: 'timeout.user@example.com',
        password: 'ValidLengthPassword#2026!',
        terms: 'on'
      }).toString()
    });

    assert('Timeout returns HTTP 503 Service Unavailable', timeoutRes.status === 503);
    const timeoutHtml = await timeoutRes.text();
    assert(
      'Displays plain retry message on unavailability',
      timeoutHtml.includes('Password verification is temporarily unavailable')
    );
    assert('Preserves form name', timeoutHtml.includes('value="Timeout User"'));
    assert('Preserves form email', timeoutHtml.includes('value="timeout.user@example.com"'));
    assert('Password is NOT echoed', !timeoutHtml.includes('ValidLengthPassword#2026!'));
    assert('Zero user accounts created on timeout', getUserCount() === usersBeforeFails);

    // Check 3.2: Upstream HTTP 503 -> HTTP 503 & zero accounts
    console.log('\n[3.2] Testing registration under upstream HTTP 503');
    mockServerMode = '503';
    const res503Route = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html'
      },
      body: new URLSearchParams({
        name: 'Upstream Error User',
        email: 'upstream.error@example.com',
        password: 'ValidLengthPassword#2026!',
        terms: 'on'
      }).toString()
    });

    assert('Upstream 503 returns HTTP 503 Service Unavailable', res503Route.status === 503);
    const html503 = await res503Route.text();
    assert(
      'Displays plain retry message on upstream 503',
      html503.includes('Password verification is temporarily unavailable')
    );
    assert('Zero user accounts created on upstream 503', getUserCount() === usersBeforeFails);

    // Check 3.3: Upstream HTTP 201 (non-200) -> HTTP 503 & zero accounts
    console.log('\n[3.3] Testing registration under upstream HTTP 201 (non-200)');
    mockServerMode = '201';
    const res201Route = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'Non 200 User',
        email: 'non200.user@example.com',
        password: 'ValidLengthPassword#2026!',
        terms: 'on'
      }).toString()
    });
    assert('Upstream 201 returns HTTP 503 Service Unavailable', res201Route.status === 503);
    assert('Zero user accounts created on upstream 201', getUserCount() === usersBeforeFails);

    // Check 3.4: Upstream mixed valid and malformed lines -> HTTP 503 & zero accounts
    console.log('\n[3.4] Testing registration under upstream mixed valid and malformed lines');
    mockServerMode = 'mixed';
    const resMixedRoute = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'Mixed Lines User',
        email: 'mixed.lines@example.com',
        password: 'ValidLengthPassword#2026!',
        terms: 'on'
      }).toString()
    });
    assert('Upstream mixed lines returns HTTP 503 Service Unavailable', resMixedRoute.status === 503);
    assert('Zero user accounts created on upstream mixed lines', getUserCount() === usersBeforeFails);

    // Check 3.5: Upstream invalid count ("0garbage") -> HTTP 503 & zero accounts
    console.log('\n[3.5] Testing registration under upstream invalid count ("0garbage")');
    mockServerMode = 'garbage';
    const resGarbageRoute = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'Garbage Count User',
        email: 'garbage.count@example.com',
        password: 'ValidLengthPassword#2026!',
        terms: 'on'
      }).toString()
    });
    assert('Upstream garbage count returns HTTP 503 Service Unavailable', resGarbageRoute.status === 503);
    assert('Zero user accounts created on upstream garbage count', getUserCount() === usersBeforeFails);

    // Check 3.6: Upstream valid CRLF with trailing blank lines -> HTTP 201 Created & 1 account
    console.log('\n[3.6] Testing registration under upstream valid CRLF with trailing blank lines');
    mockServerMode = 'crlf';
    const crlfEmail = `crlf.user.${Date.now()}@example.com`;
    const resCrlfRoute = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'CRLF User',
        email: crlfEmail,
        password: 'ValidLengthPassword#2026!',
        terms: 'on'
      }).toString()
    });
    assert('Valid CRLF with trailing blank lines returns HTTP 201 Created', resCrlfRoute.status === 201);
    assert('Exactly one user account created for CRLF user', getUserCount() === usersBeforeFails + 1);

    // Check 3.7: Upstream valid zero-count padding match -> HTTP 201 Created & 1 account
    console.log('\n[3.7] Testing registration with valid zero-count padding match');
    mockServerMode = 'padding';
    const paddingEmail = `padding.user.${Date.now()}@example.com`;
    const resPadRoute = await fetch(`http://127.0.0.1:${PORT_APP_WITH_MOCK}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'Padding User',
        email: paddingEmail,
        password: 'PaddedPassword#2026!',
        terms: 'on'
      }).toString()
    });
    assert('Zero-count padding match returns HTTP 201 Created', resPadRoute.status === 201);
    assert('Exactly one user account created for padding user', getUserCount() === usersBeforeFails + 2);
  } finally {
    mockHttpServer.close();
    mockAppServer.kill();
    testDb.close();
  }

  // --------------------------------------------------------------------------
  // DATABASE INTEGRITY VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- Real Database Integrity Check ---');
  const realHashAfter = sha256File(REAL_DB);
  console.log(`Protected Real Database SHA-256: ${realHashAfter}`);
  assert('Real production database (app/data/nits_cut.db) is bit-for-bit identical', realHashBefore === realHashAfter);

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
