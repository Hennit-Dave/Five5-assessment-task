#!/usr/bin/env node
// Task 4 Step 4 — Script 1: Hash Same Password Twice with Argon2id
// Requirement: Show both complete encoded hashes, confirm they differ,
// verify that correct password matches both, and incorrect password fails.
// Uses explicitly documented Argon2id settings with resolved dependency from app.

import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve `argon2` installed inside `app/node_modules`
const appRequire = createRequire(new URL('../../app/package.json', import.meta.url));
const argon2 = appRequire('argon2');

// Read exact installed argon2 package version
const argon2Pkg = appRequire('argon2/package.json');
const argon2InstalledVersion = argon2Pkg.version || 'unknown';

// Clearly labelled fictional test password (never a real credential)
const FICTIONAL_TEST_PASSWORD = 'BespokeKaftan#2026!';
const WRONG_TEST_PASSWORD = 'WrongPassword#999!';

// Explicitly documented Argon2id configuration
// - RFC 9106 Section 7.4 Second Recommended Profile (memory-constrained environments)
// - type: argon2id (hybrid mode combining data-independent and data-dependent memory passes)
// - memoryCost: 65536 KiB = 64 MiB
// - timeCost: 3 iterations (passes over memory)
// - parallelism: 4 threads / lanes
// - hashLength: 32 bytes output
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32
};

async function main() {
  console.log('=== Task 4 Step 4: Argon2id Hashed Twice Verification ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Host machine: ${os.hostname()} (${os.type()} ${os.arch()} - ${os.cpus()[0]?.model || 'Unknown CPU'})`);
  console.log(`Node.js runtime: ${process.version}`);
  console.log(`Library: argon2 v${argon2InstalledVersion} (installed)`);
  console.log('');
  console.log('--- Argon2id Configuration (RFC 9106 Section 7.4 Profile) ---');
  console.log(`  - Algorithm: Argon2id (type = ${ARGON2_CONFIG.type})`);
  console.log(`  - Memory cost: ${ARGON2_CONFIG.memoryCost} KiB (64 MiB)`);
  console.log(`  - Time cost (iterations): ${ARGON2_CONFIG.timeCost}`);
  console.log(`  - Parallelism (lanes/threads): ${ARGON2_CONFIG.parallelism}`);
  console.log(`  - Output hash length: ${ARGON2_CONFIG.hashLength} bytes`);
  console.log('');
  console.log('--- Fictional Test Input ---');
  console.log(`  - Test password: "${FICTIONAL_TEST_PASSWORD}"`);
  console.log('');

  // Hash 1
  const hash1 = await argon2.hash(FICTIONAL_TEST_PASSWORD, ARGON2_CONFIG);
  // Hash 2
  const hash2 = await argon2.hash(FICTIONAL_TEST_PASSWORD, ARGON2_CONFIG);

  console.log('--- Generated Complete Modular Crypt Hashes ---');
  console.log(`Hash 1: ${hash1}`);
  console.log(`Hash 2: ${hash2}`);
  console.log('');

  // Verifications
  const hashesDiffer = hash1 !== hash2;
  const verify1Correct = await argon2.verify(hash1, FICTIONAL_TEST_PASSWORD);
  const verify2Correct = await argon2.verify(hash2, FICTIONAL_TEST_PASSWORD);
  const verify1Wrong = await argon2.verify(hash1, WRONG_TEST_PASSWORD);
  const verify2Wrong = await argon2.verify(hash2, WRONG_TEST_PASSWORD);

  console.log('--- Verification Checks ---');
  console.log(`1. Do the two encoded hashes differ? ${hashesDiffer ? 'YES (different)' : 'NO (FAILED: identical)'}`);
  console.log(`2. Does the correct password verify against Hash 1? ${verify1Correct ? 'YES (valid)' : 'NO (FAILED)'}`);
  console.log(`3. Does the correct password verify against Hash 2? ${verify2Correct ? 'YES (valid)' : 'NO (FAILED)'}`);
  console.log(`4. Does an incorrect password fail against Hash 1? ${!verify1Wrong ? 'YES (correctly rejected)' : 'NO (FAILED: accepted wrong password)'}`);
  console.log(`5. Does an incorrect password fail against Hash 2? ${!verify2Wrong ? 'YES (correctly rejected)' : 'NO (FAILED: accepted wrong password)'}`);
  console.log('');

  console.log('--- One-Line Explanation of Why the Two Outputs Differ ---');
  console.log(
    'Each Argon2id invocation automatically generates a fresh, cryptographically secure 16-byte random salt, ensuring identical passwords produce entirely different encoded hashes.'
  );

  if (!hashesDiffer || !verify1Correct || !verify2Correct || verify1Wrong || verify2Wrong) {
    console.error('\n[ERROR] Verification assertions failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[Script Error]', err);
  process.exit(1);
});
