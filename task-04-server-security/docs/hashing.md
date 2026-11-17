# Task 4, Step 4: Password Hashing and Why Fast Is Wrong (`docs/hashing.md`)

> **Status:** Completed on 2026-11-09. Standalone double-hash verification and timing benchmark executed personally by the learner on their local machine. Genuine output captured in [`evidence/07-hash-twice-different.txt`](../evidence/07-hash-twice-different.txt) and [`evidence/08-timing-argon-vs-sha.txt`](../evidence/08-timing-argon-vs-sha.txt).
>
> *Note on Scope:* This document records the completed standalone benchmarking and algorithm verification for Step 4. Integrating Argon2id into application user registration, password verification on login, and database storage (`users.password_hash`) is part of subsequent application-level steps (Steps 5–7).

---

## 1. Chosen Algorithm and Explicit Parameter Configuration

For Nit's Cut user password storage, we use **Argon2id**, the modern state-of-the-art password hashing function selected as the winner of the Password Hashing Competition (PHC) and specified in IETF RFC 9106.

### Why Argon2id rather than Argon2d or Argon2i
- **Argon2d** accesses memory in a data-dependent order based on password bytes. This provides maximum resistance against GPU/ASIC password cracking, but introduces vulnerability to side-channel cache-timing attacks on multi-tenant or shared CPU architectures.
- **Argon2i** accesses memory in a data-independent order, neutralizing cache-timing side-channels, but is somewhat more vulnerable to tradeoff attacks on specialized hardware.
- **Argon2id** is a hybrid: it uses data-independent memory access in the first half of the first iteration (protecting against side-channel attacks during the most sensitive phase) and data-dependent memory access thereafter (maximizing resistance against GPU cracking). Current OWASP recommendations specify Argon2id as the premier choice for password storage.

### Explicit Parameter Settings (RFC 9106 Section 7.4 Profile)
We configure the `argon2` Node.js library (installed version `argon2@0.45.2`) using explicit parameter values corresponding to RFC 9106 Section 7.4 (Second Recommended Profile for memory-constrained environments):

```javascript
export const ARGON2_CONFIG = {
  type: argon2.argon2id, // Algorithm type: Argon2id (type = 2)
  memoryCost: 65536,     // 65,536 KiB = 64 MiB of RAM per hash
  timeCost: 3,           // 3 iterations (passes over the allocated memory)
  parallelism: 4,        // 4 lanes / computation threads
  hashLength: 32         // 32-byte cryptographic output digest
};
```

### Library Units and Specification Attribution
- **RFC 9106 Specification Context:** RFC 9106 Section 7.4 specifies a first recommended profile of $m = 2\text{ GiB}$ ($t=1, p=4$) for backend authentication systems where multi-gigabyte memory allocations are feasible. For environments with memory constraints or high concurrency where 2 GiB per hash is impractical, RFC 9106 Section 7.4 provides the **Second Recommended Profile**: $m = 64\text{ MiB}$ ($65{,}536\text{ KiB}$), $t = 3$ iterations, and $p = 4$ lanes. OWASP references this RFC profile as a viable alternative for memory-constrained deployments.
- **Memory units (`memoryCost`):** The `argon2` npm package measures `memoryCost` in **KiB (kibibytes)**. A value of `65536` equates exactly to $65{,}536 \times 1024 \text{ bytes} = 67{,}108{,}864 \text{ bytes} = 64 \text{ MiB}$.
- **Time units (`timeCost`):** Represents the integer number of complete passes over the allocated memory buffer. 3 passes ensures strong cryptographic diffusion.
- **Thread units (`parallelism`):** Represents the number of parallel memory lanes computed in synchronization. 4 lanes matches standard multi-core CPU architectures.

---

## 2. Salting: Purpose, Automation, and Attack Consequences

### What a Salt Does
A cryptographic salt is a unique, cryptographically secure random sequence of bytes generated independently for every password before hashing. The salt is combined with the plaintext password so that identical passwords result in completely different hash strings.

### How Argon2id Handles Salting
The `argon2` library generates a fresh 16-byte random salt using a cryptographically secure pseudorandom number generator (`crypto.randomBytes(16)`) for every single call to `argon2.hash()`. The output is encoded using the standard **modular crypt format**:

$$\$argon2id\$v=19\$m=65536,t=3,p=4\$\langle\text{salt\_base64}\rangle\$\langle\text{digest\_base64}\rangle$$

Because the salt and algorithm parameters are stored directly within the serialized string, the verification helper (`argon2.verify(encodedHash, password)`) extracts the exact salt and tuning parameters used during creation to evaluate incoming candidate passwords without needing separate database columns.

### Verification Checks Passed in Evidence 07
When executed with the fictional test password `"BespokeKaftan#2026!"` ([`evidence/07-hash-twice-different.txt`](../evidence/07-hash-twice-different.txt)), all five automated verification checks passed:
1. **Hash Difference Check:** Hash 1 (`$argon2id$...IafeEyr...`) and Hash 2 (`$argon2id$...aaJruPf...`) are confirmed distinct (`hash1 !== hash2` $\rightarrow$ `true`).
2. **Correct Password Verification (Hash 1):** `argon2.verify(hash1, "BespokeKaftan#2026!")` $\rightarrow$ `true` (valid).
3. **Correct Password Verification (Hash 2):** `argon2.verify(hash2, "BespokeKaftan#2026!")` $\rightarrow$ `true` (valid).
4. **Incorrect Password Rejection (Hash 1):** `argon2.verify(hash1, "WrongPassword#999!")` $\rightarrow$ `false` (correctly rejected).
5. **Incorrect Password Rejection (Hash 2):** `argon2.verify(hash2, "WrongPassword#999!")` $\rightarrow$ `false` (correctly rejected).

### What an Attacker Could Do If Salting Were Skipped
If passwords were saved without unique salts:
1. **Precomputed Rainbow Tables:** An attacker could precompute hashes for millions of common passwords once, store them in a lookup table or rainbow table, and invert stolen hashes in $O(1)$ time with a simple dictionary lookup.
2. **Multi-Target Batch Cracking:** If 50 users at Nit's Cut chose the password `Password123!`, an unsalted database would store 50 identical hashes. An attacker testing one candidate guess would check it against every account simultaneously. Salting forces the attacker to crack each user's hash completely independently from scratch ($N$ separate brute-force computations for $N$ accounts).

---

## 3. Why SHA-256 Is Unsuitable for Password Storage

SHA-256 is an excellent cryptographic hash function for its intended purpose: **verifying data integrity and computing digital signatures rapidly**. It is designed to process large data streams with minimal CPU latency and maximum throughput (hundreds of megabytes or gigabytes per second).

However, **rapid throughput is the exact opposite of what password storage requires**:
1. **Trivial Memory Footprint:** SHA-256 requires only a few dozen bytes of internal state (eight 32-bit registers). It requires zero external RAM.
2. **Massive Parallelism on GPUs and ASICs:** Because SHA-256 uses almost no memory, modern consumer graphics cards (e.g. NVIDIA RTX 4090) can run tens of thousands of hash computations concurrently across thousands of lightweight GPU cores. A single modern GPU can compute **billions of SHA-256 hashes per second**.
3. **Catastrophic Offline Vulnerability:** If Chijioke's driving school database is dumped, an attacker can test billions of password guesses per second on commodity hardware, exhausting 8-character alphanumeric password spaces within hours.

---

## 4. Why Argon2id's Time and Memory Cost Raises the Cost of Guessing

Argon2id counters offline brute-force attacks through **memory-hardness** and **time-hardness**:

1. **Memory-Hardness ($m = 64\text{ MiB}$):**
   - Each Argon2id hash evaluation actively requires allocating and accessing a 64 MiB memory buffer.
   - For an attacker, hardware memory is a finite physical resource. While SHA-256 has a negligible memory footprint (allowing tens of thousands of instances to execute concurrently across lightweight arithmetic cores on a single GPU), requiring 64 MiB per candidate password severely constrains how many instances can reside in physical RAM or video memory simultaneously.
   - This architectural requirement substantially increases the hardware and monetary expense of building high-density cracking rigs compared to algorithms with zero memory overhead.
2. **Time-Hardness ($t = 3\text{ iterations}$):**
   - Requires three full sequential passes across the 64 MiB memory block. The attacker cannot take mathematical shortcuts or skip memory reads without corrupting the resulting digest.

---

## 5. Realistic Trade-Offs and Engineering Nuance

To maintain technical integrity during assessment and viva defense, we avoid three common misconceptions:

1. **We do NOT claim "zero application cost":**
   Allocating 64 MiB of memory and ~30–70 ms of elapsed wall-clock time per password evaluation is a measurable server expense. If 1,000 login requests arrive simultaneously, allocating $1{,}000 \times 64\text{ MiB} = 64\text{ GiB}$ of RAM would exhaust server memory. This is why **strict backend rate limiting, connection timeouts, and authentication concurrency controls (Step 8)** are mandatory alongside slow hashing.
2. **We do NOT claim "guaranteed security":**
   Slow hashing cannot protect a user who chooses `123456` or `password`. If an attacker tests a candidate list of the top 100 most common passwords, even an adaptive hash taking 50 ms will reveal the match in $100 \times 50\text{ ms} = 5\text{ seconds}$. True defense requires combining slow hashing with breached password checks (Step 9) and password length rules.
3. **We do NOT claim a laptop measures an attacker's GPU cluster:**
   Our benchmark measures sequential execution on a host CPU with Argon2id parallelism set to 4. An attacker's actual throughput depends on their specific hardware architecture (such as GPU clusters, FPGAs, or custom ASICs) and optimized cracking implementations. However, Argon2id's memory and computational requirements significantly increase guessing costs on any hardware platform compared to algorithms like SHA-256 that use memory for internal state and buffers but are not designed to be memory-hard.

---

## 6. The Core Inversion

$$\text{Application Work Factor} \ll \text{Attacker Work Factor}$$

- **For the Nit's Cut server:** A legitimate customer logs in once. Spending ~23 ms of measured standalone elapsed wall-clock time per hash evaluation on an idle host is modest compared to typical mobile network round-trips (100–300 ms). However, this standalone benchmark figure is not proof of acceptable application performance under heavy multi-user load, where concurrent 64 MiB allocations and CPU competition could degrade responsiveness if left ungated—reinforcing why strict backend rate limiting and connection concurrency controls (Step 8) are essential.
- **For the attacker:** An adversary who steals the database must evaluate millions or billions of candidate guesses offline. Because every guess requires substantial memory and multiple sequential compute passes, the cumulative hardware, energy, and financial costs scale with the size of the keyspace, making broad dictionary sweeps far more expensive than against SHA-256.

---

## 7. Benchmark Results and Step-by-Step Arithmetic

The measurements below reflect the genuine output recorded by the learner running [`scripts/step4-timing-benchmark.mjs`](../scripts/step4-timing-benchmark.mjs) on their host machine, saved in [`evidence/08-timing-argon-vs-sha.txt`](../evidence/08-timing-argon-vs-sha.txt).

### Hardware & Environment Context
- **Host machine:** `Hennits-Mac.local` (Darwin arm64 / macOS 27.2.0)
- **CPU:** Apple M3 Pro (12 logical cores, 2400 MHz)
- **Total system RAM:** 18.00 GB
- **Node.js runtime:** `v24.16.0`
- **Library:** `argon2 v0.45.2` (installed)
- **Execution model:** Sequential hash calls (Argon2id configured with parallelism $p=4$ lanes)
- **Timer:** `performance.now()` measuring elapsed wall-clock duration

### Measured Data
- **Argon2id:**
  - Iteration count: $10$ sequential hashes (after $2$ unmetered warm-ups)
  - Total measured elapsed wall-clock duration: $233.196\text{ ms}$
- **SHA-256:**
  - Iteration count: $250{,}000$ sequential hashes (after $1{,}000$ unmetered warm-ups)
  - Total measured elapsed wall-clock duration: $105.544\text{ ms}$

### Step-by-Step Arithmetic

#### 1. Milliseconds per hash (total duration / iteration count)
- **Argon2id:**
  $$\text{Time per hash} = \frac{233.196\text{ ms}}{10} = 23.3196\text{ ms/hash}$$
  *(displayed in summary as $23.320\text{ ms/hash}$ rounded to 3 decimal places)*
- **SHA-256:**
  $$\text{Time per hash} = \frac{105.544\text{ ms}}{250{,}000} = 0.000422176\text{ ms/hash} \quad (0.422176\ \mu\text{s/hash})$$
  *(displayed in summary as $0.000422\text{ ms/hash}$ or $0.422\ \mu\text{s/hash}$ rounded to 6 / 3 decimal places)*

#### 2. Local sequential throughput (1000 ms / time per hash)
- **Argon2id:**
  $$\text{Throughput} = \frac{1000\text{ ms}}{23.3196\text{ ms/hash}} \approx 42.88238\text{ hashes/sec} \approx 42.88\text{ hashes/sec}$$
- **SHA-256:**
  $$\text{Throughput} = \frac{1000\text{ ms}}{0.000422176\text{ ms/hash}} \approx 2{,}368{,}680.36\text{ hashes/sec} \approx 2{,}368{,}683\text{ hashes/sec}$$
  *(the integer difference stems from intermediate quotient rounding: $\frac{1000}{0.0004222} \approx 2{,}368{,}683$)*

#### 3. Relative slowdown ratio (Argon2id time per hash / SHA-256 time per hash)
$$\text{Relative slowdown} = \frac{23.3196\text{ ms}}{0.000422176\text{ ms}} \approx 55{,}236.68 \approx 55{,}237\times\text{ slower}$$

In this local test on Apple M3 Pro hardware, each Argon2id hash required approximately **$55{,}237$ times longer** elapsed wall-clock duration than a SHA-256 hash.

#### Rounding Explanation
In the benchmark summary output, individual numbers are formatted with standard fixed decimal precision for human readability (for example, Argon2id average duration is rounded to 3 decimal places at $23.320\text{ ms/hash}$, and SHA-256 is rounded to 6 decimal places at $0.000422\text{ ms/hash}$). When calculating the relative slowdown factor, using the exact unrounded quotient ($\frac{23.3196}{0.000422176} = 55{,}236.68$) yields $55{,}237\times$, preserving mathematical consistency with the script output. The original evidence files [`evidence/07-hash-twice-different.txt`](../evidence/07-hash-twice-different.txt) and [`evidence/08-timing-argon-vs-sha.txt`](../evidence/08-timing-argon-vs-sha.txt) remain preserved exactly as generated.
