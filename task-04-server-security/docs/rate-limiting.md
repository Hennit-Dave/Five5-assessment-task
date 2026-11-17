# Rate Limiting, Counter Architecture, and Its Limits (Task 4 Step 8)

This document analyzes the engineering design, threshold justifications, counter storage models, network topology realities, customer-facing error ergonomics, and inherent bypass vectors of HTTP rate limiting for Nit's Cut, supported by empirical evidence recorded in [`evidence/13-rate-limit-triggered.png`](../evidence/13-rate-limit-triggered.png) and [`evidence/14-rate-limit-defeated.txt`](../evidence/14-rate-limit-defeated.txt).

---

## 1. Requirements & Core Purpose

Rate limiting is an operational defensive control positioned at the network boundary of sensitive endpoints. 

> [!IMPORTANT]
> **Core Principle:** Rate limiting does **not** stop brute-force or credential-stuffing attacks; it **limits guessing velocity**. By placing an upper bound on the number of attempts an identity or IP address can submit per unit of time, rate limiting transforms high-speed automated attacks into slow, economically inefficient processes while protecting backend cryptographic services (Argon2id) and database connections from resource exhaustion.

### Configured Initial Assessment Thresholds

Implemented in [`app/src/rateLimit.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/rateLimit.js) using `express-rate-limit@8.7.3`:

| Endpoint | Threshold & Window | Request Types Counted | Rationale & Trade-offs |
|---|---|---|---|
| **POST `/auth/login`** | **5 attempts per 15 minutes** | All POST requests (successes, wrong passwords, validation failures) | Defends against password guessing. A legitimate human client rarely mistypes credentials 5 times in 15 minutes. |
| **POST `/auth/signup`** | **5 attempts per 1 hour** | All POST requests (successes, duplicate emails, validation failures) | Limits automated account spamming and dampens CPU saturation from Argon2id password hashing (~23 ms per attempt). |
| **POST `/auth/reset`** | **3 attempts per 1 hour** | All POST requests (valid emails and invalid submissions) | Prevents third-party inbox flooding and mail-server spam-reputation degradation. |

**Counting All Requests:**  
Every incoming POST request is counted against the client's quota, including validation failures. Counting invalid requests ensures that an attacker sending garbage payloads or malformed data to probe boundaries consumes their budget immediately, preventing attackers from bypassing limits by intentionally triggering pre-validation errors.

---

## 2. Why IP Alone is Insufficient

Relying exclusively on the client's IP address (`req.ip`) for rate limiting is an incomplete defense:

1. **IP Address Rotation & Residential Proxy Networks:**  
   Modern attackers rarely attack from a single fixed IP address. Using botnets, commercial proxy networks (Tor, BrightData, Oxylabs), cloud server rotations, or dynamic cellular connections, attackers cycle through thousands of clean residential IP addresses. An attacker with a pool of 5,000 proxies can submit 25,000 login guesses per 15 minutes while never triggering a 5-request limit on any individual IP.
2. **Mobile Network IPv6 Prefix Churn:**  
   On mobile carriers, devices are assigned dynamic `/64` IPv6 prefixes. An attacker cycling airplane mode or rotating interface addresses can obtain a new IPv6 address for every request unless the server groups IPv6 requests by subnet (e.g. `/56`).
3. **Public Cloud & VPN Evasion:**  
   Ephemeral cloud compute instances (AWS EC2, GCP, DigitalOcean) and consumer VPNs allow automated scripts to obtain new egress IPs on demand for fractions of a cent.

---

## 3. The Shared Network Problem: NAT, Campuses, and Corporate Offices

The inverse of IP rotation is IP aggregation: **many legitimate humans frequently share a single public IP address**.

- **Carrier-Grade NAT (CGNAT) & Mobile Networks:** Mobile operators route thousands of mobile subscribers through a small pool of shared public gateway IPs.
- **Corporate Offices & Co-working Spaces:** A company of 500 employees behind a corporate NAT router appears to Nit's Cut as a single source IP address.
- **University Campuses & Dormitories:** Thousands of students on a campus Wi-Fi network egress through common university proxy gateways.

### Concrete Impact on Nit's Cut
With the login limit set to **5 attempts per 15 minutes per IP**:
If two coworkers in the same office accidentally mistype their passwords twice while logging into Nit's Cut, they consume 4 of the 5 allowed attempts. A third employee attempting to log in who mistypes once triggers the 5th hit. Immediately, **all 500 employees in that office are locked out** of logging in for the remaining 15 minutes (`HTTP 429 Too Many Requests`).

This demonstrates why aggressive IP-only thresholds introduce severe collateral disruption on shared networks.

---

## 4. Multi-Layered Controls & Their Engineering Trade-Offs

Because IP limiting alone is porous to distributed attacks and disruptive to shared networks, mature production architectures deploy layered controls:

```
                        Incoming Request
                               │
                               ▼
                    [Layer 1: IP Rate Limit]
                     (Coarse volumetric defense)
                               │
                               ▼
               [Layer 2: Per-Account Rate Limit]
                (Targeted account protection)
                               │
                               ▼
           [Layer 3: Behavioral / CAPTCHA Challenge]
            (Distinguishes bots from humans)
```

| Defense Layer | Mechanism | Security Benefit | Usability & Privacy Trade-offs |
|---|---|---|---|
| **Per-Account / Per-Email Limiting** | Tracks failed login attempts keyed by normalized email address (e.g. 5 failed logins per email per 15 min). | Protects a specific account against distributed credential-stuffing attacks coming from 5,000 distinct IP addresses. | **Vulnerability: Denial of Service (Account Lockout Attack).** An attacker can deliberately submit 5 wrong passwords for `ceo@example.com` every 15 minutes to permanently lock the genuine account owner out of the platform. |
| **Progressive Delays (Tarpitting)** | Artificially introduces increasing sleep delays on failed attempts (e.g. 1s, 2s, 4s, 8s). | Drastically reduces brute-force velocity without hard 429 lockouts. | **Vulnerability: Slowloris & Thread Starvation.** Holding client connections open consumes Node.js sockets and server memory, making the server vulnerable to connection-exhaustion DoS attacks. |
| **Device / Client Fingerprinting** | Uses browser attributes (Canvas, WebGL, audio context, headers) to assign an identifier. | Tracks abusive clients even across IP rotations. | **Privacy & Reliability Trade-offs:** Intrusive tracking raises GDPR/ePrivacy compliance concerns. Attackers running automated headless browsers easily forge or randomize canvas/hardware fingerprints. |
| **Proof-of-Work / CAPTCHA (Turnstile / Altcha)** | Prompts client for interactive or cryptographic proof of work before processing authentication. | Reliably filters out automated scripts without permanently locking out shared-IP networks. | **Accessibility & Friction:** Causes significant friction for sighted and assistive-technology users (screen readers, cognitive impairments); third-party CAPTCHAs leak user browsing data. |

---

## 5. Counter Storage Architecture & Engineering Trade-Offs

Rate limit counters must store hit counts and reset timestamps. The choice of storage medium dictates scalability, resilience, and operational complexity:

### A. In-Memory Store (`MemoryStore` — Implemented in Prototype)
- **Mechanism:** Stores counters in an in-memory JavaScript Map within the Node.js process heap.
- **Benefits:** Microsecond-level performance; zero external dependencies; zero database overhead.
- **Limitation 1 (Process Restarts):** Counters are strictly ephemeral. If the Node.js application crashes or restarts (e.g. during a code deployment), all active counters and lockout states reset to zero. An attacker who is rate-limited can trigger or wait for a deployment to immediately regain their full request quota.
- **Limitation 2 (Horizontal Scaling):** In production architectures with multiple server instances or container replicas (e.g. Kubernetes, AWS ECS) behind a load balancer, each Node.js process maintains its own independent memory store. A round-robin load balancer distributing traffic across $N$ instances effectively multiplies the attacker's allowed attempts by $N$ (e.g. 5 instances $\rightarrow$ 25 attempts before being blocked).

### B. Centralized In-Memory Datastore (Redis / KeyDB / Memcached)
- **Mechanism:** All application instances share a fast external Redis cluster using atomic commands (`INCR`, `EXPIRE`).
- **Benefits:** Consistent rate limiting across horizontal cluster nodes; counters survive application restarts.
- **Trade-offs:** Adds an external infrastructure dependency; introduces network round-trip latency on the hot request path. If Redis experiences an outage, the application must choose between **failing open** (disabling rate limits and exposing auth to brute-force) or **failing closed** (blocking all authentication and causing a complete service outage).

### C. Relational Application Database (SQLite / Postgres)
- **Why Storing Rate Limits in SQLite is an Anti-Pattern:** Rate limiting exists to protect backend storage and CPU from overload. Writing and querying rate-limit counter rows in SQLite on every unauthenticated request creates disk I/O, database write locks, and WAL contention directly on the attack path, making it trivially easy for an attacker to DoS the database itself.

---

## 6. Middleware Placement & Client IP Resolution

### Middleware Order in `app/src/server.js`
Rate limiters execute immediately after body parsers and strictly **before** boundary schemas, password hashing, and database transactions:

```
Incoming Request
       │
       ▼
1. Body Parsers (`express.urlencoded`, `express.json`)
       │
       ▼
2. Rate Limiting Middleware (`express-rate-limit`)  <--- [STEP 8 ENFORCEMENT]
       │  - Checks client IP counter.
       │  - If exceeded: emits HTTP 429 + Retry-After + renders auth.ejs error.
       │  - Halts execution (NEVER invokes Zod, Argon2id, or SQLite).
       │
       ▼
3. Request Boundary Schemas (Zod: `SignupSchema`, `LoginSchema`, `ResetSchema`)
       │
       ▼
4. Cryptographic Hashing (Argon2id: ~23 ms)
       │
       ▼
5. Database Transactions (SQLite Prepared Statements)
```

### Why `trust proxy` is Deliberately Disabled
In [`app/src/server.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/server.js), Express `trust proxy` is intentionally **not enabled** (`false` by default).

- **How IP is Resolved:** With `trust proxy` disabled, `req.ip` is derived strictly from the underlying TCP socket remote address (`req.socket.remoteAddress`).
- **Defending Against Header Forgery:** If `trust proxy` were naively enabled without an explicit upstream proxy whitelist, an attacker could attach arbitrary headers such as `X-Forwarded-For: 203.0.113.1` to spoof their IP address on every request, completely bypassing rate limits.
- **Empirically Proven in Evidence 14:** When a request was sent with a forged `X-Forwarded-For: 203.0.113.77`, the server ignored the header, matched the socket remote address (`127.0.0.1`), and returned `HTTP 429 Too Many Requests`.

### IPv6 Subnet Handling
`express-rate-limit@8.7.3` automatically masks IPv6 addresses using the default `ipv6Subnet: 56` setting. Rather than treating individual 128-bit IPv6 addresses as distinct keys, it collapses requests within the same `/56` block into a single bucket, preventing mobile-device prefix hopping.

---

## 7. Customer-Facing HTTP 429 Response & Accessibility

When a user or attacker exceeds their quota, the server returns **`HTTP 429 Too Many Requests`**:

### Visual & Semantic Design ([`evidence/13-rate-limit-triggered.png`](../evidence/13-rate-limit-triggered.png))
- **Design Tokens:** Renders inside the `.card` using the tokenized `.form-error-banner` (`--nc-color-error-container`, `--nc-border-width`, `--nc-radius-button`, `--nc-color-error`).
- **Accessibility & Focus:** Marked with `role="alert"` and auto-focused via JavaScript (`id="server-error-banner"`) so screen readers immediately announce the rate-limit lockout.
- **Customer-Friendly Guidance:** Displays clear, estimated wait times:
  ```
  "Too many attempts. Please wait about 15 minutes and try again."
  ```
  The message avoids leaking technical jargon, internal IP addresses, rate-limiting algorithms, or assessment step numbers.
- **Safe Field Preservation:** Preserves non-sensitive inputs (`name`, `email`) in HTML `value` attributes so the user does not lose typed data.
- **Strict Credential Safety:** Password input values are **never echoed** (`value=""`).

### Standard Headers & JSON API Responses
- **`Retry-After`:** Injected automatically in response headers (e.g. `Retry-After: 900` seconds).
- **IETF Standard Headers:** Emits draft-7 standard headers (`RateLimit: limit=5, remaining=0, reset=900` and `RateLimit-Policy: 5;w=900`).
- **JSON API Support:** When requested with `Accept: application/json`, returns structured payload:
  ```json
  {
    "success": false,
    "error": "Too many attempts. Please wait about 15 minutes and try again.",
    "retryAfterSeconds": 900
  }
  ```

---

## 8. Empirical Evidence Analysis & Scope Limitations

### Summary of Observed Test Results ([`evidence/14-rate-limit-defeated.txt`](../evidence/14-rate-limit-defeated.txt))
Tested using automated runner [`task-04-server-security/scripts/test-step8-rate-limits.mjs`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/scripts/test-step8-rate-limits.mjs) on port 3110 against isolated test database [`app/data/step5_test.db`](file:///Users/blk/Developer/Five5%20assessment%20task/app/data/step5_test.db):

1. **Triggering Signup Limit:** Requests 1–5 (validation failures) returned `HTTP 400`. Request 6 returned `HTTP 429` (`Retry-After: 3600`).
2. **Triggering Login Limit:** Requests 1–5 (wrong passwords) returned `HTTP 401`. Request 6 returned `HTTP 429` (`Retry-After: 900`).
3. **Triggering Reset Limit:** Requests 1–3 (valid requests) returned `HTTP 200`. Request 4 returned `HTTP 429` (`Retry-After: 3600`).
4. **Local Source-Address Bypass Demonstration (Continuous Server Process):**
   - Address A (`127.0.0.1` loopback) was exhausted on login $\rightarrow$ subsequent request returned `HTTP 429` (`limiterKey=127.0.0.1`).
   - The exact same login request was immediately sent to the server via the machine's local LAN address (`192.168.1.53`).
   - The server observed a distinct TCP socket peer (`::ffff:192.168.1.53`) and distinct limiter key (`192.168.1.53`).
   - The request was **not rate limited** and successfully reached the auth handler (returning `HTTP 401` wrong password with `used=1/5`).
   - Sending another request from Address A (`127.0.0.1`) immediately afterward confirmed that Address A **remained blocked** (`HTTP 429`).
   - Attaching `X-Forwarded-For: 203.0.113.77` from Address A was ignored by the server and remained blocked (`HTTP 429`).

### Scope Limitation Note
The demonstration in Evidence 14 is a **local multi-homed source-address demonstration** between `127.0.0.1` and `192.168.1.53` on a single development machine. It proves the architectural mechanism—that `express-rate-limit` partitions quotas strictly by socket peer IP when `trust proxy` is disabled—but does not represent a change in public WAN IP networks or prove immunity against botnet attacks.
