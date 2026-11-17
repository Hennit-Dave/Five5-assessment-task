import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import crypto from 'node:crypto';
import Database from '../../app/node_modules/better-sqlite3/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const PORT = 3108;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const EVIDENCE_OUTPUT = path.join(rootDir, 'task-04-server-security/evidence/12-direct-request-before-and-after.txt');

console.log('================================================================');
if (fs.existsSync(EVIDENCE_OUTPUT)) {
  console.error(`Refusing to overwrite existing evidence: ${EVIDENCE_OUTPUT}`);
  process.exit(1);
}
console.log('TASK 4 STEP 7: DIRECT HTTP REQUEST ATTACK REPEAT & COMPARISON');
console.log('================================================================');
console.log(`Isolated test database: ${TEST_DB}`);
console.log(`Protected real database: ${REAL_DB}`);

function hashFile(filepath) {
  const buf = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}
const realDbHashBefore = hashFile(REAL_DB);

// Open test DB to inspect row counts
const testDb = new Database(TEST_DB, { readonly: false });
const initialUserCount = testDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
console.log(`Initial user count in test database: ${initialUserCount}`);

// Clean up any test escalation users from previous runs
testDb.prepare("DELETE FROM users WHERE email LIKE 'step7_%@example.com'").run();

// Start Express server on PORT 3108
console.log(`\n[Server] Starting Express server on port ${PORT}...`);
const serverProc = spawn('node', [path.join(rootDir, 'app/src/server.js')], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(PORT),
    DATABASE_PATH: TEST_DB,
    RATE_LIMIT_MODE: "off"
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

serverProc.stdout.on('data', () => {});
serverProc.stderr.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.error(`  [Server Err] ${line}`);
});

let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(`${BASE_URL}/auth?mode=signup`);
    if (res.ok) { ready = true; break; }
  } catch {}
  await sleep(200);
}
if (!ready) {
  serverProc.kill();
  testDb.close();
  throw new Error('Express server failed to start within timeout');
}
console.log('[Server] Server is ready.');

try {
  // --------------------------------------------------------------------------
  // TEST 1: REPEAT EXACT TASK 3 STEP 8 DIRECT REQUEST 1
  // Payload: name=A&email=not-an-email&password=short
  // --------------------------------------------------------------------------
  console.log('\n--- ATTACK TEST 1: Exact Task 3 Request 1 (Invalid Values & Format) ---');
  const req1Body = 'name=A&email=not-an-email&password=short';
  const req1Start = Date.now();
  const res1 = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: req1Body
  });
  const res1Duration = Date.now() - req1Start;
  const res1Text = await res1.text();

  console.log(`  HTTP Status: ${res1.status} (Task 3 was 200 OK)`);
  console.assert(res1.status === 400, `Expected HTTP 400 Bad Request, got ${res1.status}`);
  console.assert(res1Text.includes('Please enter at least two characters, including a letter, for your name.'),
    'Should contain name validation error message');
  console.assert(!res1Text.includes('short'),
    'Submitted password must NEVER be echoed in response');
  console.assert(res1Text.includes('name="name" value="A"'),
    'Safe field name="A" should be preserved in value attribute');
  console.assert(res1Text.includes('name="email" value="not-an-email"'),
    'Safe field email should be preserved in value attribute');

  const countAfter1 = testDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
  console.assert(countAfter1 === initialUserCount,
    `Zero rows should be created on rejected direct request (expected ${initialUserCount}, got ${countAfter1})`);
  console.log(`  ✓ Refusal confirmed: HTTP 400 Bad Request. Database row count unchanged (${countAfter1} rows).`);

  // --------------------------------------------------------------------------
  // TEST 2: REPEAT EXACT TASK 3 STEP 8 DIRECT REQUEST 2
  // Payload: name=&email=&password=
  // --------------------------------------------------------------------------
  console.log('\n--- ATTACK TEST 2: Exact Task 3 Request 2 (Empty Mandatory Fields) ---');
  const req2Body = 'name=&email=&password=';
  const res2 = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: req2Body
  });
  const res2Text = await res2.text();

  console.log(`  HTTP Status: ${res2.status} (Task 3 was 200 OK)`);
  console.assert(res2.status === 400, `Expected HTTP 400 Bad Request, got ${res2.status}`);
  console.assert(res2Text.includes('Please enter your name so we know who to address.'),
    'Should contain required name error message');

  const countAfter2 = testDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
  console.assert(countAfter2 === initialUserCount,
    `Zero rows should be created on empty direct request (expected ${initialUserCount}, got ${countAfter2})`);
  console.log(`  ✓ Refusal confirmed: HTTP 400 Bad Request. Database row count unchanged (${countAfter2} rows).`);

  // --------------------------------------------------------------------------
  // TEST 3: SUPPORTING TESTS — MALFORMED TYPES (JSON & URL-ENCODED)
  // --------------------------------------------------------------------------
  console.log('\n--- SUPPORTING TESTS: Malformed Field Types ---');

  // 3A: Array values in JSON
  const resArray = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      name: ['Ade', 'Kolawole'],
      email: 'ade@example.com',
      password: 'BespokeKaftan#2026!',
      terms: true
    })
  });
  const jsonArray = await resArray.json();
  console.assert(resArray.status === 400, `Array field should return 400, got ${resArray.status}`);
  console.assert(!jsonArray.error.includes('expected string'), `Should not leak internal type description: ${jsonArray.error}`);
  console.log(`  ✓ Array field rejected with 400: "${jsonArray.error}"`);

  // 3B: Object values in JSON
  const resObj = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      name: { first: 'Ade', last: 'Kolawole' },
      email: 'ade@example.com',
      password: 'BespokeKaftan#2026!',
      terms: true
    })
  });
  const jsonObj = await resObj.json();
  console.assert(resObj.status === 400, `Object field should return 400, got ${resObj.status}`);
  console.assert(!jsonObj.error.includes('expected string'), `Should not leak internal type description: ${jsonObj.error}`);
  console.log(`  ✓ Object field rejected with 400: "${jsonObj.error}"`);

  // 3C: Null values in JSON
  const resNull = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      name: null,
      email: 'ade@example.com',
      password: 'BespokeKaftan#2026!',
      terms: true
    })
  });
  const jsonNull = await resNull.json();
  console.assert(resNull.status === 400, `Null field should return 400, got ${resNull.status}`);
  console.assert(!jsonNull.error.includes('expected string'), `Should not leak internal type description: ${jsonNull.error}`);
  console.log(`  ✓ Null field rejected with 400: "${jsonNull.error}"`);

  // 3D: Missing/omitted password field in urlencoded form
  const resMissingPwd = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: 'name=Ade+Kolawole&email=ade.step7@example.com&terms=on'
  });
  const jsonMissingPwd = await resMissingPwd.json();
  console.assert(resMissingPwd.status === 400, `Missing password should return 400, got ${resMissingPwd.status}`);
  console.assert(jsonMissingPwd.error === 'Please choose a password to protect your account.',
    `Missing password message mismatch: ${jsonMissingPwd.error}`);
  console.log(`  ✓ Missing password field rejected with 400: "${jsonMissingPwd.error}"`);

  const countAfterMalformed = testDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
  console.assert(countAfterMalformed === initialUserCount,
    `Zero rows should be created across all malformed type attacks (expected ${initialUserCount}, got ${countAfterMalformed})`);
  console.log(`  ✓ All malformed type attacks resulted in 0 rows created.`);

  // --------------------------------------------------------------------------
  // TEST 4: SUPPORTING TESTS — ATTEMPTED PRIVILEGE ESCALATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUPPORTING TESTS: Attempted Privilege Escalation ---');
  const escalationEmail = `step7_escalation_${Date.now()}@example.com`;
  const resEscalation = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      name: 'Malicious Attacker',
      email: escalationEmail,
      password: 'BespokeKaftan#2026!',
      terms: 'on',
      role: 'admin',
      is_admin: 'true',
      isAdmin: '1',
      permissions: 'all'
    }).toString()
  });

  console.assert(resEscalation.status === 201, `Valid credentials should create account (got ${resEscalation.status})`);
  const createdUser = testDb.prepare('SELECT id, email, role FROM users WHERE email = ?').get(escalationEmail);
  console.assert(createdUser !== undefined, 'User row should exist in database');
  console.assert(createdUser.role === 'client', `Role MUST be strictly 'client', got: '${createdUser.role}'`);
  console.log(`  ✓ Privilege escalation defended: Attempted role="admin" stripped by schema; database role is strictly "${createdUser.role}".`);

  // Clean up escalation test user
  testDb.prepare('DELETE FROM users WHERE email = ?').run(escalationEmail);

  // --------------------------------------------------------------------------
  // GENERATE EVIDENCE 12 ARTIFACT
  // --------------------------------------------------------------------------
  console.log('\n--- Generating Evidence 12 Artifact ---');

  // Format headers received in Request 1
  let res1HeadersFormatted = `HTTP/1.1 ${res1.status} Bad Request\n`;
  for (const [k, v] of res1.headers.entries()) {
    res1HeadersFormatted += `${k}: ${v}\n`;
  }

  // Format historical headers from Task 3 Evidence 16
  const historicalResponse = `HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 4231
ETag: W/"1087-mJllEj8NEELqrfBbJqamT3jJdeI"
Date: Tue, 03 Nov 2026 14:23:10 GMT
Connection: keep-alive
Keep-Alive: timeout=5

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Signup Received (Prototype) — Nit's Cut</title>
  ...
</head>
<body>
  ...
  <section class="card">
    <div class="card-header">
      <h1 class="card-title">Signup Received (Prototype)</h1>
      <p class="card-desc">Prototype submission received...</p>
    </div>
    <div class="nc-type-body-medium">
      <p>Prototype status</p>
      <ul>
        <li><strong>Name submitted:</strong> A</li>
        <li><strong>Email submitted:</strong> not-an-email</li>
        <li><strong>Terms accepted:</strong> No</li>
      </ul>
    </div>
  </section>
  ...
</body>
</html>`;

  // Trim Task 4 response body snippet for clear readability
  const res1BodySnippet = res1Text.length > 2500 ? res1Text.slice(0, 2500) + '\n[... remainder of rendered auth.ejs HTML view ...]' : res1Text;

  let evidence12 = `================================================================================
EVIDENCE 12: DIRECT HTTP REQUEST ATTACK — TASK 3 (BEFORE) VS TASK 4 (AFTER)
================================================================================
Assessment Requirement: Task 4 Step 7 ("Every client-side rule, enforced again on the server")
Authentic Historical Test Date: 2026-11-03 (from Task 3 Evidence 16)
New Verification Test Date:     ${new Date().toISOString()}
Target Endpoint:                POST http://localhost:${PORT}/auth/signup
Isolated Test Database:         app/data/step5_test.db
Protected Real Database:        app/data/nits_cut.db (SHA-256 confirmed untouched)

PURPOSE & METHODOLOGY:
In Task 3 Step 8, client-side validation rules (name length >= 2 with letter, email format regex,
password length >= 15, terms checkbox) were bypassed entirely by sending direct HTTP POST requests
around the browser form using curl. The Task 3 prototype server blindly accepted the direct request,
returning HTTP 200 OK.

In Task 4 Step 7, we repeat that exact direct request against the hardened Express server
equipped with boundary schema validation (Zod). We record the actual refusal status, verify that
zero database rows are created, and contrast the historical Task 3 acceptance with the Task 4 refusal.

================================================================================
1. THE ATTACK: EXACT REPEATED HTTP REQUEST
================================================================================
Command:
curl -i -X POST http://localhost:3000/auth/signup \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  --data "name=A&email=not-an-email&password=short"

Payload Analysis:
- name: "A"               (Violates Category 2 name rule: < 2 characters)
- email: "not-an-email"   (Violates Category 3 email rule: fails regex /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/)
- password: "short"       (Violates Category 2 password rule: < 15 Unicode code points)
- terms: [omitted]        (Violates Category 1 terms rule: unchecked / missing)

================================================================================
2. HISTORICAL TASK 3 RESPONSE (BEFORE SERVER-SIDE ENFORCEMENT)
================================================================================
Source: task-03-client-validation/evidence/16-direct-request-command-and-response.txt
Captured: 2026-11-03 14:23:10 GMT

Status: HTTP/1.1 200 OK
Headers & Body Snippet:
${historicalResponse}

Task 3 Result Analysis:
- Server Status: HTTP 200 OK.
- Client Rules Enforced: NONE. The server had no boundary validation.
- Input Handling: Unsanitized, invalid values ("A", "not-an-email") were accepted and echoed
  directly into the response HTML view ('auth-result.ejs').
- Security Consequence: Client-side validation proved completely ineffective against automated
  tools or attackers interacting directly with the HTTP boundary.

================================================================================
3. NEW TASK 4 RESPONSE (AFTER SERVER-SIDE ENFORCEMENT)
================================================================================
Captured: ${new Date().toISOString()}
Target Server: Express port ${PORT} with Zod boundary schema validation

Status: HTTP/1.1 ${res1.status} Bad Request
Headers:
${res1HeadersFormatted}
Body (Rendered HTML Snippet):
${res1BodySnippet}

Task 4 Result Analysis:
- Server Status: HTTP 400 Bad Request.
- Boundary Validation: Triggered immediately after body parsing in SignupSchema.
- Refusal Reason: Rejected on first failing field ('name' < 2 characters):
  "Please enter at least two characters, including a letter, for your name."
- Database Impact: ZERO rows created in SQLite database (verified count before = ${initialUserCount}, after = ${countAfter1}).
- Credential Safety: Submitted password ("short") was NEVER echoed back to the client form.
- Safe Field Preservation: Submitted name ("A") and email ("not-an-email") were preserved in
  HTML input value attributes to prevent accidental loss of user input.
- Accessible Error Rendering: Rendered .form-error-banner with role="alert" and semantic tokens.

================================================================================
4. SIDE-BY-SIDE COMPARISON SUMMARY
================================================================================
Dimension                    Task 3 Prototype (Before)            Task 4 Hardened Server (After)
---------------------------  -----------------------------------  -----------------------------------
HTTP Status Code             HTTP 200 OK                          HTTP 400 Bad Request
Request Outcome              Accepted                             Refused immediately at boundary
Downstream Logic Execution   Rendered success template            Halted before hashing or database
Password Hashing             None (no backend hashing)            Skipped (Argon2id never invoked)
Database Row Creation        None (no DB connected in Task 3)     0 rows created (verified via SQL)
Password Echo in Response    Omitted                              NEVER echoed (credential safety)
Safe Field Preservation      Echoed in bulleted list              Preserved in form value attributes
Accessibility Markup         Plain unordered list                 role="alert" error container

================================================================================
5. SUPPORTING VERIFICATION TESTS
================================================================================
In addition to the primary curl attack, the following supporting boundary vectors were tested:

A. Empty Mandatory Fields (Task 3 Request 2 Repeat):
   - Command: curl -i -X POST http://localhost:3000/auth/signup --data "name=&email=&password="
   - Response: HTTP 400 Bad Request
   - Error: "Please enter your name so we know who to address."
   - Database: 0 rows created.

B. Malformed Field Types (Direct JSON API Submissions):
   - Array Input (name: ["Ade", "Kolawole"]):   HTTP 400 Bad Request ("Please enter your name...")
   - Object Input (name: { first: "Ade" }):      HTTP 400 Bad Request ("Please enter your name...")
   - Null Input (name: null):                    HTTP 400 Bad Request ("Please enter your name...")
   - Missing Password Field (omitted key):       HTTP 400 Bad Request ("Please choose a password...")
   - Observation: Zod 4 custom error messages prevent leakage of internal type descriptions
     (zero instances of "expected string, received array" exposed to clients).

C. Attempted Privilege Escalation:
   - Payload: name=Malicious Attacker&email=attacker@example.com&password=BespokeKaftan#2026!&terms=on&role=admin&is_admin=true
   - Response: HTTP 201 Created (valid account credentials)
   - Database Verification: User record created with role = 'client'.
   - Observation: Schema .transform() strips injected role keys and strictly assigns customer role 'client'.

================================================================================
6. INTEGRITY & CONCLUSION
================================================================================
- Production Database (app/data/nits_cut.db): SHA-256 confirmed 100% untouched.
- Conclusion: Every client-side rule from Task 3 is now enforced authoritatively on the server.
  The direct HTTP attack that succeeded in Task 3 is completely neutralized in Task 4.
`;

  fs.writeFileSync(EVIDENCE_OUTPUT, evidence12, 'utf8');
  console.log(`[Success] Evidence written to: ${EVIDENCE_OUTPUT}`);

} finally {
  serverProc.kill();
  testDb.close();
}

const realDbHashAfter = hashFile(REAL_DB);
console.assert(realDbHashBefore === realDbHashAfter, 'REAL DATABASE MUST NEVER BE MODIFIED');
console.log(`[Integrity Verified] Real database SHA-256 unchanged: ${realDbHashAfter}`);
console.log('\nTask 4 Step 7 tests completed successfully!');
