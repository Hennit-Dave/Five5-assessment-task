# Task 4 Interview Answers — The Server is the Source of Truth

These answers are grounded in Nit's Cut's actual implementation, measured benchmarks on this machine, and documented limitations.

---

## Hashing (Questions 1–5)

### 1. Why should you hash passwords?
If an attacker obtains a copy of the `users` table (via SQL injection, a leaked backup, or a compromised server), plaintext passwords would let them log straight into your users' accounts—and into any other websites where those users reused the same password. Hashing replaces the password with a one-way cryptographic digest (`password_hash`) so the original password cannot simply be read directly from the database.

### 2. Why use bcrypt (or Argon2id) instead of SHA-256 for passwords?
SHA-256 is designed to be fast for verifying files and signatures: on this Apple M3 Pro machine, Node's SHA-256 computed **2,368,683 hashes per second** (`0.000422 ms` per hash) sequentially (`evidence/08-timing-argon-vs-sha.txt`). On dedicated GPUs or ASICs, an attacker can evaluate SHA-256 orders of magnitude faster. Adaptive password hashers like **bcrypt** and **Argon2id** (which we use) are deliberately expensive—forcing each guess to spend meaningful computation time and, in Argon2id's case, substantial RAM (`64 MiB` per hash in our configuration).

### 3. What is a salt and why do you need it?
A salt is a unique, random value generated for each password before hashing (Argon2id generates a fresh 16-byte random salt per call, verified in `evidence/07-hash-twice-different.txt`). Without a salt, two users with the same password produce the exact same hash, exposing duplicate passwords at a glance and allowing attackers to use precomputed lookup/rainbow tables against many hashes at once. With a unique random salt per user, identical passwords produce different hashes and must be attacked individually.

### 4. What salt rounds, or what work factor, should you use? Give a number and defend it.
For **Argon2id**, we use **RFC 9106’s second recommended profile**: **`m = 65536 KiB` (64 MiB memory), `t = 3` iterations, `p = 4` parallelism**. In our local sequential benchmark on this Apple M3 Pro host, this took **`23.32 ms` elapsed wall-clock time** per hash (`42.88 hashes/sec` sequentially). That local latency is low enough for interactive signup and login while making sequential hashing **~55,237× slower** than SHA-256 on the same host and requiring `64 MiB` of RAM per hash. *(If using bcrypt instead, a typical cost factor such as 10–12 is tuned by benchmarking on the target server hardware so login stays responsive while offline guessing remains expensive.)*

### 5. Storing passwords: plain text, SHA-256, AES-256 encryption, and adaptive hashing — which is correct and why are the other three wrong?
- **Correct:** **Adaptive hashing** (Argon2id, bcrypt, or scrypt) — one-way, salted, and deliberately expensive in time and/or memory.
- **Wrong (Reason 1 — Reversible):** **Plain text** exposes passwords immediately; **AES-256 encryption** is wrong for a *different* reason from SHA-256: encryption is **two-way**. Anyone who obtains the decryption key alongside the database (or compromises the application server) can decrypt stored passwords back into plaintext. Passwords only need to be verified, not recovered.
- **Wrong (Reason 2 — Too Fast):** **SHA-256** is one-way, but it is far too fast and uses negligible memory, making offline dictionary and brute-force guessing much cheaper for an attacker.

---

## Validation (Questions 6–11)

### 6. Why is client-side validation not enough?
Client-side JavaScript only runs inside the user's browser, which the user—or an attacker—controls. An attacker can bypass the browser UI altogether and send raw HTTP `POST` requests directly. We demonstrated this in `evidence/12-direct-request-before-and-after.txt`: the historical Task 3 request sent via **`curl`** on port `3000` (`POST /auth/signup`, `name=A&email=not-an-email&password=short`) bypassed all client rules and succeeded with `HTTP 200 OK`. In Task 4, our replay using **Node `fetch`** on port `3108` with the **same method, path, content type, and payload** was rejected at the server's Zod boundary with `HTTP 400 Bad Request` and created zero database rows.

### 7. What security checks belong in the frontend, and what must the server enforce regardless?
- **Frontend:** Immediate usability feedback—inline error messages, password visibility toggles, double-submit button guards, and accessible focus recovery. None of these are security boundaries.
- **Server (must enforce regardless):** All input type, shape, length, and format validation (Zod schemas), normalization (`normalizeEmail`, `normalizePassword`), breached-password checks, rate limiting, server-side role assignment (always assigning `'client'` and stripping client-supplied `role` fields), and authorization checks.

### 8. The user interface hides the delete button for non-administrators. Is that enough? If not, what does an attacker do instead?
No. Hiding a button only removes it from the rendered HTML; it does not protect the backend endpoint. An attacker can inspect client scripts, watch network requests, or guess standard routes (such as `DELETE /orders/123`) and send the HTTP request directly via `curl` or a script. The server must check the caller's authenticated identity and permissions on every protected route before performing the action. *(Note: in our current prototype, persistent login sessions and admin routes are not implemented yet.)*

### 9. What is the difference between normalization, validation, sanitization, and output encoding?
- **Normalization:** Converting input into a consistent canonical form before validating or storing it. In our app, `normalizeEmail` trims surrounding whitespace and lowercases emails, and `normalizePassword` trims leading and trailing whitespace (our chosen Step 5 policy) while preserving internal spaces and capitalization.
- **Validation:** Checking that the normalized input matches strict expected types, formats, and business rules (e.g. Zod checking `email` format, 15-code-point password minimum, and 6-digit verification codes) and rejecting non-conforming input at the boundary.
- **Sanitization:** Stripping, filtering, or modifying unsafe or unwanted characters from input (for example, stripping disallowed HTML tags if rich text were accepted). Because we trim surrounding whitespace on email and password inputs, our app does normalize inputs before validation rather than leaving them completely untouched.
- **Output encoding:** Escaping characters for a specific output context so data is rendered as text rather than executed as code (e.g. EJS `<%= ... %>` HTML-escaping `<` to `&lt;` to mitigate XSS).

### 10. Why replace the incoming request body with the parsed and validated data rather than leaving both available?
If downstream handlers read `req.body` directly, they can accidentally trust unvalidated fields, wrong types (arrays or objects instead of strings), un-normalized values, or attacker-injected properties such as `role: "admin"` or `is_admin: true`. Consuming only `parseResult.data` ensures downstream handlers receive only the exact typed, normalized fields defined by the schema, with extra properties stripped.

### 11. Why validate route parameters and query strings, not just the body?
Attackers can modify URLs just as easily as `POST` bodies. Unvalidated route parameters (such as `/orders/:id`) or query strings (such as `/auth?mode=...` or `/orders/lookup?version=...`) can cause type errors, unexpected database queries, open redirects, or XSS if echoed back without validation and encoding.

---

## Rate Limiting (Questions 12–16)

### 12. How do you rate limit unauthenticated requests, and what is the problem with the header you would reach for first?
You rate limit unauthenticated requests by keying on the client's network IP address (`req.ip`)—as we do in `app/src/rateLimit.js` (5/15m on login, 5/1h on signup, 3/1h on reset). The header people often reach for first is **`X-Forwarded-For`**, because it is meant to carry the original client IP behind proxies. The problem is that **any client can forge `X-Forwarded-For`** (`X-Forwarded-For: 203.0.113.77`) in their request headers. If the server trusts it unconditionally (`trust proxy: true`), an attacker can bypass IP rate limiting on every request simply by changing that header. That is why we kept `trust proxy` disabled locally (`evidence/14-rate-limit-defeated.txt`).

### 13. Which rate limiting algorithm would you choose for a production API, and what is the boundary burst problem?
A **sliding window** (sliding window log or sliding window counter) or **token bucket** algorithm is generally preferred for production APIs. The **boundary burst problem** happens with a **fixed window** counter: if a limit is 5 requests per minute, an attacker can send 5 requests at `12:00:59` and 5 more requests at `12:01:01`—achieving **10 requests in 2 seconds** across the minute boundary while staying within each fixed window.

### 14. Why use a shared store for your counters rather than in-memory counters on each server?
In-memory counters (which our single-process prototype uses) live only inside one Node.js process:
1. If you run multiple app instances behind a load balancer, each instance tracks its own separate counter, multiplying an attacker's allowance by the number of instances.
2. Whenever the server restarts or deploys, all in-memory counters reset to zero.
A shared external store such as Redis keeps counters consistent across all instances and preserves them across app restarts.

### 15. What HTTP status code should a rate limiter return, and why is `403` the wrong choice?
A rate limiter should return **`429 Too Many Requests`** (together with `Retry-After` and `RateLimit` headers). **`403 Forbidden`** means the server understood the request and **refuses** to authorize it (not necessarily permanently—for example, permissions could change or a policy may block access), without indicating a quota or cooldown. **`429`** specifically communicates **rate limiting**: it tells both users and automated clients that a request-rate limit has been exceeded and pairs with `Retry-After` to show when they can try again.

### 16. What do you do when your rate limit store is unavailable: fail open or fail closed? Answer for your own application specifically.
- **Current In-Memory Behaviour:** In our current prototype, rate-limit counters live in `express-rate-limit`'s default in-memory `MemoryStore` inside the single Node.js process, so there is no separate external rate-limit store that can go down independently of the app server itself.
- **Chosen Future External-Store Outage Policy (Not Yet Implemented):** If Nit's Cut moves to an external Redis rate-limit store in production and that store becomes unavailable, our chosen deployment policy is to **fail closed** on authentication endpoints (`signup`, `login`, and `password reset`), temporarily returning **`HTTP 503`** while **public pages remain available**. We accept that temporary interruption to avoid allowing unthrottled authentication requests—consistent with our fail-closed `HTTP 503` policy on the Step 9 HIBP breached-password check. *(This is a planned future deployment policy for when an external store is added, not behaviour already implemented in our current in-memory limiter.)*

---

## Assessment-Specific Questions (Questions 17–19)

### 17. You have two timing numbers for hashing, from your own machine. Walk me through what they mean for an attacker who has stolen your user table.
In our local sequential benchmark on this Apple M3 Pro host (`evidence/08-timing-argon-vs-sha.txt`):
- **SHA-256:** `105.544 ms` for 250,000 sequential hashes = **`0.000422 ms/hash`** (`2,368,683 hashes/sec`).
- **Argon2id (RFC 9106 second recommended profile: `m = 64 MiB, t = 3, p = 4`):** `233.196 ms` for 10 sequential hashes = **`23.32 ms/hash`** (`42.88 hashes/sec`).
- **Local Ratio:** Argon2id was **~55,237× slower** than SHA-256 in sequential execution on this machine.

What this means if an attacker steals our `users` table:
- Those numbers are **strictly local to this benchmark**—an attacker running dedicated GPUs, ASICs, or multi-server cracking rigs will evaluate guesses much faster than a single sequential laptop benchmark, so attackers will not take the same `23.32 ms` per guess.
- However, the **relative work-factor difference** still holds: against SHA-256, cracking hardware can test guesses at massive speed with almost no RAM per guess; against Argon2id, every guess must pay both a higher time cost and `64 MiB` of memory bandwidth, sharply reducing the number of guesses an attacker's hardware budget can afford. That is why Argon2id must still be paired with strong passwords (our 15-character minimum and HIBP breach check).

### 18. How does a breached password check avoid sending the password anywhere? Explain the mechanism in your own words, then say what the naive version would leak.
Our registration check (`app/src/breachCheck.js`) uses **k-anonymity hash-prefix lookup**:
1. The server hashes the trimmed password locally with SHA-1 (e.g. `"password12345678"` $\rightarrow$ `2317AA72DAFA0A07F05AF47BAA2E388F95DCF6F3`).
2. It splits the 40-character hash into a **5-character prefix** (`2317A`) and a **35-character suffix**.
3. It sends **only the 5-character prefix** over HTTPS to Have I Been Pwned (`GET /range/2317A` with `Add-Padding: true`).
4. The service returns all breached 35-character suffixes starting with `2317A` (plus dummy `count: 0` padding entries).
5. Our server searches that returned list **locally in memory** for the 35-character suffix (ignoring `count: 0` entries).

**What the naive version would leak:**
- Even over HTTPS (which encrypts traffic in transit between the client and TLS termination), sending the **plaintext password** would expose every registering customer's secret to the **receiving third-party service** and any internal systems, reverse proxies, or request logs that have access to decrypted requests after TLS termination.
- Sending the **full SHA-1 hash** would expose the complete hash to the receiving service and any post-TLS logging systems, allowing common or dictionary passwords to be reversed via precomputed SHA-1 lookup tables.
*(Limitation: sending 5 hex characters still discloses 20 hash bits and outbound request timing metadata, so k-anonymity reduces disclosure rather than guaranteeing complete anonymity.)*

### 19. Wrong-answer analysis
> *"I hash passwords with SHA-256 plus a random salt per user, which means even if the database is stolen the passwords cannot be reversed, because hashing is one-way. I also rate limit login attempts by IP, so brute force is not possible."*

**Errors in order of severity:**
1. **Using SHA-256 for passwords (Most Severe):** While SHA-256 is one-way and a random salt stops rainbow tables and identical-hash detection, "one-way" does not prevent **offline guessing**. SHA-256 is very fast and uses negligible memory. Once the database is stolen, an attacker can run offline dictionary and brute-force attacks against each user's salt + hash at high speed without ever touching the login endpoint. Passwords need a **memory-hard** adaptive hash like **Argon2id** or a **deliberately computationally expensive** adaptive hash like **bcrypt**—though **neither guarantees weak passwords cannot be guessed**, which is why length minimums and breached-password checks are also needed.
2. **Claiming IP rate limiting makes brute force "not possible" (Severe Threat-Model Misunderstanding):**
   - First, IP rate limiting only throttles **online** login requests—it does nothing to stop **offline** cracking once the database is stolen.
   - Second, even online, IP-only rate limiting can be bypassed if an attacker changes source IP addresses (which we demonstrated locally in `evidence/14-rate-limit-defeated.txt`), uses distributed proxies/botnets, or exploits a misconfigured `trust proxy` setting via forged `X-Forwarded-For` headers. It slows guessing from a single IP; it does not make brute force impossible.
3. **Confusing mathematical one-wayness with safety for human passwords:** Human-chosen passwords have much lower entropy than cryptographic keys, so fast one-way functions do not protect them against guessing.
