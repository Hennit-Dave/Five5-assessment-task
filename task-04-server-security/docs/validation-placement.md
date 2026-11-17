# Request Boundary Validation & Placement (Task 4 Step 6)

This document analyzes the architectural placement, request lifecycle ordering, library selection, empirical performance measurements, and security boundaries of schema validation at the HTTP boundary for Nit's Cut, supported by measured timing data recorded in [`evidence/11-validation-timing.txt`](../evidence/11-validation-timing.txt).

---

## 1. Library Selection & Scope

For backend schema validation, we selected **Zod** (`zod@4.6.7`).

### Why Zod was Chosen
1. **Coupled Parsing and Canonical Normalization:**  
   Zod follows the *"Parse, don't validate"* approach. Beyond boolean validation, Zod seamlessly transforms untrusted raw inputs into canonical forms (e.g. `normalizeEmail` trimming and lowercasing, `normalizePassword` trimming outer whitespace while preserving internal passphrase spaces and casing) during the parsing phase.
2. **Zero External Dependencies:**  
   Zod is self-contained with no external runtime dependencies, keeping the application footprint small and avoiding third-party dependency vulnerabilities.
3. **Property Stripping against Accidental Mass Assignment:**  
   By default, Zod object schemas strip unrecognized properties (`.strip()`). Unsanctioned parameters (such as a client submitting `role: 'admin'`) are omitted from the parsed object. While downstream handlers must still avoid trusting raw `req.body`, schema stripping prevents undeclared fields from propagating into application services.
4. **Isolated Testability:**  
   Schemas are pure JavaScript definitions decoupled from Express `(req, res)` objects, allowing direct unit testing of boundary contracts (including omitted, null, array, and object edge cases) in microseconds.
5. **Configurable Error Feedback:**  
   Zod's error message overrides allow returning clear, human-understandable guidance (e.g. *"Please enter your name so we know who to address."*) rather than internal type descriptions (such as *"Invalid input: expected string, received array"*).

---

## 2. Request Lifecycle: Implemented Middleware vs. Proposed Infrastructure

It is vital to distinguish between what is **currently implemented** in the local Node/Express application versus what represents **proposed production infrastructure**.

### Implemented Pipeline in Local Prototype
The current application codebase ([`app/src/server.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/server.js)) implements the following linear request flow matching the code exactly:

```
Incoming HTTP Request (Plain HTTP over TCP loopback)
       │
       ▼
1. Node.js HTTP Server (`http.createServer` / Express app instance)
       │
       ▼
2. URL-encoded Body Parser (`express.urlencoded({ extended: true })`)
       │  - Reads incoming byte stream for `application/x-www-form-urlencoded`.
       │  - Enforces parser-level body size limits (default 100kb).
       │    If stream exceeds limit, parser returns HTTP 413 Payload Too Large before route logic.
       │  - Deserializes raw form fields into untrusted `req.body`.
       │
       ▼
3. JSON Body Parser (`express.json()`)
       │  - Reads incoming byte stream for `application/json`.
       │  - Enforces parser-level body size limits (default 100kb).
       │    If stream exceeds limit, parser returns HTTP 413 Payload Too Large before route logic.
       │  - Deserializes raw JSON bytes into untrusted `req.body`.
       │
       ▼
4. Static Asset Middleware (`express.static(path.join(__dirname, '../public'))`)
       │  - Intercepts requests for static assets (`/css/*`, `/js/*`, `/favicon.ico`, etc.).
       │  - Serves static files directly from disk without invoking application controllers.
       │
       ▼
5. Request Logger Middleware (`app.use((req, res, next) => { ... })`)
       │  - Records request start time (`const start = Date.now()`).
       │  - Attaches `res.on('finish')` listener to log timestamp, HTTP method, URL, status code,
       │    and total request duration upon response completion.
       │  - Calls `next()` to advance to route matching.
       │
       ▼
===================================================================================
6. REQUEST BOUNDARY VALIDATION (Zod Schemas: SignupSchema, LoginSchema, ResetSchema)
===================================================================================
       │
       ├─────────────────────────────────┐
  [Invalid Shape / Rules]           [Valid Shape]
       │                                 │
       ▼                                 ▼
   Return HTTP 400 Bad Request     7. Downstream Application Handlers
   (or HTTP 401 for bad login)        (Consume strictly parsed schema output:
   - Preserves safe fields (name,      `parseResult.data`)
     email) in form value attributes     │
   - Never echoes passwords              ├─────────────────────────────────────────┐
   - Completely skips hashing            │                                         │
   - Completely skips DB I/O             ▼                                         ▼
                                  [SIGNUP FLOW]                             [LOGIN FLOW]
                                  Sequence: Hash-before-Insert              Sequence: Lookup-before-Verify
                                  a. Run Argon2id password hash             a. Query database by email
                                     (`hashPassword()`, ~23 ms)                (`findUserByEmail()`, SQLite)
                                  b. Insert new user into database          b. If user found, run Argon2id
                                     (`createUser()`, SQLite INSERT)           hash verification (~23 ms)
                                         │                                         │
                                         └────────────────────┬────────────────────┘
                                                              ▼
                                                       8. Response Rendering
                                                          (EJS template render to HTML)
```

### Proposed Production Infrastructure (NOT in Current Prototype)
The current server is a development prototype and deliberately does **not** yet implement:
- **TLS Termination:** In production, HTTPS encryption and certificate management typically sit at a reverse proxy (e.g. Nginx, Cloudflare) or cloud load balancer before hitting Node.
- **Request IDs / Correlation Tracing:** No middleware currently generates or logs distributed tracing UUIDs.
- **CORS Middleware:** Cross-origin resource sharing headers are not configured.
- **Security Headers (e.g. Helmet):** Content Security Policy (CSP), Strict-Transport-Security (HSTS), and X-Frame-Options headers are not active.
- **Rate Limiting:** Request rate limiting is not yet active (scheduled for Step 8).

### Distinct Sequences: Signup vs. Login
A key architectural principle in boundary placement is understanding the operational divergence between registration and authentication:
- **Signup Sequence (Hash-before-Insert):**  
  After boundary validation succeeds, the server hashes the password with Argon2id *before* writing the new row to the database (`hashPassword` $\rightarrow$ `INSERT INTO users`). This guarantees plain text is never persisted or retained in memory longer than necessary.
- **Login Sequence (Lookup-before-Verify):**  
  After boundary validation succeeds, the server must look up the existing user account in the database *before* it can verify the password (`findUserByEmail` $\rightarrow$ `verifyPassword`). The stored Argon2id hash is retrieved from SQLite and used as the verification target for the candidate password.

---

## 3. Why Boundary Schemas Surpass Manual `if`-Checks

In Step 5, boundary validation was handled via sequential `if`-checks in route controllers. Replacing them with schemas in Step 6 introduces distinct engineering benefits:

1. **Exhaustive Structural Validation:**  
   Manual checks easily miss unexpected runtime types (e.g. `req.body.name` sent as an array `['Ade']` or object `{}`). Zod schemas validate the complete structural shape, rejecting non-string inputs with customer-friendly messages rather than throwing unhandled exceptions.
2. **Reduced Mass-Assignment Risk:**  
   Zod's `.strip()` behavior ensures undeclared payload properties (such as an injected `role: 'admin'`) are discarded. Downstream handlers receive only declared, validated keys. (Note: this is not absolute immunity; application code must still avoid referencing raw `req.body` directly).
3. **Coupled Transformation and Validation:**  
   Normalization rules (lowercasing emails, trimming outer whitespace) are applied declaratively during parsing. Downstream code is guaranteed to receive normalized data, eliminating bugs where un-normalized variables are accidentally passed to database helpers.
4. **Separation of Concerns & Testability:**  
   Validation rules live in a dedicated module ([`app/src/schemas.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/schemas.js)) that can be tested in sub-millisecond unit tests without running an Express server.

---

## 4. Empirical Timing Analysis: Baseline vs. Post-Zod Verification

To evaluate the operational impact of boundary schema validation, we conducted repeated timing measurements across 6 HTTP scenarios on the isolated test database ([`app/data/step5_test.db`](file:///Users/blk/Developer/Five5%20assessment%20task/app/data/step5_test.db)).

### Methodology & Provenance
- **Preserved Pre-Zod Baseline:** Captured against the pre-Zod implementation and preserved in [`evidence/baseline-timing.json`](../evidence/baseline-timing.json). Protected against accidental overwrite.
- **Post-Zod Verification:** Captured against the Zod schema implementation and saved to [`evidence/post-zod-verification.json`](../evidence/post-zod-verification.json).
- **Assertions:** Every request (including warm-ups) strictly asserted HTTP status codes (201, 400, 200, 401) and expected response body content.
- **Login Pre-check:** Pre-verified that `ade.kolawole@example.com` existed in `step5_test.db` and its Argon2id hash verified before timing login requests.
- **Timer Protocol:** High-resolution `performance.now()` measuring loopback HTTP duration across 3 unmetered warm-ups + 10 measured requests per scenario.
- **Validation-Only Timer:** Server recorded `performance.now()` strictly around `schema.safeParse()` and returned it in `X-Validation-Duration-Ms` headers.

### Results Summary (Verbatim from [`evidence/11-validation-timing.txt`](../evidence/11-validation-timing.txt))

#### Table 1: Total HTTP Request Latency
| Scenario | Baseline Mean (ms) | Post-Zod Mean (ms) | Delta (ms) | Latency Ratio |
|---|---|---|---|---|
| **Valid Signup** (Validation + Argon2id + DB Insert) | 25.963 ms | 25.783 ms | -0.180 ms | 0.99x |
| **Invalid Signup: Short Password** (Boundary Rejection) | 0.775 ms | 0.817 ms | +0.042 ms | 1.05x |
| **Invalid Signup: Missing Terms** (Boundary Rejection) | 0.731 ms | 0.829 ms | +0.098 ms | 1.13x |
| **Valid Login** (Validation + DB Select + Argon2id Verify) | 28.181 ms | 25.417 ms | -2.764 ms | 0.90x |
| **Invalid Login: Empty Password** (Boundary Rejection) | 0.861 ms | 0.819 ms | -0.042 ms | 0.95x |
| **Password Reset** (Validation + Generic Response) | 0.725 ms | 0.666 ms | -0.060 ms | 0.92x |

#### Table 2: Isolated Post-Zod Validation-Only Execution Duration (`schema.safeParse`)
| Scenario | Mean Validation Time | Median Validation Time | Min / Max Validation Time |
|---|---|---|---|
| **Valid Signup** | **0.0323 ms** (32.3 µs) | 0.0330 ms | 0.0246 / 0.0367 ms |
| **Invalid Signup: Short Password** | **0.0175 ms** (17.5 µs) | 0.0169 ms | 0.0116 / 0.0250 ms |
| **Invalid Signup: Missing Terms** | **0.0132 ms** (13.2 µs) | 0.0122 ms | 0.0096 / 0.0190 ms |
| **Valid Login** | **0.0219 ms** (21.9 µs) | 0.0200 ms | 0.0159 / 0.0362 ms |
| **Invalid Login: Empty Password** | **0.0104 ms** (10.4 µs) | 0.0094 ms | 0.0058 / 0.0171 ms |
| **Password Reset** | **0.0080 ms** (8.0 µs) | 0.0071 ms | 0.0053 / 0.0143 ms |

---

## 5. Observations & The Classroom "2 to 3 Second Delay" Discussion

### Understanding Total Request Latency Differences
Total request latency differences observed across runs (e.g. ±0.2 to 2.7 ms) reflect multiple operational and system variables rather than schema execution alone:
- **Argon2id Thread Execution:** Argon2id utilizes 4 parallel worker threads ($p=4$), whose scheduling varies slightly across OS execution slices.
- **Node.js Event Loop & Memory Management:** V8 garbage collection and JIT optimization cycles introduce small millisecond-level variances across runs.
- **SQLite File System I/O:** Transactional disk writes for `INSERT` statements interact with macOS APFS file caching and WAL checkpoints.
- **Isolated Validation Execution:** In contrast to total round-trip variance, the isolated server validation timer measured `schema.safeParse()` at **0.008 to 0.032 milliseconds** (8 to 32 microseconds). This confirms that in-memory schema parsing contributes negligible overhead to the request.

### The Classroom "2 to 3 Second Delay" Discussion
The assessment notes:
> *"In class, validation added a noticeable two to three second delay on signup. Find your number and submit it. If your number is high, say what you think is causing it rather than accepting it."*

In our implementation, synchronous schema validation executed in microseconds and did not produce multi-second delays. For synchronous checks over short strings, schema execution overhead is small. However, validation can become slow under specific conditions:
1. **Synchronous Network Calls:** If validation hooks perform external network requests (such as DNS MX lookups to verify email domains, or synchronous HTTP calls to a breached-password service), network latency and DNS timeouts routinely introduce 2,000–5,000 ms delays.
2. **Cryptographic Misconfiguration:** If hashing is mistakenly triggered *inside* validation hooks or configured with excessive work factors (e.g. Argon2id memory exceeding available RAM and triggering OS disk swap thrashing), multi-second stalls occur.
3. **Database Contention:** Asynchronous refinement hooks that query a database to check email existence can stall if database connections are unpooled, locked, or un-indexed.
4. **Catastrophic Regular Expression Backtracking (ReDoS):** Complex or nested regular expressions evaluated against crafted inputs can cause exponential backtracking, freezing the event loop for seconds.

---

## 6. Security Boundaries & Remaining Limitations

1. **Input Type Robustness:**  
   Schemas explicitly handle omitted, null, array, and object payloads, returning friendly guidance (verified in [`scripts/test-schemas.mjs`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/scripts/test-schemas.mjs)).
2. **Form Safety Preserved:**  
   Validation failures return safe values (`name`, `email`) in input `value` attributes; passwords are **never echoed**.
3. **Account Enumeration Limitation (Active):**  
   - Duplicate signup returns `HTTP 409 Conflict`, disclosing existing accounts.
   - Login validation returns in ~0.82 ms on malformed input, whereas valid-format credentials run Argon2id (~25.4 ms), retaining an unmitigated timing differential.
4. **Production Database Protection:**  
   Production database [`app/data/nits_cut.db`](file:///Users/blk/Developer/Five5%20assessment%20task/app/data/nits_cut.db) remained completely untouched throughout all Step 6 tests (`SHA-256: cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`). Zero migrations run.
