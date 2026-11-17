# Breached Password Verification (k-Anonymity Hash-Prefix Model)

## 1. Overview & Business Rationale

Users frequently reuse passwords across multiple websites. When a third-party service suffers a data breach, credentials leak into public and underground corpuses. Attackers weaponize these corpuses using automated credential-stuffing and password-spraying tools against every consumer and business portal they can find.

Nit's Cut enforces a 15-character minimum password policy, but length alone does not guarantee security if the selected passphrase has already appeared in a breach (e.g. `"correcthorsebatterystaple"` or common 16-character patterns like `"password12345678"`). 

To prevent customers from registering accounts with compromised credentials, Nit's Cut integrates an automated check against a breached-password service at registration.

### Scope: Registration Only (`POST /auth/signup`)
Breached password verification is enforced **strictly at registration**:
1. **User Empowerment at Secret Selection:** Registration is the exact moment the customer establishes their secret. Rejecting compromised credentials at this boundary guides the user to select an uncompromised password before their account ever exists.
2. **Protecting Login Availability & Performance:** Routine login (`POST /auth/login`) must never depend on an external network round-trip. Calling an external service on every customer login would degrade authentication speed and create a single point of failure (an external API outage would lock existing customers out of their accounts).
3. **Preventing Side-Channel Authentication Leakage:** Querying external infrastructure during routine login risks leaking customer authentication patterns to upstream network intermediaries.
4. **Password Reset (`POST /auth/reset`):** The current prototype reset route only accepts an email address to request a reset link. When password-reset completion forms are added where a new password is set, the breach check will be enforced there as well.

---

## 2. The k-Anonymity Mechanism (Interview Question 18)

### How It Avoids Sending the Password
The fundamental interview question is: *How can an application check whether a user's password is in a multi-million-row database of breached credentials without sending the password to the checking service?*

Nit's Cut implements the **k-anonymity hash-prefix model** developed by Cloudflare and Troy Hunt (Have I Been Pwned API v3):

```
[Candidate Plaintext Password]
             │
             ▼
1. Normalize whitespace (trim leading/trailing per Step 5 policy)
             │
             ▼
2. Compute SHA-1 digest locally:
   "password12345678" ──► 2317AA72DAFA0A07F05AF47BAA2E388F95DCF6F3
             │
             ├────────────────────────┬────────────────────────────────────────┐
             ▼                                                                 ▼
      Prefix (5 hex chars)                                          Suffix (35 hex chars)
            "2317A"                                          "A72DAFA0A07F05AF47BAA2E388F95DCF6F3"
             │                                                                 │
             ▼                                                                 │
3. HTTPS GET /range/2317A                                                      │
   (Only the 5-char prefix leaves our server)                                  │
             │                                                                 │
             ▼                                                                 │
4. Receive candidate bucket (~800–2,200 suffixes with breach counts)            │
             │                                                                 │
             ▼                                                                 ▼
5. Local In-Memory Comparison: Search candidate bucket for our suffix ◄────────┘
             │
             ├─► If suffix found with count > 0 ──► OUTCOME: BREACHED
             ├─► If suffix not found or count = 0 ──► OUTCOME: NOT FOUND
             └─► If network/body/parse error ────► OUTCOME: UNAVAILABLE
```

### Protocol Steps in Detail
1. **Local SHA-1 Hashing:** The server takes the trimmed candidate password and computes its 160-bit SHA-1 cryptographic digest, formatted as a 40-character uppercase hexadecimal string.
2. **Prefix/Suffix Split:**
   - **Prefix:** The first 5 characters (`2317A`).
   - **Suffix:** The remaining 35 characters (`A72DAFA0A07F05AF47BAA2E388F95DCF6F3`).
3. **The Range Request:** The server transmits **only** the 5-character prefix over HTTPS to the range endpoint:
   ```http
   GET /range/2317A HTTP/1.1
   Host: api.pwnedpasswords.com
   User-Agent: NitsCut-Assessment/1.0 (Task 4 Security Audit)
   Add-Padding: true
   Accept: text/plain
   ```
4. **The k-Anonymity Candidate Bucket:** In hexadecimal, 5 characters encompass $16^5 = 1,048,576$ buckets. The remote database contains hundreds of millions of breached hashes distributed across these buckets. The API responds with the set of all known hash suffixes starting with `2317A`.
5. **Padding Dummy Hashes (`Add-Padding: true`):** The service injects randomized dummy entries with a count of `0` to normalize response payload sizes to between 800 and 1,000 entries.
6. **Local In-Memory Evaluation:**
   - The application parses the response line by line (`SUFFIX:COUNT`).
   - Suffixes with `count === 0` are dummy padding entries and are discarded.
   - The application compares the remaining 35-character user suffix against the returned list.
   - If a match is found with `count > 0`, the password is confirmed breached.
   - If no match is found, the outcome is `not_found`. Crucially, **`not_found` means strictly that the candidate hash was absent from the service at lookup time; it is not an absolute guarantee that the password is safe, uncrackable, or uncompromised in unindexed or future breaches.**

---

## 3. Why Naive Approaches Are Unacceptable

### Naive Approach 1: Sending the Plaintext Password (`POST /check-password`)
Sending plaintext passwords to an external third-party API is an egregious architectural defect:
- It requires the application to trust the third party, every proxy, load balancer, CDN, and network intermediary in the transit path.
- The external service operator could log incoming passwords in cleartext or suffer a breach of their own request logs.
- An attacker capable of intercepting TLS termination at any point would capture user passwords as they are created.

### Naive Approach 2: Sending the Full Hash (`GET /check-hash/{full_sha1}`)
Sending the full cryptographic hash (e.g. `2317AA72DAFA0A07F05AF47BAA2E388F95DCF6F3`) gives a false illusion of security:
- Because the corpus of human passwords consists of words, dictionary terms, and recognizable patterns, an adversary who intercepts or logs the full SHA-1 hash can trivially invert it using precomputed rainbow tables or dictionary attacks in microseconds.
- Sending the full hash is effectively equivalent to sending the plaintext password for any compromised secret.

---

## 4. Limits of Range Queries & Information Disclosure

While k-anonymity and response padding dramatically reduce disclosure, they **do not guarantee complete mathematical anonymity or eliminate all traffic-analysis risks**:

1. **Prefix Hash Bits Disclosure (20 Bits):** Five hexadecimal characters represent $5 \times 4 = 20\text{ bits}$ of the SHA-1 digest, narrowing down the candidate hash space to 1 in $16^5 = 1,048,576$ buckets. Crucially, this 20-bit disclosure is a mathematical property of the hash index, **not** a direct measurement of password entropy disclosed. The actual entropy compromised depends entirely on the user's password distribution: for a predictable dictionary word, guessing difficulty is already dominated by corpus frequency rather than hash prefix length; for a high-entropy secret, disclosing 20 bits of a 160-bit hash leaves the remaining search space astronomically large.
2. **Metadata & Outbound Destination Visibility:** Even over HTTPS, network eavesdroppers (ISPs, local network sniffers, upstream cloud routing fabrics) observe:
   - The destination IP address and Server Name Indication (SNI): `api.pwnedpasswords.com`.
   - Exact request timestamps.
   - Outbound and inbound packet sizes.
3. **Correlation with Client Actions:** An eavesdropper who observes a client `POST /auth/signup` to Nit's Cut followed immediately by an outbound query to `api.pwnedpasswords.com` can correlate the registration event with the prefix query.
4. **Traffic Analysis vs Padding:** Troy Hunt's `Add-Padding: true` feature pads responses with dummy hashes (`count: 0`) to keep response sizes within a narrower range (800–1,000 entries). However, network observers with advanced statistical traffic-analysis capabilities can still analyze fine-grained timing variations, TCP packet window dynamics, and local processing latencies to infer characteristics of the prefix.

Range queries are a practical engineering compromise that balances user privacy against threat detection; they must not be mistaken for absolute, zero-knowledge anonymity.

---

## 5. Separation of Concerns: Lookup Hash vs. Storage Hash

| Dimension | Lookup Hash (Step 9) | Storage Hash (Step 4 & 5) |
| :--- | :--- | :--- |
| **Algorithm** | **SHA-1** (160-bit digest) | **Argon2id** (RFC 9106 Section 7.4) |
| **Parameters** | Standard single pass ($O(1)$ CPU) | $m=65536\text{ KiB}$ (64 MiB), $t=3$, $p=4$, 32-byte digest |
| **Salt** | **None** (lookup requires deterministic prefix matching) | **16 cryptographically random bytes** per user |
| **Purpose** | Ephemeral search key for HIBP range API | Persistent, memory-hard credential in SQLite |
| **Storage** | **Never stored**; discarded immediately after in-memory check | Stored permanently in `users.password_hash` column |
| **Threat Model** | Bandwidth-efficient, privacy-preserving lookup | Defense against offline GPU/ASIC database cracking |

Nit's Cut never uses SHA-1 for password storage. SHA-1 is used solely as the standardized protocol indexing key required by the HIBP range API.

---

## 6. Execution Lifecycle & Boundary Placement

```
[Client Submits Registration Form: POST /auth/signup]
                         │
                         ▼
1. Body Parsing (express.urlencoded, express.json)
                         │
                         ▼
2. Rate Limiting Middleware (5 requests / hour / IP)
   ─── If exceeded ─────► HTTP 429 Too Many Requests (immediate rejection)
                         │
                         ▼
3. Zod Boundary Schema (SignupSchema.safeParse)
   ─── If invalid ──────► HTTP 400 Bad Request (bad email, name < 2, password < 15 chars)
                         │ (Boundary check; zero network calls made)
                         ▼
4. Breached Password Check (checkPasswordBreached)
   ─── If breached ─────► HTTP 400 Bad Request (honest customer breach notification)
   ─── If unavailable ──► HTTP 503 Service Unavailable (fail-closed, zero accounts created)
                         │ (Rejects BEFORE spending 64 MiB RAM and ~23 ms elapsed wall-clock time on Argon2id)
                         ▼
5. Password Storage Hashing (Argon2id: m=65536, t=3, p=4)
                         │
                         ▼
6. Database Write (createUser -> INSERT INTO users)
                         │
                         ▼
7. Response Render (HTTP 201 Created -> auth-result.ejs)
```

**Why this order is mandatory:**
- **Zero Wasted Bandwidth:** If the user submits invalid form data (e.g. `password="short"` or missing email), Zod rejects the request immediately in memory. No network call is made to the external API.
- **Resource Exhaustion Defense:** Argon2id is intentionally computationally and memory-expensive (64 MiB RAM, ~23 ms elapsed wall-clock time in our local benchmark). If an attacker submits thousands of known breached passwords, checking the breach status *before* hashing ensures that the server aborts before spending CPU cycles and memory on Argon2id.
- **Database Cleanliness:** Rejection occurs before calling `createUser`, guaranteeing zero rows and zero reserved auto-increment IDs in SQLite.

---

## 7. Reliability, Error Categories & The Fail-Closed Trade-Off

### Three Explicit Outcomes
The module [`app/src/breachCheck.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/breachCheck.js) defines three distinct outcomes:
1. `'breached'`: The candidate suffix was found in the returned candidate set with `count > 0`.
2. `'not_found'`: The HTTP query returned 200 OK with valid lines, and the suffix was either not present or was only present with `count === 0` (dummy padding entry). **Absent from service at lookup time; not an absolute security guarantee.**
3. `'unavailable'`: Any failure condition occurred. **The application never treats an error, non-200 status, empty response, or malformed line as 'not_found'**.

### Strict Response Validation
To prevent accepting corrupted or forged upstream responses:
- **HTTP 200 Only:** Accepts only HTTP 200. Any other status code (including HTTP 201 Created or 204 No Content) is treated as `unavailable` with category `HTTP_STATUS_<code\>`.
- **Every Non-Empty Line Validated:** Every non-empty line must consist of exactly 35 hexadecimal characters, a single colon, and a complete non-negative integer string (`/^(?:0|[1-9]\d*)$/`).
- **No Permissive Parsing:** Permissive integer parsing (such as `parseInt("0garbage")`, decimals like `"1.5"`, or negative numbers like `"-1"`) is strictly rejected.
- **All-or-Nothing Integrity:** If any single non-empty line in the response is malformed, the entire response is rejected as `unavailable` (`MALFORMED_RESPONSE`), even if other lines are valid.
- **Trailing Blank Lines:** Normal trailing blank lines (e.g. standard CRLF line endings at the end of the HTTP body) are permitted.

### Bounded Timeout
Both the outbound connection and the response-body streaming are bound by a strict timeout (2,000 ms ceiling):
```javascript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(new Error('TIMEOUT')), timeoutMs);
try {
  const res = await fetchFn(targetUrl, { signal: controller.signal, ... });
  const body = await res.text(); // Bound by controller.signal
  ...
} finally {
  clearTimeout(timer);
}
```

### The Availability Trade-Off: Failing Closed
For this project, Nit's Cut adopts a **fail-closed** policy as our chosen project policy (rather than a compulsory assessment mandate):
- **Behavior:** If the breach check service experiences a timeout, connection failure, non-200 HTTP status (429, 500, 503, 201), empty response, or malformed line, the route returns `HTTP 503 Service Unavailable` with a plain customer retry message:
  *"Password verification is temporarily unavailable. Please try again in a few moments."*
- **Database Impact:** Zero user accounts are created.
- **Architectural Trade-Off:**
  - *Advantage:* Absolute compliance with chosen credential policy. Under no circumstances will an unvetted or potentially compromised password be accepted into the database due to an upstream network failure.
  - *Disadvantage:* **Hard Availability Dependency (Single Point of Failure).** If Have I Been Pwned suffers an outage, Cloudflare experiences edge routing issues, or local network DNS fails, all new customer registrations on Nit's Cut are completely blocked until the upstream service recovers. In a production consumer business, many organizations choose to *fail-open* (with a logged warning and subsequent asynchronous auditing) to prevent third-party outages from destroying signup conversion. Choosing fail-closed is a deliberate business risk trade-off.

---

## 8. Confidentiality & Zero-Credential Logging Audit

To ensure compliance with strict privacy and security auditing rules:
- **Never Logged:**
  - Plaintext candidate passwords.
  - 40-character SHA-1 hashes.
  - 35-character suffixes.
  - 5-character prefixes.
  - Request URLs containing the prefix.
- **Permitted Operational Telemetry:**
  - Request duration (in ms).
  - Outcome (`breached`, `not_found`, `unavailable`).
  - Error category (`TIMEOUT`, `HTTP_STATUS_503`, `HTTP_STATUS_201`, `EMPTY_RESPONSE`, `MALFORMED_RESPONSE`, `NETWORK_ERROR`).

Example console output during actual runtime execution:
```
[BreachCheck] Outcome: breached, Duration: 424.1ms
[BreachCheck] Outcome: not_found, Duration: 200.0ms
[BreachCheck] Outcome: unavailable, Duration: 50.5ms, Category: TIMEOUT
[BreachCheck] Outcome: unavailable, Duration: 0.1ms, Category: MALFORMED_RESPONSE
```

### Fictional Test Fixtures vs. Application Operational Logs
The candidate passphrases (e.g. `"password12345678"`, `"correcthorsebatterystaple"`, and unbreached reference phrases) displayed in test script console output and evidence logs are fictional test fixtures used specifically to demonstrate and verify automated test execution. In contrast, the application's runtime operational code and server logs strictly exclude all passwords, full hashes, suffixes, prefixes, and range URLs, logging only duration, outcome, and error category.

---

## 9. Test Evidence & Empirical Verification

### Live Service Verification at Test Time
Candidate passwords were tested directly against `https://api.pwnedpasswords.com/range/` with `Add-Padding: true`:

| Candidate Password | Length | Hash Prefix | Observed Status at Test Time | Observed Count |
| :--- | :--- | :--- | :--- | :--- |
| `"password12345678"` | 16 | `2317A` | **breached** | **24,881** |
| `"correcthorsebatterystaple"` | 25 | `BFD36` | **breached** | **4,173** |
| `"NitsCut#2026-UniqueBespokePassphrase!"` | 37 | `4ED0E` | **not found in this service at test time** | **0** |

Both `"password12345678"` (16 characters) and `"correcthorsebatterystaple"` (25 characters) comfortably pass the 15-character minimum rule, proving conclusively that their rejection is triggered **strictly by the breach check** and not by boundary validation.

### Automated Test Suite (`scripts/test-step9-breach-check.mjs`)
The test runner executed 59 automated assertions against the isolated test database `app/data/step5_test.db`:
- **Live Detection:** Submitting `"password12345678"` produced `HTTP 400 Bad Request` with message *"This password has appeared in a known data breach. Please choose a different password to protect your account."*, preserved safe form fields (`name="Ade Kolawole"`, `email="ade.breached@example.com"`), cleared the password input, focused the `.form-error-banner` (`role="alert"`), and created 0 database accounts.
- **Boundary Validation:** Submitting a short password (`"short"`) was rejected by Zod at the boundary with zero outbound network calls and 0 database accounts created.
- **Registration Success:** Submitting unbreached passphrase `"NitsCut#2026-UniqueBespokePassphrase!"` produced `HTTP 201 Created`, creating a user row with normalized lowercase email, role `'client'`, and stored Argon2id password hash.
- **Route Isolation:** Verified that `POST /auth/login` and `POST /auth/reset` execute without invoking breach checks.
- **Strict Response Validation & Malformed Handling (Section 1 & 3):**
  - Mixed valid and malformed lines $\rightarrow$ returned `HTTP 503`, created 0 accounts.
  - Invalid counts (trailing garbage `"0garbage"`, decimals `"1.5"`, negatives `"-1"`, leading zeros `"01"`) $\rightarrow$ returned `HTTP 503`, created 0 accounts.
  - Non-200 responses (HTTP 201, HTTP 503) $\rightarrow$ returned `HTTP 503`, created 0 accounts.
  - Valid CRLF response with normal trailing blank lines $\rightarrow$ returned `HTTP 201 Created`, created 1 account.
  - Simulated upstream timeout $\rightarrow$ returned `HTTP 503`, created 0 accounts.
- **Padding Entry Immunity:** When the API returned a matching suffix with `count: 0`, the check discarded the dummy padding entry and returned `not_found`, creating the user account normally.
- **Real Database Integrity:** Confirmed `app/data/nits_cut.db` SHA-256 (`cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`) remained identical throughout all test runs.

### Visual Evidence
Visual evidence of a live-confirmed breached password rejection is captured in:
[`evidence/15-breach-check-rejection.png`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/evidence/15-breach-check-rejection.png)
- Displays the live rejection banner at the top of the registration card.
- Shows safe form inputs (`name="Ade Kolawole"`, `email="ade.breached@example.com"`) preserved.
- Shows the password input empty (never echoed).
- Styled using shared CSS design tokens without raw pixel overrides.
