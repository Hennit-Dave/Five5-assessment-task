#!/usr/bin/env node
// Task 4 Step 4 — Script 2: Benchmark Argon2id vs SHA-256 Timing
// Requirement:
// - Compare Argon2id and SHA-256 using a high-resolution timer, warm-up runs,
//   and repeated measurements over enough iterations to avoid rounding to zero.
// - Keep logging strictly outside timed sections.
// - Record machine/CPU, Node and library versions, Argon2id parameters,
//   iteration counts, total measured durations, and average time per hash.
// - Show the arithmetic:
//     * milliseconds per hash = total milliseconds / iteration count
//     * local sequential hashes per second = 1000 / milliseconds per hash
//     * relative slowdown = Argon2id time per hash / SHA-256 time per hash

import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve `argon2` installed inside `app/node_modules`
const appRequire = createRequire(new URL('../../app/package.json', import.meta.url));
const argon2 = appRequire('argon2');
const argon2Pkg = appRequire('argon2/package.json');
const argon2InstalledVersion = argon2Pkg.version || 'unknown';

// Clearly labelled fictional test password (never a real credential)
const FICTIONAL_TEST_PASSWORD = 'BespokeKaftan#2026!';

// Explicitly documented Argon2id settings
// (RFC 9106 Section 7.4 Second Recommended Profile for memory-constrained environments)
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536, // 65,536 KiB = 64 MiB
  timeCost: 3,       // 3 iterations (passes over memory)
  parallelism: 4,    // 4 parallel threads/lanes
  hashLength: 32
};

// Iteration counts designed to provide statistical stability while keeping durations sensible:
// - Argon2id: 10 iterations (~300-800ms total wall-clock duration)
// - SHA-256: 250,000 iterations (~50-150ms total wall-clock duration, avoids timer zero-rounding)
const ARGON_WARMUP_COUNT = 2;
const ARGON_ITERATIONS = 10;

const SHA_WARMUP_COUNT = 1000;
const SHA_ITERATIONS = 250000;

async function main() {
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || 'Unknown CPU';
  const cpuSpeed = cpus[0]?.speed ? `${cpus[0].speed} MHz` : 'N/A';
  const totalMemGb = (os.totalmem() / (1024 ** 3)).toFixed(2);

  console.log('=== Task 4 Step 4: Password Hashing Timing Benchmark ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Host machine: ${os.hostname()} (${os.type()} ${os.arch()} / ${os.release()})`);
  console.log(`CPU model: ${cpuModel} (${cpus.length} logical cores, ${cpuSpeed})`);
  console.log(`Total system RAM: ${totalMemGb} GB`);
  console.log(`Node.js runtime: ${process.version}`);
  console.log(`Argon2 library: argon2 v${argon2InstalledVersion} (installed)`);
  console.log(`Execution model: sequential hash calls (Argon2id configured with parallelism = 4 lanes)`);
  console.log(`Timer: performance.now() measuring elapsed wall-clock duration`);
  console.log('');
  console.log('--- Test Password ---');
  console.log(`Fictional test password: "${FICTIONAL_TEST_PASSWORD}"`);
  console.log('');
  console.log('--- Argon2id Benchmark Parameters (RFC 9106 Section 7.4 Profile) ---');
  console.log(`  - Type: Argon2id (type = ${ARGON2_CONFIG.type})`);
  console.log(`  - Memory cost: ${ARGON2_CONFIG.memoryCost} KiB (64 MiB)`);
  console.log(`  - Time cost (passes): ${ARGON2_CONFIG.timeCost}`);
  console.log(`  - Parallelism: ${ARGON2_CONFIG.parallelism} lanes`);
  console.log(`  - Hash length: ${ARGON2_CONFIG.hashLength} bytes`);
  console.log('');

  // 1. Warm-up Phase (outside timing)
  console.log('--- Phase 1: Warm-up (unmetered) ---');
  process.stdout.write(`Executing ${ARGON_WARMUP_COUNT} Argon2id warm-up hashes... `);
  for (let i = 0; i < ARGON_WARMUP_COUNT; i += 1) {
    await argon2.hash(FICTIONAL_TEST_PASSWORD, ARGON2_CONFIG);
  }
  console.log('done.');

  process.stdout.write(`Executing ${SHA_WARMUP_COUNT} SHA-256 warm-up hashes... `);
  for (let i = 0; i < SHA_WARMUP_COUNT; i += 1) {
    crypto.createHash('sha256').update(FICTIONAL_TEST_PASSWORD, 'utf8').digest('hex');
  }
  console.log('done.');
  console.log('');

  // 2. Timed Argon2id Measurement Loop
  console.log(`--- Phase 2: Timing Argon2id (${ARGON_ITERATIONS} sequential iterations, p=4) ---`);
  const argonStart = performance.now();
  for (let i = 0; i < ARGON_ITERATIONS; i += 1) {
    await argon2.hash(FICTIONAL_TEST_PASSWORD, ARGON2_CONFIG);
  }
  const argonEnd = performance.now();
  const argonTotalMs = argonEnd - argonStart;
  const argonMsPerHash = argonTotalMs / ARGON_ITERATIONS;
  const argonHashesPerSec = 1000 / argonMsPerHash;

  console.log(`Argon2id measurement complete: ${argonTotalMs.toFixed(3)} ms elapsed wall-clock time.`);
  console.log('');

  // 3. Timed SHA-256 Measurement Loop
  console.log(`--- Phase 3: Timing SHA-256 (${SHA_ITERATIONS.toLocaleString()} sequential iterations) ---`);
  const shaStart = performance.now();
  for (let i = 0; i < SHA_ITERATIONS; i += 1) {
    crypto.createHash('sha256').update(FICTIONAL_TEST_PASSWORD, 'utf8').digest('hex');
  }
  const shaEnd = performance.now();
  const shaTotalMs = shaEnd - shaStart;
  const shaMsPerHash = shaTotalMs / SHA_ITERATIONS;
  const shaHashesPerSec = 1000 / shaMsPerHash;

  console.log(`SHA-256 measurement complete: ${shaTotalMs.toFixed(3)} ms elapsed wall-clock time.`);
  console.log('');

  // 4. Comparative Arithmetic
  const slowdownFactor = argonMsPerHash / shaMsPerHash;

  console.log('======================================================================');
  console.log('TIMING RESULTS SUMMARY (ELAPSED WALL-CLOCK TIME)');
  console.log('======================================================================');
  console.log(`Argon2id total duration:        ${argonTotalMs.toFixed(3)} ms for ${ARGON_ITERATIONS} iterations`);
  console.log(`Argon2id average time per hash: ${argonMsPerHash.toFixed(3)} ms/hash`);
  console.log(`Argon2id sequential throughput: ${argonHashesPerSec.toFixed(2)} hashes/sec`);
  console.log('');
  console.log(`SHA-256 total duration:         ${shaTotalMs.toFixed(3)} ms for ${SHA_ITERATIONS.toLocaleString()} iterations`);
  console.log(`SHA-256 average time per hash:  ${shaMsPerHash.toFixed(6)} ms/hash (${(shaMsPerHash * 1000).toFixed(3)} µs/hash)`);
  console.log(`SHA-256 sequential throughput:  ${shaHashesPerSec.toLocaleString(undefined, { maximumFractionDigits: 0 })} hashes/sec`);
  console.log('');
  console.log('======================================================================');
  console.log('STEP-BY-STEP ARITHMETIC');
  console.log('======================================================================');
  console.log('1. Milliseconds per hash (total ms / iterations):');
  console.log(`   - Argon2id: ${argonTotalMs.toFixed(3)} ms / ${ARGON_ITERATIONS} = ${argonMsPerHash.toFixed(4)} ms/hash`);
  console.log(`   - SHA-256:  ${shaTotalMs.toFixed(3)} ms / ${SHA_ITERATIONS} = ${shaMsPerHash.toFixed(7)} ms/hash`);
  console.log('');
  console.log('2. Local sequential hashes per second (1000 ms / ms per hash):');
  console.log(`   - Argon2id: 1000 / ${argonMsPerHash.toFixed(4)} = ${argonHashesPerSec.toFixed(2)} hashes/sec`);
  console.log(`   - SHA-256:  1000 / ${shaMsPerHash.toFixed(7)} = ${shaHashesPerSec.toLocaleString(undefined, { maximumFractionDigits: 0 })} hashes/sec`);
  console.log('');
  console.log('3. Relative slowdown ratio (Argon2id ms per hash / SHA-256 ms per hash):');
  console.log(`   - Ratio: ${argonMsPerHash.toFixed(4)} / ${shaMsPerHash.toFixed(7)} = ${slowdownFactor.toLocaleString(undefined, { maximumFractionDigits: 0 })}x slower`);
  console.log(`   - In other words, Argon2id is approximately ${slowdownFactor.toLocaleString(undefined, { maximumFractionDigits: 0 })} times slower than SHA-256 in sequential execution on this host.`);
  console.log('');
  console.log('======================================================================');
  console.log('SECURITY ANALYSIS & HARDWARE CONTEXT');
  console.log('======================================================================');
  console.log('1. The Inversion:');
  console.log('   - For our application, evaluating Argon2id once during an authentication request costs ~' + Math.round(argonMsPerHash) + ' ms');
  console.log('     of elapsed wall-clock time, which is acceptable for a user waiting on network round-trips.');
  console.log('   - For an attacker attempting offline password recovery against a stolen database,');
  console.log('     every candidate guess requires dedicating both repeated compute passes and a substantial');
  console.log('     64 MiB memory buffer, multiplying the resource cost of each tested password.');
  console.log('');
  console.log('2. Hardware & Architecture Context:');
  console.log('   - This benchmark measures sequential execution on a general-purpose host CPU with p=4.');
  console.log('   - An attacker\'s actual guessing throughput depends heavily on their hardware architecture');
  console.log('     (such as GPU clusters, FPGAs, or custom ASICs) and optimized cracking implementations.');
  console.log('   - However, Argon2id\'s 64 MiB memory requirement creates a significant physical memory footprint');
  console.log('     per worker, making concurrent guesses far more hardware-intensive than for memory-free');
  console.log('     algorithms like SHA-256, which can run millions of instances in parallel with negligible RAM.');
  console.log('   - These resource requirements represent a real server cost: authentication capacity is finite,');
  console.log('     reinforcing why backend rate limiting and boundary controls (Step 8) are necessary.');
  console.log('======================================================================');
}

main().catch((err) => {
  console.error('\n[Benchmark Error]', err);
  process.exit(1);
});
