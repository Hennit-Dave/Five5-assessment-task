// test-step5-normalisation.mjs
// Automated verification for Task 4 Step 5: Email Normalization & Password Trimming.
// Operates exclusively against an isolated test database: app/data/step5_test.db.
// NEVER touches or modifies the production database app/data/nits_cut.db.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const TEST_DB = path.join(rootDir, 'app/data/step5_test.db');
const REAL_DB = path.join(rootDir, 'app/data/nits_cut.db');
const MIGRATIONS_DIR = path.join(rootDir, 'app/migrations');

console.log('================================================================');
console.log('TASK 4 STEP 5: EMAIL NORMALISATION & PASSWORD TRIMMING TEST SUITE');
console.log('================================================================');
console.log(`Target isolated database: ${TEST_DB}`);
console.log(`Protected real database:  ${REAL_DB}`);

// Step 0: Ensure real database is untouched
const realDbBeforeStats = fs.statSync(REAL_DB);
const realDbBeforeSize = realDbBeforeStats.size;

// Clean up any prior test database
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}
if (fs.existsSync(`${TEST_DB}-wal`)) fs.unlinkSync(`${TEST_DB}-wal`);
if (fs.existsSync(`${TEST_DB}-shm`)) fs.unlinkSync(`${TEST_DB}-shm`);

// Run migrations on isolated test database
console.log('\n[Setup] Migrating isolated test database...');
execFileSync('node', [
  path.join(rootDir, 'app/src/migrate.js'),
  '--db', TEST_DB,
  '--dir', MIGRATIONS_DIR
], { stdio: 'inherit' });

// Set environment variable so getDb() resolves to the test database
process.env.DATABASE_PATH = TEST_DB;

// Dynamic import after env var is set
const {
  createUser,
  findUserByEmail,
  verifyUserCredentials,
  DuplicateEmailError,
  getDb,
  closeDb
} = await import('../../app/src/db.js');

const {
  normalizeEmail,
  normalizePassword,
  validateSignupPassword
} = await import('../../app/src/auth.js');

const db = getDb();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

// ----------------------------------------------------------------------------
// TEST 1: Signup with mixed-case email, verify credentials using lowercase
// ----------------------------------------------------------------------------
console.log('\n--- TEST 1: Mixed-case Email Normalization ---');
const user1 = await createUser({
  fullName: 'Ade Kolawole',
  email: 'Ade.Kolawole@EXAMPLE.COM',
  password: 'BespokeKaftan#2026!'
});

assert(user1.email === 'ade.kolawole@example.com', 'Created user object contains lowercased email');
assert(user1.role === 'client', 'Created user is assigned customer role "client" on server');

const row1 = db.prepare('SELECT id, email, password_hash, role FROM users WHERE id = ?').get(user1.id);
assert(row1.email === 'ade.kolawole@example.com', 'Database record stores strictly lowercase email');
assert(row1.role === 'client', 'Database record role is strictly "client"');
assert(row1.password_hash.startsWith('$argon2id$v=19$m=65536,t=3,p=4$'), 'Database stores Argon2id encoded hash, never plain text');
assert(!row1.password_hash.includes('BespokeKaftan#2026!'), 'Plain text password is absent from database');

// Verify with lowercase email
const verifyLower = await verifyUserCredentials('ade.kolawole@example.com', 'BespokeKaftan#2026!');
assert(verifyLower !== null && verifyLower.email === 'ade.kolawole@example.com', 'Login succeeds with lowercase email');

// Verify with uppercase email
const verifyUpper = await verifyUserCredentials('ADE.KOLAWOLE@EXAMPLE.COM', 'BespokeKaftan#2026!');
assert(verifyUpper !== null && verifyUpper.email === 'ade.kolawole@example.com', 'Login succeeds with uppercase email (server normalizes on login)');

// ----------------------------------------------------------------------------
// TEST 2: Signup with surrounding whitespace around password, verify trimmed
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Password Leading/Trailing Whitespace Trimming ---');
const user2 = await createUser({
  fullName: 'Dapo Adeleke',
  email: 'dapo.adeleke@example.com',
  password: '   BespokeKaftan#2026!   ' // 3 leading and 3 trailing spaces
});

assert(user2.id > 0, 'User created successfully with password containing surrounding whitespace');

// Verify with clean trimmed password
const verifyTrimmed = await verifyUserCredentials('dapo.adeleke@example.com', 'BespokeKaftan#2026!');
assert(verifyTrimmed !== null, 'Login succeeds when entering password without surrounding spaces');

// Verify with different surrounding spaces on login
const verifySpaces = await verifyUserCredentials('dapo.adeleke@example.com', '  BespokeKaftan#2026! ');
assert(verifySpaces !== null, 'Login succeeds with different surrounding spaces on login (server trims candidate)');

// ----------------------------------------------------------------------------
// TEST 3: Confirm changing password capitalization fails
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Password Case Sensitivity Preserved ---');
const verifyWrongCase = await verifyUserCredentials('dapo.adeleke@example.com', 'bespokekaftan#2026!');
assert(verifyWrongCase === null, 'Login correctly fails when password capitalization is changed');

// ----------------------------------------------------------------------------
// TEST 4: Confirm internal spaces remain meaningful
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: Internal Spaces Preserved Intact ---');
// User 2 was created with single space between Bespoke and Kaftan (password: 'BespokeKaftan#2026!')
// Let's create a user with a multi-word passphrase containing deliberate internal spaces
const user3 = await createUser({
  fullName: 'Chinedu Okafor',
  email: 'chinedu.okafor@example.com',
  password: 'Senator Suit Blue Velvet 2026!'
});

// Correct password verifies
const verifyInternalExact = await verifyUserCredentials('chinedu.okafor@example.com', 'Senator Suit Blue Velvet 2026!');
assert(verifyInternalExact !== null, 'Login succeeds with exact internal passphrase spaces');

// Changing internal spaces (e.g. collapsing or doubling internal spaces) must fail
const verifyDoubleSpace = await verifyUserCredentials('chinedu.okafor@example.com', 'Senator  Suit Blue Velvet 2026!');
assert(verifyDoubleSpace === null, 'Login fails when internal spaces are doubled (internal spaces are preserved)');

const verifyNoSpace = await verifyUserCredentials('chinedu.okafor@example.com', 'SenatorSuitBlueVelvet2026!');
assert(verifyNoSpace === null, 'Login fails when internal spaces are removed');

// ----------------------------------------------------------------------------
// TEST 5: Confirm duplicate normalized email creates no second account
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: Duplicate Normalized Email Rejection ---');
const usersCountBefore = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

let duplicateCaught = false;
try {
  await createUser({
    fullName: 'Ade Impersonator',
    email: 'ADE.KOLAWOLE@example.com', // Duplicate of user 1 when normalized
    password: 'AnotherPassword#2026!'
  });
} catch (err) {
  if (err instanceof DuplicateEmailError || err.code === 'EMAIL_EXISTS') {
    duplicateCaught = true;
  }
}

assert(duplicateCaught, 'createUser rejects duplicate normalized email with DuplicateEmailError');

const usersCountAfter = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
assert(usersCountAfter === usersCountBefore, `User count in database unchanged (${usersCountAfter} users)`);

// ----------------------------------------------------------------------------
// TEST 6: Confirm invalid submissions create no user
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: Invalid Submissions Rejection ---');
const countBeforeInvalid = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

// Short password (< 15 characters)
let shortPwCaught = false;
try {
  await createUser({
    fullName: 'Test Short',
    email: 'short@example.com',
    password: 'Short#12345'
  });
} catch (err) {
  if (err.code === 'INVALID_PASSWORD') shortPwCaught = true;
}
assert(shortPwCaught, 'Rejects password shorter than 15 characters');

// Spaces-only password
let spacesPwCaught = false;
try {
  await createUser({
    fullName: 'Test Spaces',
    email: 'spaces@example.com',
    password: '                 ' // 17 spaces
  });
} catch (err) {
  if (err.code === 'INVALID_PASSWORD') spacesPwCaught = true;
}
assert(spacesPwCaught, 'Rejects password consisting solely of whitespace');

// Invalid email format
let badEmailCaught = false;
try {
  await createUser({
    fullName: 'Test Bad Email',
    email: 'invalid-email-format',
    password: 'ValidPasswordLength#2026!'
  });
} catch (err) {
  if (err.code === 'INVALID_EMAIL') badEmailCaught = true;
}
assert(badEmailCaught, 'Rejects invalid email format');

// Invalid name (mononym allowed if >= 2 chars and has letter; single char rejected)
let badNameCaught = false;
try {
  await createUser({
    fullName: 'X',
    email: 'valid.name@example.com',
    password: 'ValidPasswordLength#2026!'
  });
} catch (err) {
  if (err.code === 'INVALID_NAME') badNameCaught = true;
}
assert(badNameCaught, 'Rejects 1-character name');

const countAfterInvalid = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
assert(countAfterInvalid === countBeforeInvalid, `Database row count remains unchanged (${countAfterInvalid} users)`);

// Close database connection
closeDb();

// ----------------------------------------------------------------------------
// Final Verification: Ensure real database was completely untouched
// ----------------------------------------------------------------------------
const realDbAfterStats = fs.statSync(REAL_DB);
assert(
  realDbBeforeStats.size === realDbAfterStats.size && realDbBeforeStats.mtimeMs === realDbAfterStats.mtimeMs,
  'Real application database (app/data/nits_cut.db) was completely untouched and preserved'
);

console.log('\n================================================================');
console.log(`SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
}
