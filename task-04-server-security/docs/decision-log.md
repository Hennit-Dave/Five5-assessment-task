# Decision log

Record requirement, decision and reason, actual action/command, observed result, evidence path, date and commit (or explicitly not committed). Never backdate or invent observations.

## DL-04-01 — Nine-table schema design with append-only payment attempt history (Step 1)
- **Date:** 2026-11-08
- **Requirement:** Design and draw on paper a relational schema for Nit's Cut covering `users`, `sessions`, `orders`, `payment_attempts`, `payments`, `verification_codes`, and `document_chunks`, plus foreign-key target tables (`inquiries`) and status-history tracking (`payment_attempt_events`), then document the full design in `docs/schema.md`.
- **Decision & Reason:**
  1. Preserved existing `inquiries` table (`app/migrations/001-initial-schema.sql`) and linked `orders.inquiry_id` as an optional unique foreign key so walk-in orders can exist without a web enquiry while web-originated orders map at most 1:1 (`1:0..1`) to an enquiry.
  2. Separated `payment_attempts` (one row per checkout try tied to `idempotency_key`), `payment_attempt_events` (append-only status history per attempt with `from_status`, `to_status`, `reason`, `gateway_reference`, `occurred_at`), and `payments` (one row per confirmed financial charge with `UNIQUE(payment_attempt_id)` and `UNIQUE(gateway_reference)`). This avoids overwriting status history, prevents duplicate charges during unresolved timeouts, and enables full audit reconstruction 14 months later.
  3. Scoped refund columns on `payments` (`refunded_amount_kobo`, `refund_gateway_reference`, `refunded_at`) to support one completed refund per payment, documenting that multiple partial refunds against one payment would require a separate `refunds` table.
  4. Reconciled handwritten identifier spelling variations from `01-schema-drawing.jpg` (including `Inquries`, `Payments_attempts`, `Payment_attempts_events`, `Payment_attempts_id`, `Occured_at`, `refunded_gateway_reference` → `refund_gateway_reference`, duplicate `Purpose Purpose`, and `user_id` squeezed above `payment_attempt_id` in Box 7) in `docs/schema.md` Section 1 without altering the photograph.
- **Action:** Converted learner's `IMG_1999.HEIC` to `evidence/01-schema-drawing.jpg` via `sips` and authored `docs/schema.md`.
- **Observed Result:** Complete 9-table specification with `[BRIEF]`, `[EXISTING]`, and `[PROPOSED]` labels, relationship matrix (`R1`–`R10`), index cost analysis, and duplicated-fact consistency rules.
- **Evidence:** `../evidence/01-schema-drawing.jpg`, `./schema.md`
- **Commit:** Not committed.

## DL-04-02 — Read-only SQLite baseline inspection before Step 3 migrations (Step 2)
- **Date:** 2026-11-08
- **Requirement:** Inspect the existing database before running any Task 4 migrations and capture `evidence/02-database-state-before.png`.
- **Decision & Reason:** Before Step 3, calling `getDb()` in `app/src/db.js` automatically runs every `.sql` file in `app/migrations/` (importing `db.js` alone does not run migrations; calling `getDb()` does). To inspect the genuine pre-Task-4 database state without calling `getDb()` or triggering any writes, we used `sqlite3 -readonly app/data/nits_cut.db` directly from `task-04-server-security/scripts/inspect-database-readonly.sh` and verified SHA-256 hashes of `nits_cut.db`, `nits_cut.db-wal`, and `nits_cut.db-shm` before and after inspection.
- **Action:** Executed `bash task-04-server-security/scripts/inspect-database-readonly.sh` in macOS `Terminal.app` and captured window ID `32313` to `evidence/02-database-state-before.png` and `evidence/02-database-state-before.txt`.
- **Observed Result:** Only `inquiries` (8 columns, 2 rows, 1 index `idx_inquiries_created_at`) and `sqlite_sequence` (1 row, `seq=2`) exist. `0` of 8 proposed Task 4 tables exist. `journal_mode=wal`, `user_version=0`, `foreign_keys=0` (default on unconfigured connections). Pre- and post-inspection SHA-256 hashes are identical.
- **Evidence:** `../evidence/02-database-state-before.png`, `../evidence/02-database-state-before.txt`, `../scripts/inspect-database-readonly.sh`
- **Commit:** Not committed.

## DL-04-03 — Deliberate schema migrations, failure demonstration, and drift recovery (Step 3)
- **Date:** 2026-11-08
- **Requirement:** Run the initial schema migration deliberately on the real database, demonstrate a required-column failure on a populated table, perform the safe three-step expand/backfill/enforce pattern, and demonstrate schema drift error & recovery. Keep the agent out of running migrations.
- **Decision & Reason:**
  1. Decoupled `getDb()` in `app/src/db.js` from automatic migration execution and enabled `PRAGMA foreign_keys = ON;` on every application connection.
  2. Created explicit CLI runner `app/src/migrate.js` (`npm --prefix app run migrate`) with `schema_migrations` tracking (`filename`, `checksum_sha256`, `applied_at`) and SHA-256 forward-only immutability checks, while keeping `--status` genuinely read-only (`{ readonly: true, fileMustExist: true }`).
  3. Separated the real application database (`app/data/nits_cut.db`) for Exercise 1 from isolated disposable databases (`step3_disposable_required_col.db`, `step3_disposable_drift.db`) for Exercises 2, 3, and 4.
  4. In Exercise 4, demonstrated an application-query/database schema mismatch caused by unapplied migrations (not an ORM client or automatic drift detection). Applied corrective migrations in place to the same database without deletion, verified existing enquiry IDs and values survived, and reran the exact same application query.
- **Action:** Learner personally executed all four commands via terminal subshells with `set -o pipefail` and saved output to `evidence/03` through `06`.
- **Observed Result:**
  - Real DB (`03`): 10 application tables, 11 explicit indexes, `foreign_keys = 1`, 2 existing inquiries preserved.
  - Disposable DB (`04`): `Cannot add a NOT NULL column with default value NULL` (exit code `1`), atomic rollback kept rows intact.
  - Disposable DB (`05`): Step 1 (nullable `branch_code`), Step 2 (backfill `'LAGOS-VI'`), Step 3 (table rebuild with `notnull = 1`; `NULL` insertion blocked).
  - Disposable DB (`06`): `no such column: branch_code` (exit code `1`), followed by in-place migration application to the same database file, survival of rows `1` and `2`, and successful query rerun.
- **Evidence:** `../evidence/03-initial-migration.txt`, `../evidence/04-required-column-failure.txt`, `../evidence/05-required-column-three-steps.txt`, `../evidence/06-drift-error.txt`, `../docs/migrations.md`
- **Commit:** Not committed.

## DL-04-04 — Password hashing algorithm selection, independent salting, and hardware benchmark (Step 4)
- **Date:** 2026-11-09
- **Requirement:** Select an adaptive slow hashing algorithm (Argon2id or bcrypt; not SHA-256/SHA-512/MD5), prove distinct hashes from independent salts on identical input, time Argon2id vs SHA-256 on local hardware with arithmetic, and explain salting and the work-factor inversion.
- **Decision & Reason:**
  1. Selected Argon2id (`argon2@0.45.2`) using the RFC 9106 Section 7.4 Second Recommended Profile ($m=65536\text{ KiB} = 64\text{ MiB}, t=3, p=4$, 32-byte hash) appropriate for memory-constrained environments where 2 GiB primary allocations are impractical.
  2. Implemented standalone verification scripts ([`scripts/step4-hash-twice.mjs`](../scripts/step4-hash-twice.mjs) and [`scripts/step4-timing-benchmark.mjs`](../scripts/step4-timing-benchmark.mjs)) using clearly labeled fictional test password `"BespokeKaftan#2026!"` without touching the application database or live login endpoints.
  3. Structured benchmark using `performance.now()` measuring elapsed wall-clock duration over unmetered warm-ups, 10 sequential iterations for Argon2id ($p=4$), and 250,000 iterations for SHA-256 to avoid timer rounding to zero. Logging kept outside timed sections.
  4. Documented that SHA-256 uses memory for internal state but is not memory-hard, framed ~23 ms as standalone benchmark latency rather than proof of throughput under concurrent load, and avoided overclaiming that attacker hardware requires identical durations.
- **Action:** Learner personally ran both scripts in terminal and saved genuine outputs to `evidence/07-hash-twice-different.txt` and `evidence/08-timing-argon-vs-sha.txt`.
- **Observed Result:**
  - Double-hash: All 5 verification checks passed; Hash 1 and Hash 2 differed; correct password verified against both; wrong password rejected.
  - Timing: Argon2id averaged 23.3196 ms/hash (42.88 hashes/sec) vs SHA-256 at 0.000422176 ms/hash (2,368,683 hashes/sec), demonstrating ~55,237x relative slowdown on Apple M3 Pro hardware.
  - Scope: Standalone benchmark completed; user registration/login database integration reserved for later steps.
- **Evidence:** `../evidence/07-hash-twice-different.txt`, `../evidence/08-timing-argon-vs-sha.txt`, `../docs/hashing.md`
- **Commit:** Not committed.

## DL-04-05 — Shared server-side email normalisation, password trimming policy, and database integration (Step 5)
- **Date:** 2026-11-09
- **Requirement:** Implement shared server-side email normalisation (trim + lowercase) on signup, login, and reset; implement password trimming of outer whitespace while preserving internal spaces and casing; ensure client-side length check parity; integrate tested Argon2id configuration into user persistence; enforce server-assigned customer role `'client'` and parameterized queries; capture genuine visual evidence (`09-email-case-normalised.png`, `10-password-trim-working.png`) and document the two-sentence explanation, defects, and limitations.
- **Decision & Reason:**
  1. Created `app/src/auth.js` exporting `normalizeEmail` and `normalizePassword`. Applied `normalizeEmail` consistently on `POST /auth/signup`, `/auth/login`, and `/auth/reset`.
  2. Documented password policy: leading and trailing whitespace trimmed to prevent silent lockouts from unintended clipboard copy-paste artifacts while preserving internal spaces in multi-word passphrases; passwords never lowercased because case sensitivity is essential to password entropy against brute-force attacks.
  3. Corrected client-side validation in `app/public/js/auth.js` (`validatePassword` and `isSignupPasswordValid`) to trim whitespace before evaluating the 15-character code point minimum, eliminating the defect where client permitted inputs that server rejected.
  4. Integrated tested Argon2id configuration ($m=65536\text{ KiB}, t=3, p=4$, 32-byte digest) in `createUser` and `verifyUserCredentials` in `app/src/db.js`. Server strictly assigns role `'client'`.
  5. Refactored styling in `app/views/auth.ejs` and `app/views/auth-result.ejs` to use existing CSS layout tokens (`--nc-border-width`, `--nc-radius-button`, `--nc-radius-card`, `--nc-color-error-container`) and shared `.form-error-banner` class with zero raw pixel values.
  6. Scrubbed technical implementation jargon ("Argon2id", "cookies", "database", "Step 5") from customer-facing views in `auth.ejs` and `auth-result.ejs`, replacing them with honest prototype notices and keeping technical explanations strictly in documentation.
  7. Implemented safe form preservation on validation errors and duplicate email conflicts: `safeFormData` (`name`, `email`) is echoed back into form inputs, while password fields are strictly never echoed.
  8. Implemented accessible error feedback: added automatic keyboard focus shift to `.form-error-banner` (`role="alert"`, `tabindex="-1"`) when server errors render. Note: this verifies programmatic DOM focus behavior; no live VoiceOver/screen-reader audit was run.
  9. Conducted all automated tests and browser evidence captures on isolated test database `app/data/step5_test.db`, leaving real database `app/data/nits_cut.db` untouched (verified identical SHA-256 before and after).
  10. Recorded migration governance note: admitted that earlier in Step 5, the automated test setup executed `migrate.js` on `app/data/step5_test.db` without the learner's explicit command; verified schema suitability and ran zero subsequent migrations.
  11. Account enumeration documentation: honestly documented that account enumeration is currently active: duplicate signup reveals an account via `HTTP 409 Conflict`, and login early-return leaves an unmitigated timing side-channel (~23.95 ms for known accounts executing Argon2id vs ~1.01 ms for unknown accounts skipping hashing in single-request test observations). Documented as an architectural limitation demonstrating code path divergence, not a statistically established timing distribution (`docs/defects.md` limitations L-04-01, L-04-02).
- **Action:** Executed 23-assertion test suite (`scripts/test-step5-normalisation.mjs`, all 23 passed), 40-assertion HTTP route test suite (`scripts/test-step5-http-routes.mjs`, all 40 passed), and automated Chrome DevTools Protocol interaction script (`scripts/capture-step5-evidence.mjs`) composited via Swift (`scripts/composite-step5-evidence.swift`). Preserved earlier captures as `evidence/09-email-case-normalised-v1-internal-terms.png` and `evidence/10-password-trim-working-v1-internal-terms.png`.
- **Observed Result:**
  - `09-email-case-normalised.png`: Registration with `Ade.Kolawole@EXAMPLE.COM` stored `ade.kolawole@example.com`; login with `ade.kolawole@example.com` succeeded with HTTP 200, rendering confirmed account details.
  - `10-password-trim-working.png`: Registration with trailing whitespace (`BespokeKaftan#2026!   `); login with trimmed `BespokeKaftan#2026!` succeeded via Argon2id hash verification.
  - Automated tests (63 total assertions across both suites) confirmed email normalisation, password trimming, 401 on wrong password/casing, 409 on duplicate account, 400 on missing terms, role escalation rejection (strictly `'client'`), safe form field preservation, zero rows created on invalid requests, account enumeration disclosure on duplicate signup (409), early-return timing difference (~24 ms vs ~1 ms single-request observations), and zero modification to `nits_cut.db`.
  - Scope: User accounts and Argon2id hashes persisted in database; persistent sessions and cookie issuance remain unactivated in Step 5 (scheduled for Step 6).
- **Evidence:** `../evidence/09-email-case-normalised.png`, `../evidence/09-email-case-normalised-v1-internal-terms.png`, `../evidence/10-password-trim-working.png`, `../evidence/10-password-trim-working-v1-internal-terms.png`, `../docs/normalisation.md`, `../docs/defects.md`, `../scripts/test-step5-normalisation.mjs`, `../scripts/test-step5-http-routes.mjs`
- **Commit:** Not committed.

## DL-04-06 — Request boundary schema validation placement, Zod integration, and HTTP timing benchmark (Step 6)
- **Date:** 2026-11-09
- **Requirement:** Install a validation library (Zod), record rationale, define schemas for registration, login, and reset preserving all approved normalization and business rules, place validation immediately after body parsing and before credential hashing or database queries, measure total request latency and validation-only execution duration before and after validation across warm-up and measured requests, capture `evidence/11-validation-timing.txt`, and document placement and the class 2-3 second delay investigation in `docs/validation-placement.md`.
- **Decision & Reason:**
  1. Selected Zod (`zod@4.6.7`) for zero external dependencies, runtime parsing and canonical transforms (`.transform()`, `.pipe()`), automatic property stripping (`.strip()`) against mass assignment, and composable, isolated testability.
  2. Created dedicated schema module `app/src/schemas.js` exporting `SignupSchema`, `LoginSchema`, and `ResetSchema`. Schemas couple normalization (email lowercasing, password outer-whitespace trimming) with boundary validation (15-code-point password length, terms acceptance, mononym name support). Unauthorized payload properties (such as injected `role: 'admin'`) are stripped, ensuring server code strictly assigns customer role `'client'`.
  3. Placed schema execution in `app/src/server.js` immediately after `express.urlencoded` body parsing, strictly before calling `createUser`, `verifyUserCredentials`, Argon2id hashing, or SQLite queries. Downstream handlers consume the parsed schema output (`parseResult.data`).
  4. Preserved safe form preservation on validation rejections (`safeFormData: { name, email }`), while password fields are never echoed. Retained `.form-error-banner` with accessible attributes and design tokens.
  5. Implemented repeatable HTTP timing benchmark (`task-04-server-security/scripts/step6-benchmark-runner.mjs`) measuring 3 unmetered warm-ups + 10 measured requests across 6 scenarios on isolated test database `app/data/step5_test.db`. Pre-verified known login user (`ade.kolawole@example.com`) and Argon2id password verification prior to benchmarking. Asserted expected HTTP status and response-result content on every request (including warm-ups). Preserved baseline timing in `evidence/baseline-timing.json` with overwrite protection guards and stored post-Zod measurements separately in `evidence/post-zod-verification.json`. Exposed server-side validation duration via `X-Validation-Duration-Ms` response header to separate total round-trip from validation-only time.
- **Action:** Executed baseline benchmark, installed Zod, integrated schemas into server, verified 40 passing HTTP route tests, executed post-Zod verification benchmark with status/content assertions, and generated `evidence/11-validation-timing.txt` and `docs/validation-placement.md`.
- **Observed Result:**
  - Validation-only execution time (Zod `safeParse`): **0.0080 ms to 0.0323 ms** (8 to 32 microseconds).
  - Total HTTP request latency: Valid signup averaged **25.783 ms** (Post-Zod) vs **25.963 ms** (Baseline), dominated by Argon2id hashing (~23.3 ms). Boundary rejections for invalid signups execute in **~0.82 ms** to **0.83 ms**, bypassing Argon2id and database I/O entirely.
  - Investigated class 2-3 second delay: Confirmed that in-memory schema validation overhead is small (~0.01 to 0.03 ms). Discussed potential hypotheses for multi-second delays in other setups (synchronous DNS MX lookups, external breached password APIs, excessive cryptographic work factors, or un-indexed database contention).
  - Production database `app/data/nits_cut.db` verified completely untouched (identical SHA-256).
- **Evidence:** `../evidence/11-validation-timing.txt`, `../evidence/baseline-timing.json`, `../evidence/post-zod-verification.json`, `../docs/validation-placement.md`, `../../app/src/schemas.js`, `../scripts/step6-benchmark-runner.mjs`
- **Commit:** Not committed.

## DL-04-07 — Server-side enforcement of client validation rules and direct HTTP request attack comparison (Step 7)
- **Date:** 2026-11-09
- **Requirement:** Replicate all Task 3 client validation rules comprehensively at the backend boundary, repeat the direct HTTP request attack from Task 3 Step 8 (`POST /auth/signup` bypassing browser forms), capture the refusal, author a side-by-side comparison in `evidence/12-direct-request-before-and-after.txt`, document rule parity and intentional differences in `docs/server-enforcement.md`, and verify that zero database rows are created while testing supporting malformed types and role escalation.
- **Decision & Reason:**
  1. Established rule-by-rule parity across all four Task 3 categories (empty checks, name length >= 2 with letter, email regex, 15-code-point password, not-all-spaces, and terms agreement).
  2. Documented intentional differences: synchronous boundary validation vs asynchronous interactive UI; generic `HTTP 401 Unauthorized` for login failures to prevent credential structure enumeration; server-side canonical password trimming (Step 5 policy) vs raw client typing; and strict server-side role assignment (`role: 'client'`) discarding injected privileges.
  3. Hardened against non-string malformations (JSON arrays, objects, nulls) using Zod 4's supported message APIs to return customer-friendly guidance without leaking internal type descriptions.
  4. Created automated test script `task-04-server-security/scripts/test-step7-direct-request.mjs` to repeat the exact Task 3 curl command (`name=A&email=not-an-email&password=short`) on port 3108 against isolated test DB `app/data/step5_test.db`.
- **Action:** Executed test suite, verified refusal (`HTTP 400 Bad Request`), verified 0 database rows created, tested supporting empty-field, malformed-type, and privilege-escalation attacks, generated `evidence/12-direct-request-before-and-after.txt`, and authored `docs/server-enforcement.md`.
- **Observed Result:**
  - Direct request Request 1 returned `HTTP 400 Bad Request` with message *"Please enter at least two characters, including a letter, for your name."* (Task 3 returned `HTTP 200 OK`).
  - Password `"short"` was never echoed back in response HTML. Safe fields (`name="A"`, `email="not-an-email"`) preserved in value attributes.
  - Database row count remained 21 (0 rows created).
  - Request 2 (empty fields) refused with `HTTP 400 Bad Request` (0 rows created).
  - Malformed types (JSON arrays, objects, nulls, omitted password) refused with `HTTP 400 Bad Request` (0 rows created).
  - Attempted privilege escalation (`role=admin`, `is_admin=true`) resulted in account creation with strictly assigned role `'client'`.
  - Production database `app/data/nits_cut.db` verified completely untouched (identical SHA-256).
- **Evidence:** `../evidence/12-direct-request-before-and-after.txt`, `../docs/server-enforcement.md`, `../scripts/test-step7-direct-request.mjs`
- **Commit:** Not committed.

## DL-04-08 — Route-specific IP rate limiting, counter architecture, and local bypass demonstration (Step 8)
- **Date:** 2026-11-09
- **Requirement:** Implement rate limiting on signup, login, and reset. Choose and justify thresholds and windows. Trigger the limit in browser (`evidence/13-rate-limit-triggered.png`), defeat it from another source address (`evidence/14-rate-limit-defeated.txt`), and author `docs/rate-limiting.md` explaining counter storage, shared networks, IP insufficiency, and alternative controls.
- **Decision & Reason:**
  1. Selected `express-rate-limit@8.7.3` for route-level middleware, standard IETF draft-7 headers (`RateLimit`, `RateLimit-Policy`, `Retry-After`), and IPv6 `/56` subnet masking.
  2. Applied assessment thresholds: Login 5/15m, Signup 5/1h, Reset 3/1h. Counted all POST requests (including validation failures) to prevent attackers probing boundaries without consuming quota.
  3. Placed limiters immediately after body parsing and before Zod validation/Argon2id hashing to protect CPU and memory from abuse.
  4. Kept `trust proxy` disabled (`false`) so `req.ip` is resolved strictly from the underlying TCP socket peer address, preventing attackers from bypassing limits with forged `X-Forwarded-For` headers.
  5. Used in-memory counter storage (`MemoryStore`) for zero external dependencies and sub-millisecond execution, documenting limitations across process restarts and horizontal scaling.
  6. Provided accessible customer-facing `HTTP 429` error responses rendering `.form-error-banner` (`role="alert"`), preserving safe fields (`name`, `email`), and never echoing passwords. Added standard JSON responses when requested via `Accept: application/json`.
- **Action:** Created `app/src/rateLimit.js`, wired into `app/src/server.js`, captured browser screenshot `evidence/13-rate-limit-triggered.png` via CDP, ran test suite `scripts/test-step8-rate-limits.mjs` on single continuous server process across `127.0.0.1` and `192.168.1.53`, verified forged header rejection, generated `evidence/14-rate-limit-defeated.txt`, and authored `docs/rate-limiting.md`.
- **Observed Result:**
  - Login limit exhausted after 5 attempts; 6th attempt returned `HTTP 429` (`Retry-After: 900`).
  - Signup limit exhausted after 5 attempts; 6th attempt returned `HTTP 429` (`Retry-After: 3600`).
  - Reset limit exhausted after 3 attempts; 4th attempt returned `HTTP 429` (`Retry-After: 3600`).
  - Local bypass: Exhausted address `127.0.0.1` blocked (`HTTP 429`); request from `192.168.1.53` reached handler (`HTTP 401`); `127.0.0.1` re-tested and remained blocked (`HTTP 429`).
  - Forged `X-Forwarded-For: 203.0.113.77` from `127.0.0.1` ignored (`trust proxy` OFF) and remained blocked (`HTTP 429`).
  - Real database `app/data/nits_cut.db` verified completely untouched (identical SHA-256).
- **Evidence:** `../evidence/13-rate-limit-triggered.png`, `../evidence/14-rate-limit-defeated.txt`, `../docs/rate-limiting.md`, `../../app/src/rateLimit.js`, `../scripts/test-step8-rate-limits.mjs`, `../scripts/capture-step8-evidence.mjs`
- **Commit:** Not committed.

## DL-04-09 — Breached password checks via k-anonymity hash-prefix lookup (Step 9)
- **Date:** 2026-11-09
- **Requirement:** Implement a check against a breached password service on registration only using the k-anonymity hash-prefix model. Capture browser rejection (`evidence/15-breach-check-rejection.png`) and author `docs/breach-check.md` explaining the mechanism, why naive approaches are unacceptable, lookup vs storage hash separation, and availability trade-offs.
- **Decision & Reason:**
  1. Implemented Have I Been Pwned (HIBP) API v3 k-anonymity protocol in `app/src/breachCheck.js`. Transmitted only 5-character SHA-1 prefix over HTTPS with `Add-Padding: true`. Compared 35-character suffix locally in memory and discarded dummy padding entries (`count === 0`).
  2. Applied strictly to registration (`POST /auth/signup`). Kept routine login and reset free of external network dependencies to protect authentication speed and prevent third-party outage lockouts.
  3. Placed check immediately after Zod schema validation (preventing network calls on malformed submissions) and strictly before Argon2id hashing and database writes (protecting 64 MiB RAM and CPU cycles from exhaustion when breached passwords are submitted).
  4. Enforced three explicit outcomes: `breached`, `not_found`, and `unavailable`. Never collapsed timeouts, network failures, non-200 responses, or malformed lines into `not_found`.
  5. Implemented strict response validation: accepted only HTTP 200 (treating non-200 including HTTP 201 as unavailable), validated every non-empty line requiring 35-hex suffix and non-negative integer count (rejecting permissive parseInt like "0garbage", decimals, and negatives), and treated any malformed line as failing the entire response while permitting normal trailing blank lines.
  6. Implemented fail-closed policy on service unavailability as our chosen project policy: returns `HTTP 503 Service Unavailable`, renders plain customer retry message, and creates zero accounts. Documented the availability trade-off (compliance vs hard third-party dependency).
  7. Enforced bounded timeout (2,000 ms ceiling) covering both request connection and body reading via `AbortController`.
  8. Audited logging: strictly banned logging passwords, full hashes, suffixes, prefixes, or URLs with prefixes. Logged only duration, outcome, and error category. Distinguished fictional test fixtures in evidence from credential-free operational logs.
  9. Retained Argon2id ($m=64\text{ MiB}, t=3, p=4$) exclusively for stored password hashes. SHA-1 is used solely as an ephemeral range query key and is never stored.
- **Action:** Created `app/src/breachCheck.js`, integrated into `app/src/server.js`, captured browser screenshot `evidence/15-breach-check-rejection.png` via headless Chrome CDP, authored `docs/breach-check.md`, and executed 59-check regression test suite `scripts/test-step9-breach-check.mjs`.
- **Observed Result:**
  - Live query: `"password12345678"` (16 chars) confirmed breached (count 24,881 at test time); returned `HTTP 400 Bad Request`, displayed breach warning banner (`role="alert"`), preserved safe fields (`name`, `email`), cleared password, and created 0 accounts.
  - Live query: `"correcthorsebatterystaple"` (25 chars) confirmed breached (count 4,173 at test time).
  - Live query: `"NitsCut#2026-UniqueBespokePassphrase!"` (37 chars) confirmed not found in service at test time; returned `HTTP 201 Created` with Argon2id hash.
  - Boundary validation: Submissions with password < 15 chars rejected at boundary with 0 network calls.
  - Service failure & malformed handling: Simulated timeout, 503, 201 (non-200), mixed valid/malformed lines, and invalid counts ("0garbage", decimals, negatives, leading zero) all returned `HTTP 503` with 0 accounts created.
  - Valid CRLF & trailing blank lines: Valid response with trailing blank lines succeeded with `HTTP 201 Created`.
  - Padding immunity: Suffix with `count: 0` correctly ignored and treated as unbreached.
  - Route isolation: Login and reset executed without querying breach service.
  - Database safety: `app/data/nits_cut.db` verified completely untouched (identical SHA-256).
- **Evidence:** `../evidence/15-breach-check-rejection.png`, `../docs/breach-check.md`, `../../app/src/breachCheck.js`, `../../app/src/server.js`, `../scripts/test-step9-breach-check.mjs`, `../scripts/capture-step9-evidence.mjs`
- **Commit:** Not committed.

## DL-04-10 — Email verification (Resend SMTP), branded email preview, deferred controls, and Q16 future outage policy (Steps 10–12)
- **Date:** 2026-11-17
- **Decision & Reason:**
  1. Switched Step 10 SMTP transport from Gmail OAuth2 to Resend SMTP (`smtp.resend.com:587`, `STARTTLS` required, user `resend`, domain-free test sender `onboarding@resend.dev`) with private `.env` secrets (`RESEND_API_KEY`, `TEST_RECIPIENT_EMAIL`, 64-char `VERIFICATION_HMAC_SECRET`) and strict `TEST_RECIPIENT_EMAIL` allowlist enforced before any SMTP connection (`app/src/email.js`).
  2. Implemented CSPRNG 6-digit code generation (`crypto.randomInt`, preserving leading zeros), keyed HMAC-SHA-256 `code_hash` storage, 10-minute expiry, 5-attempt lockout, 60-second resend cooldown, invalidation of superseded codes, atomic consumption (`used_at` + `users.email_verified_at`), and in-memory background job delivery (`3` total attempts = `1` initial + `2` retries).
  3. Manually mapped Task 1 colour, typography (`"Cormorant Garamond"` `line-height: 1.4` + `"Manrope"` with email fallbacks), and layout tokens into `buildVerificationMessage()` with learner-selected wording and personal critique in `docs/email-copy.md`.
  4. Documented 9 deferred controls in `docs/not-implemented.md` (separating essential pre-production work from scale/stage trade-offs) and answered all 19 interview questions in `docs/interview-answers.md`.
  5. **Q16 Future External-Store Outage Policy (Learner Decision):** If Nit's Cut moves to an external rate-limit store (e.g. Redis) in production and that store becomes unavailable, authentication endpoints (`signup`, `login`, `password reset`) will **fail closed** (temporarily returning `HTTP 503`), while public pages remain available. Recorded as a chosen future deployment policy, not current in-memory limiter behaviour.
- **Evidence:** `../evidence/16-smtp-failure.txt`, `../evidence/17-smtp-success.txt`, `../evidence/18-registration-timing-sync-vs-job.txt`, `../evidence/19-verification-row.png`, `../evidence/19a-verification-success.png`, `../evidence/20-verification-expired.png`, `../evidence/21-verification-wrong-code.png`, `../evidence/22-verification-code-reused.png`, `../evidence/23-rendered-email.png`, `../docs/verification-design.md`, `../docs/email-copy.md`, `../docs/not-implemented.md`, `../docs/interview-answers.md`.
