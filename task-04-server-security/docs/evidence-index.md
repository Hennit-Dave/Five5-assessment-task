# Evidence index

Record requirement, decision and reason, actual action/command, observed result, evidence path, date and commit (or explicitly not committed). Never backdate or invent observations.

## Step 1 — Paper schema photograph and schema documentation

- Date: 2026-11-08.
- Requirement: Draw a database schema on paper covering `users`, `sessions`, `orders`, `payment_attempts`, `payments`, `verification_codes`, and `document_chunks`, plus any tables referenced by foreign keys (`inquiries`) and append-only attempt history (`payment_attempt_events`). Photograph the drawing as `01-schema-drawing.jpg` and write the typed specification in `docs/schema.md`.
- Source: learner-supplied `IMG_1999.HEIC`; learner requested use of this version as-is.
- Action:
  1. Converted the HEIC photograph to JPEG using macOS `sips` and visually reviewed the result (`task-04-server-security/evidence/01-schema-drawing.jpg`). No drawing content was digitally changed.
  2. Authored `task-04-server-security/docs/schema.md` documenting all 9 tables, every column, SQLite type, required/optional status, primary keys, foreign keys, unique constraints, relationships (`R1`–`R10`), proposed indexes and write costs, duplicated facts and consistency rules, `payment_attempts` vs `payments` rationale (including a 14-month tax inquiry trace), `payment_attempt_events`, retry/idempotency rules, one-completed-refund-per-payment limitation, email verification race prevention, and explicit `[BRIEF]` / `[EXISTING]` / `[PROPOSED]` tags.
- Evidence: `../evidence/01-schema-drawing.jpg`, `./schema.md`.
- Observed: nine handwritten tables with fields, SQL types, key/nullability flags, and relationship lines. Hand-drawn identifier spelling variations (`Inquries`, `Payments_attempts`, `Payment_attempts_events`, `Payment_attempts_id`, `Occured_at`, `refunded_gateway_reference` → `refund_gateway_reference`, duplicate `Purpose Purpose`, and `user_id` squeezed above `payment_attempt_id` in `payments`) are explicitly reconciled in `docs/schema.md` Section 1 while leaving `01-schema-drawing.jpg` untouched.
- Status: Complete. Not committed (per learner instruction).

## Step 2 — Read-only baseline database inspection

- Date: 2026-11-08.
- Requirement: Inspect the existing SQLite database (`app/data/nits_cut.db`) using a read-only connection without starting the application or calling any helper (`getDb()`) that runs migrations. Record actual tables, columns, indexes, and row counts, and capture genuine evidence in `evidence/02-database-state-before.png`.
- Action:
  1. Recorded pre-inspection SHA-256 checksums of `app/data/nits_cut.db` (`97e8d54f8a7255106f66cf1b213c4a4d7b558d21310b1c2bfedc3d0d526dddda`), `nits_cut.db-wal` (`f7216661f4e4cdd6b73f52972991c0eb45cfef694ab71b8d64f2a2cb3d0e9bc6`), and `nits_cut.db-shm` (`1c24300a2a4e50ee8a0e7534bdf85e80ad2bacb2dca54bb86f4008b2e0075b62`).
  2. Created and executed `task-04-server-security/scripts/inspect-database-readonly.sh`, which runs `sqlite3 -readonly app/data/nits_cut.db` in macOS `Terminal.app` (window ID `32313`) without calling `getDb()`.
  3. Captured the live terminal window via `screencapture -x -o -l 32313` to `task-04-server-security/evidence/02-database-state-before.png` and saved the verbatim text transcript to `task-04-server-security/evidence/02-database-state-before.txt`.
  4. Verified post-inspection SHA-256 checksums of `nits_cut.db`, `nits_cut.db-wal`, and `nits_cut.db-shm`.
- Evidence: `../evidence/02-database-state-before.png`, `../evidence/02-database-state-before.txt`, `../scripts/inspect-database-readonly.sh`.
- Observed:
  - Tables present: `inquiries` (application table) and `sqlite_sequence` (SQLite internal `AUTOINCREMENT` sequence tracker).
  - `inquiries` columns (8): `id` (`INTEGER`, PK), `client_name` (`TEXT`, `notnull=1`), `phone` (`TEXT`, `notnull=1`), `garment_type` (`TEXT`, `notnull=1`), `fabric_choice` (`TEXT`, `notnull=1`), `fitting_date` (`TEXT`, `notnull=1`), `status` (`TEXT`, `notnull=1`, default `'Inquiry Received'`), `created_at` (`DATETIME`, `notnull=1`, default `CURRENT_TIMESTAMP`).
  - Indexes present: `idx_inquiries_created_at` on `inquiries(created_at)` (`unique=0`, `origin=c`).
  - Row counts: `inquiries = 2` rows (`Chinedu Okafor`, `Babatunde Adeleke`); `sqlite_sequence = 1` row (`name='inquiries'`, `seq=2`).
  - Proposed Task 4 tables present in `sqlite_master`: `0` of 8 (`users`, `sessions`, `orders`, `payment_attempts`, `payment_attempt_events`, `payments`, `verification_codes`, `document_chunks` are all absent).
  - Pragmas: `journal_mode = wal`, `user_version = 0`, `foreign_keys = 0` (off by default on a plain connection), `integrity_check = ok`.
  - Pre- and post-inspection SHA-256 hashes of all three database files are 100% identical.
- Status: Complete. Not committed (per learner instruction).

## Step 3 — Deliberate migrations, failure, three-step correction, and schema drift

### Exercise 1: Initial schema migration on real application database (`03-initial-migration.txt`)
- Date: 2026-11-08.
- Target database: `app/data/nits_cut.db` (**real application database**).
- Requirement: Run the initial migration under control, record the exact command and full output, and verify that the existing `inquiries` table and its data survive.
- Action: Learner executed `(set -o pipefail; node app/src/migrate.js --db app/data/nits_cut.db --dir app/migrations 2>&1 | tee task-04-server-security/evidence/03-initial-migration.txt)`.
- Evidence: `../evidence/03-initial-migration.txt`.
- Observed:
  - Created `schema_migrations` tracking table.
  - Applied `001-initial-schema.sql` at `2026-11-08T16:45:05.607Z` (`sha256:25ee36520d54`).
  - Applied `002-task04-core-schema.sql` at `2026-11-08T16:45:05.612Z` (`sha256:672b3b73fb2f`).
  - Set `journal_mode = wal` and `foreign_keys = 1`.
  - Application tables: 10 (`document_chunks`: 0, `inquiries`: 2, `orders`: 0, `payment_attempt_events`: 0, `payment_attempts`: 0, `payments`: 0, `schema_migrations`: 2, `sessions`: 0, `users`: 0, `verification_codes`: 0).
  - Explicit indexes: 11.
  - The 2 pre-existing enquiry rows (`Chinedu Okafor`, `Babatunde Adeleke`) survived intact.
- Status: Complete. Not committed (per learner instruction).

### Exercise 2: Required-column failure on populated table (`04-required-column-failure.txt`)
- Date: 2026-11-08.
- Target database: `app/data/step3_disposable_required_col.db` (**disposable exercise database**; real database untouched).
- Requirement: Attempt to add a required (`NOT NULL`) column without a default value to a populated table and capture the resulting failure and rollback.
- Action: Learner executed `(set -o pipefail; bash task-04-server-security/scripts/step3-ex2-required-column-failure.sh 2>&1 | tee task-04-server-security/evidence/04-required-column-failure.txt)`.
- Evidence: `../evidence/04-required-column-failure.txt`, `../scripts/step3-ex2-required-column-failure.sh`.
- Observed:
  - `001-seed-populated-inquiries.sql` applied successfully (seeded 2 rows).
  - `002-add-required-branch-code-fail.sql` (`ALTER TABLE inquiries ADD COLUMN branch_code TEXT NOT NULL;`) failed with `SQLITE_ERROR: Cannot add a NOT NULL column with default value NULL` (exit code `1`).
  - Atomic transaction rollback ensured no corrupt partial migration was recorded; only `001` remained in `schema_migrations`, and both existing enquiry rows remained intact with their original 4 displayed columns.
- Status: Complete. Not committed (per learner instruction).

### Exercise 3: Safe three-step required column addition (`05-required-column-three-steps.txt`)
- Date: 2026-11-08.
- Target database: `app/data/step3_disposable_required_col.db` (**disposable exercise database**; real database untouched).
- Requirement: Add the required column safely using the three-step expand/backfill/enforce pattern and capture all three steps.
- Action: Learner executed `(set -o pipefail; bash task-04-server-security/scripts/step3-ex3-three-step-required-column.sh 2>&1 | tee task-04-server-security/evidence/05-required-column-three-steps.txt)`.
- Evidence: `../evidence/05-required-column-three-steps.txt`, `../scripts/step3-ex3-three-step-required-column.sh`.
- Observed:
  - Step 1 (Expand): `002a-add-branch-code-optional.sql` added `branch_code TEXT` as nullable. Query confirmed existing rows showed `<NULL>`.
  - Step 2 (Backfill): `002b-backfill-branch-code.sql` ran `UPDATE inquiries SET branch_code = 'LAGOS-VI' WHERE branch_code IS NULL;`. Query confirmed both rows showed `LAGOS-VI`.
  - Step 3 (Contract/Enforce): `002c-enforce-branch-code-not-null.sql` rebuilt the table with `branch_code TEXT NOT NULL`, copied all rows, swapped tables, and recreated indexes. `PRAGMA table_info(inquiries)` confirmed `branch_code` has `notnull = 1`. Inserting a `NULL` `branch_code` was rejected with `NOT NULL constraint failed: inquiries.branch_code` (exit code `1`).
- Status: Complete. Not committed (per learner instruction).

### Exercise 4: Schema drift error and in-place recovery (`06-drift-error.txt`)
- Date: 2026-11-08.
- Target database: `app/data/step3_disposable_drift.db` (**disposable exercise database**; real database untouched).
- Requirement: Trigger a schema drift error where application query code expects a column not present in the unmigrated database, capture the missing-column error, explain the mismatch, and apply corrective migrations to the same database.
- Action: Learner executed `(set -o pipefail; bash task-04-server-security/scripts/step3-ex4-drift-error-and-fix.sh 2>&1 | tee task-04-server-security/evidence/06-drift-error.txt)`.
- Evidence: `../evidence/06-drift-error.txt`, `../scripts/step3-ex4-drift-error-and-fix.sh`.
- Observed:
  - Phase 1: Database initialized with 8-column baseline (`001-seed-populated-inquiries.sql`) and 2 rows (`Chinedu Okafor`, `Babatunde Adeleke`).
  - Phase 2: Application client query (`getAllInquiries()` with `SCHEMA_CLIENT_EXPECTS_BRANCH_CODE=1`) requested `branch_code`, which had not been migrated on that database. Failed with `SqliteError: no such column: branch_code` (`SQLITE_ERROR`, exit code `1`). This accurately demonstrated an application-query/database schema mismatch caused by unapplied migrations (not an ORM-generated client or automatic drift detection).
  - Phase 3: Applied corrective migrations (`002a`, `002b`, `002c`) to the **same** database file without deleting it. Runner skipped already-applied `001` and applied `002a-c`. Verified that existing enquiry IDs (`1` and `2`) and all displayed values survived with backfilled `branch_code = 'LAGOS-VI'`. Re-running the exact same `getAllInquiries()` query succeeded and returned both rows.
- Status: Complete. Not committed (per learner instruction).

## Step 4 — Password hashing and why fast is wrong

### Double-hash verification with independent salts (`07-hash-twice-different.txt`)
- Date: 2026-11-09.
- Requirement: Hash the same fictional test password twice using Argon2id with independent random salts. Show both complete encoded hashes, confirm they differ, verify correct password matches both, incorrect password fails, and explain why in one line.
- Action: Learner executed `(set -o pipefail; node task-04-server-security/scripts/step4-hash-twice.mjs 2>&1 | tee task-04-server-security/evidence/07-hash-twice-different.txt)`.
- Evidence: `../evidence/07-hash-twice-different.txt`, `../scripts/step4-hash-twice.mjs`.
- Observed:
  - Host: Apple M3 Pro, Node `v24.16.0`, `argon2 v0.45.2` (installed).
  - Parameters: RFC 9106 Section 7.4 Second Recommended Profile ($m=65536\text{ KiB}, t=3, p=4$, 32-byte digest).
  - Fictional test password: `"BespokeKaftan#2026!"`.
  - Hash 1: `$argon2id$v=19$m=65536,t=3,p=4$IafeEyrA1A1itEglSwvOIw$Gb/NtNsB7acXWw1iLaP6tv1zEL+J0CAh13Kj/p5Iahc`
  - Hash 2: `$argon2id$v=19$m=65536,t=3,p=4$aaJruPfqBf5JsXVaQfdd5Q$PXyd6m216vQTpZcWjRTg6Z8Z/lI9oqEXznRTBktCpq8`
  - All 5 automated verification checks passed (hashes differ, correct password verifies against both, wrong password rejected by both).
  - Explanation: Each Argon2id invocation automatically generates a fresh, cryptographically secure 16-byte random salt, ensuring identical passwords produce entirely different encoded hashes.
- Scope Note: Standalone hashing experiment completed; application database storage (`users.password_hash`) and login/signup integration remain to be implemented in subsequent steps.
- Status: Complete. Not committed (per learner instruction).

### Hardware timing benchmark: Argon2id vs SHA-256 (`08-timing-argon-vs-sha.txt`)
- Date: 2026-11-09.
- Requirement: Time Argon2id and SHA-256 on the local machine using high-resolution timer (`performance.now()`), unmetered warm-ups, repeated measurements, and record hardware, versions, iterations, total durations, average time per hash, throughput, and relative slowdown arithmetic.
- Action: Learner executed `(set -o pipefail; node task-04-server-security/scripts/step4-timing-benchmark.mjs 2>&1 | tee task-04-server-security/evidence/08-timing-argon-vs-sha.txt)`.
- Evidence: `../evidence/08-timing-argon-vs-sha.txt`, `../scripts/step4-timing-benchmark.mjs`.
- Observed:
  - Host hardware: `Hennits-Mac.local` (Apple M3 Pro, 12 logical cores, 2400 MHz, 18.00 GB RAM), Node `v24.16.0`, `argon2 v0.45.2`.
  - Execution model: Sequential hash calls (Argon2id configured with parallelism $p=4$ lanes).
  - Timer: `performance.now()` measuring elapsed wall-clock duration; logging kept outside timed sections.
  - Argon2id: 233.196 ms for 10 iterations $\rightarrow$ 23.3196 ms/hash (displayed as 23.320 ms/hash) $\rightarrow$ 42.88 hashes/sec.
  - SHA-256: 105.544 ms for 250,000 iterations $\rightarrow$ 0.000422176 ms/hash (displayed as 0.000422 ms/hash) $\rightarrow$ 2,368,683 hashes/sec.
  - Relative slowdown: Argon2id required approximately 55,237 times longer elapsed wall-clock time per hash in sequential execution on this host.
  - Rounding documented in `docs/hashing.md`. Standalone ~23 ms latency noted as standalone benchmark measurement, not proof of throughput under concurrent application load.
- Scope Note: Standalone benchmark completed; application password verification remains to be integrated.
- Status: Complete. Not committed (per learner instruction).

## Step 5 — Email normalisation and password trimming

### Email case normalisation verification (`09-email-case-normalised.png`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Register with capital/mixed-case in the email address, log in with it in lowercase, and capture both states to demonstrate server-side email normalisation.
- Action: Captured real browser interaction via Chrome DevTools Protocol (`task-04-server-security/scripts/capture-step5-evidence.mjs`) on Express port 3105 with compositing script (`task-04-server-security/scripts/composite-step5-evidence.swift`). Supported by automated test suites (`task-04-server-security/scripts/test-step5-normalisation.mjs`, 23 passing assertions; and `task-04-server-security/scripts/test-step5-http-routes.mjs`, 40 passing assertions).
- Evidence: `../evidence/09-email-case-normalised.png` (updated customer-facing capture, 435 KB), `../evidence/09-email-case-normalised-v1-internal-terms.png` (preserved earlier capture with internal terms, 441 KB), `../scripts/capture-step5-evidence.mjs`, `../scripts/test-step5-normalisation.mjs`, `../scripts/test-step5-http-routes.mjs`.
- Observed:
  - Panel 1: Registration form filled with mixed-case email `Ade.Kolawole@EXAMPLE.COM`, password `BespokeKaftan#2026!`, and name `Ade Kolawole`.
  - Panel 2: Result of logging in with all-lowercase email `ade.kolawole@example.com`. Authentication succeeded with HTTP 200, rendering `Login Successful — Nit's Cut`, normalized email `ade.kolawole@example.com`, and assigned customer role `client`.
  - Customer-facing copy in `auth.ejs` and `auth-result.ejs` uses plain language without technical jargon ("Argon2id", "cookies", "database", "Step 5"). Styling strictly adheres to CSS layout tokens (`--nc-border-width`, `--nc-radius-button`, `--nc-radius-card`, `--nc-color-error-container`) with no raw pixels.
  - Safe form input preservation: on validation errors and duplicate conflicts, safe values (`name`, `email`) are preserved in form inputs, while password fields are never echoed.
  - Accessible error feedback: added automatic keyboard focus shift to `.form-error-banner` (`role="alert"`, `tabindex="-1"`) when server errors render. Note: this verifies programmatic DOM focus behavior; no live VoiceOver/screen-reader audit was run for this step.
  - Database verification: Direct query against `users` confirmed `email` column strictly holds `ade.kolawole@example.com`.
  - Account enumeration findings: duplicate signup returns `HTTP 409 Conflict` with `"An account with this email address already exists. Please log in or request a password reset."`, directly revealing account existence. Login early-return limitation: observed in single-request measurements (~23.95 ms for known accounts executing Argon2id vs ~1.01 ms for unknown accounts skipping hashing early). Documented as an architectural limitation demonstrating the code path divergence, not a statistically established timing distribution (`docs/normalisation.md` and `docs/defects.md` limitations L-04-01, L-04-02).
  - Migration governance note: recorded that the test runner earlier executed `app/src/migrate.js` programmatically on `app/data/step5_test.db` without the learner's explicit command; no migrations were rerun thereafter.
  - Scope Note: User accounts and Argon2id hashes are persisted in the database; persistent sessions and cookie issuance remain unactivated in Step 5 (scheduled for Step 6).
- Status: Complete. Not committed (per learner instruction).

### Password whitespace trimming verification (`10-password-trim-working.png`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Register with a password containing trailing whitespace, log in without the trailing whitespace, and capture both states to demonstrate leading/trailing password trimming.
- Action: Captured real browser interaction via Chrome DevTools Protocol (`task-04-server-security/scripts/capture-step5-evidence.mjs`) on Express port 3105 with compositing script (`task-04-server-security/scripts/composite-step5-evidence.swift`). Supported by automated test suites (`task-04-server-security/scripts/test-step5-normalisation.mjs` and `task-04-server-security/scripts/test-step5-http-routes.mjs`).
- Evidence: `../evidence/10-password-trim-working.png` (updated customer-facing capture, 610 KB), `../evidence/10-password-trim-working-v1-internal-terms.png` (preserved earlier capture with internal terms, 613 KB), `../scripts/capture-step5-evidence.mjs`, `../scripts/test-step5-normalisation.mjs`, `../scripts/test-step5-http-routes.mjs`.
- Observed:
  - Panel 1: Registration form with password entered with 3 trailing spaces (`BespokeKaftan#2026!   `), with password visibility toggle activated to expose the trailing space in the input field.
  - Panel 2: Login form entering password without trailing spaces (`BespokeKaftan#2026!`), with visibility toggle showing the trimmed password.
  - Panel 3: Result view confirming authentication succeeded via Argon2id hash comparison (`Login Successful — Nit's Cut`, client `Dapo Adeleke`, role `client`).
  - Automated tests (40 assertions in `test-step5-http-routes.mjs`) confirmed that changing password capitalization fails with HTTP 401, internal spaces in multi-word passphrases are strictly preserved, terms acceptance is enforced (`HTTP 400`), role escalation attempts (`role=admin`, `is_admin=true`) are overridden to `'client'`, and rejected signups create zero database rows.
  - Scope Note: User accounts and Argon2id hashes are persisted in the database; persistent sessions and cookie issuance remain unactivated in Step 5.
- Status: Complete. Not committed (per learner instruction).

## Step 6 — Schema validation at the boundary

### HTTP validation timing benchmark: Before (Baseline) vs After (Zod) (`11-validation-timing.txt`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Install a validation library (Zod) recording reasons. Define request boundary schemas for registration, login, and reset preserving normalization, password casing, internal spaces, and length rules. Place validation after body parsing and before credential hashing, account lookup, database writes, or other business actions. Time requests before and after validation using warm-up requests and multiple measured requests, separate total request time from validation-only time, record actual results in `evidence/11-validation-timing.txt`, and author `docs/validation-placement.md` explaining placement, overhead, and investigating the classroom 2-3 second delay.
- Action & Evidence Provenance:
  - Initial Run (`2026-11-09T12:53:55.688Z`): Executed initial benchmark comparison and generated `evidence/11-validation-timing.txt`. When later updated with pre-checks and status assertions, the original verbatim capture was recovered from local transcript history (`step 4676`) and preserved as `evidence/11-validation-timing.txt` and `evidence/11-validation-timing-initial-20261109-125355.txt`.
  - Asserted Verification Run (`2026-11-09T14:46:16.229Z`): Re-run with pre-check verifying known user `ade.kolawole@example.com` credentials via Argon2id, plus HTTP status and response-result content assertions on every warm-up and measured request. Preserved under unique filename `evidence/11-validation-timing-asserted-20261109-144616.txt` and `evidence/post-zod-verification.json`. Overwrite protection added to `scripts/step6-benchmark-runner.mjs` to prevent future captures from overwriting existing evidence.
- Evidence: `../evidence/11-validation-timing.txt`, `../evidence/11-validation-timing-initial-20261109-125355.txt`, `../evidence/11-validation-timing-asserted-20261109-144616.txt`, `../evidence/baseline-timing.json`, `../evidence/post-zod-verification.json`, `../docs/validation-placement.md`, `../../app/src/schemas.js`, `../scripts/step6-benchmark-runner.mjs`.
- Observed:
  - Initial Capture (`11-validation-timing.txt` / `11-validation-timing-initial-20261109-125355.txt`):
    - Zod isolated server validation execution: Valid signup **0.0405 ms**, short password **0.0290 ms**, missing terms **0.0209 ms**, valid login **0.0322 ms**, empty password **0.0178 ms**, reset **0.0171 ms**.
    - Total HTTP request latency: Valid signup Baseline **25.963 ms** vs Zod **36.423 ms** ($\Delta +10.460\text{ ms}$, 1.40x); boundary rejections ~1.35–1.43 ms.
  - Asserted Verification Run (`11-validation-timing-asserted-20261109-144616.txt`):
    - Zod isolated server validation execution: Valid signup **0.0323 ms**, short password **0.0175 ms**, missing terms **0.0132 ms**, valid login **0.0219 ms**, empty password **0.0104 ms**, reset **0.0080 ms**.
    - Total HTTP request latency: Valid signup Baseline **25.963 ms** vs Post-Zod **25.783 ms** ($\Delta -0.180\text{ ms}$, 0.99x); valid login Baseline **28.181 ms** vs Post-Zod **25.417 ms** ($\Delta -2.764\text{ ms}$, 0.90x); boundary rejections ~0.82 ms.
  - Classroom "2-3 second delay" investigated: Isolated Zod validation overhead is ~0.01–0.04 ms. In-memory schema validation over short strings adds microsecond-scale overhead; potential hypotheses for multi-second delays in other setups include synchronous network calls (DNS MX lookups, external breached password APIs), excessive cryptographic work factors, un-indexed database queries, or ReDoS regular expressions.
  - Integrity check: Pre- and post-benchmark SHA-256 of `app/data/nits_cut.db` verified 100% identical (`cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`).
- Status: Complete. Not committed (per learner instruction).

## Step 7 — Every client-side rule, enforced again on the server

### Direct HTTP request attack before-and-after comparison (`12-direct-request-before-and-after.txt`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Take all rules from Task 3 and enforce each on the server. Repeat the exact direct HTTP request attack from Task 3 Step 8 (`POST /auth/signup` bypassing browser UI). Capture the refusal. Submit a side-by-side file (`evidence/12-direct-request-before-and-after.txt`): the request, authentic Task 3 response, and newly observed Task 4 response. Verify zero database row creation, password protection, safe field preservation, and test supporting malformed types and role escalation vectors.
- Action: Executed automated test suite `scripts/test-step7-direct-request.mjs` running against Express on port 3108 pointed to `step5_test.db`. Repeated exact curl command: `curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/x-www-form-urlencoded" --data "name=A&email=not-an-email&password=short"`. Captured HTTP response headers and body, asserted status code, verified database row count, and repeated with empty fields, malformed types (array, object, null, omitted password), and attempted role escalation (`role=admin`). Generated `evidence/12-direct-request-before-and-after.txt` and authored companion guide `docs/server-enforcement.md`.
- Evidence: `../evidence/12-direct-request-before-and-after.txt`, `../docs/server-enforcement.md`, `../scripts/test-step7-direct-request.mjs`, `../../app/src/schemas.js`, `../../app/src/server.js`.
- Observed:
  - Request 1 (Invalid values: `name=A`, `email=not-an-email`, `password=short`, terms omitted):
    - Task 3 Response (Historical 2026-11-03): **`HTTP 200 OK`**, rendered `auth-result.ejs`, echoed unvalidated inputs.
    - Task 4 Response (Current 2026-11-09): **`HTTP 400 Bad Request`**, rendered `auth.ejs` with error message *"Please enter at least two characters, including a letter, for your name."*
    - Database row count before: 21; after: 21 (**zero rows created**).
    - Password safety: Submitted password `"short"` was **never echoed** in HTML.
    - Safe field preservation: Values `"A"` and `"not-an-email"` were preserved in input value attributes.
  - Request 2 (Empty mandatory fields: `name=&email=&password=`):
    - Refused with **`HTTP 400 Bad Request`** (*"Please enter your name so we know who to address."*), **zero rows created**.
  - Supporting Malformed Types:
    - JSON array (`name: ["Ade"]`): **`HTTP 400 Bad Request`** (*"Please enter your name so we know who to address."*).
    - JSON object (`name: { first: "Ade" }`): **`HTTP 400 Bad Request`** (*"Please enter your name so we know who to address."*).
    - JSON null (`name: null`): **`HTTP 400 Bad Request`** (*"Please enter your name so we know who to address."*).
    - Omitted password: **`HTTP 400 Bad Request`** (*"Please choose a password to protect your account."*).
    - Zero rows created across all malformed type requests.
  - Attempted Privilege Escalation (`role=admin`, `is_admin=true`):
    - Returned `HTTP 201 Created` for valid credentials; schema `.transform()` stripped unauthorized properties and database record confirmed assigned role is strictly **`'client'`**.
  - Integrity check: Pre- and post-test SHA-256 of `app/data/nits_cut.db` verified 100% identical (`cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`).
- Status: Complete. Not committed (per learner instruction).

### Step 7 follow-up: recovery and order-lookup coverage (`12a-recovery-and-order-lookup-server-checks.txt`)
- Date: 2026-11-09. Isolated test database `app/data/step5_test.db`; real database untouched (SHA-256 unchanged).
- Why: the first parity audit covered only signup, login and reset. `recovery.ejs` (client rule: trimmed non-empty) and `order-lookup.ejs` (text version: digits only, empty permitted; number version: browser number, empty permitted; no required rule) were added and enforced via `RecoverySchema` and `OrderLookupSchema`.
- Action: `scripts/test-step7-recovery-order.mjs` (port 3109) sent valid, invalid, empty and malformed-type (null, array, object, number, omitted) requests. It refuses to overwrite existing evidence, and evidence 12 was not modified by it.
- Observed: 41 checks, 41 passed, including leading zeros preserved in the text version (`0042`, length 4), empty values still accepted where the client permits them, recovery codes never echoed, and no six-digit hint on rejections. Test DB row counts unchanged.
- Evidence 12 now labels the original port-3000 curl command and the actual port-3108 replay separately (same method, path, content type, payload; different test port).
- The earlier "zero gaps" claim was withdrawn in `docs/server-enforcement.md`, which now separates original Task 3 rules from Step 5 trimming changes.
- Status: Complete. Not committed.

## Step 8 — Rate limiting, and its limits

### Rate limit triggered in browser (`13-rate-limit-triggered.png`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Implement rate limiting on registration, login, and reset handlers. Choose and justify threshold and window. Trigger the limit and capture screenshot of lockout message and status code in `evidence/13-rate-limit-triggered.png`.
- Action: Executed `scripts/capture-step8-evidence.mjs` against Express on port 3112 pointed to `step5_test.db` using headless Chrome via CDP. Filled login form with email `ade.kolawole@example.com` and submitted 5 invalid login attempts, exhausting the 5-attempt/15-minute quota. Submitted attempt 6, which returned `HTTP 429 Too Many Requests`. Captured full card screenshot showing the error state.
- Evidence: `../evidence/13-rate-limit-triggered.png`.
- Observed:
  - Error banner: Renders `.form-error-banner` with `role="alert"` displaying *"Too many attempts. Please wait about 15 minutes and try again."*
  - Credential safety: Password input is completely empty (`value=""`); password is never reflected.
  - Safe field preservation: Email address `ade.kolawole@example.com` is preserved in the form input.
  - Semantic styling: Styled with design tokens (`--nc-color-error-container`, `--nc-border-width`, `--nc-radius-button`).
- Status: Complete. Not committed (per learner instruction).

### Rate limit defeated via local source-address change (`14-rate-limit-defeated.txt`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Defeat rate limiting by legitimate means from another IP address, capture trace in `evidence/14-rate-limit-defeated.txt`, author `docs/rate-limiting.md` explaining counter storage, shared networks, IP insufficiency, and alternative controls.
- Action: Executed `scripts/test-step8-rate-limits.mjs` against a single continuous Express server process on port 3110 (`RATE_LIMIT_DIAGNOSTICS=1`, `trust proxy` disabled). Tested all three endpoints, exhausted login limit from Address A (`127.0.0.1`), sent an identical login request from Address B (`192.168.1.53`, the host's own LAN interface), re-tested Address A, and tested a forged `X-Forwarded-For` header.
- Evidence: `../evidence/14-rate-limit-defeated.txt`, `../docs/rate-limiting.md`, `../scripts/test-step8-rate-limits.mjs`, `../../app/src/rateLimit.js`.
- Observed:
  - Part 1 (Threshold Triggering):
    - Signup (Limit: 5/hr): Requests 1–5 (validation failures) returned `HTTP 400` (`limiter used=1/5` to `5/5`). Request 6 returned `HTTP 429` (`Retry-After: 3600`, `RateLimit-Policy: 5;w=3600`).
    - Login (Limit: 5/15m): Requests 1–5 (wrong passwords) returned `HTTP 401` (`limiter used=1/5` to `5/5`). Request 6 returned `HTTP 429` (`Retry-After: 900`, `RateLimit-Policy: 5;w=900`).
    - Reset (Limit: 3/hr): Requests 1–3 (valid requests) returned `HTTP 200` (`limiter used=1/3` to `3/3`). Request 4 returned `HTTP 429` (`Retry-After: 3600`, `RateLimit-Policy: 3;w=3600`).
    - JSON requests with `Accept: application/json` returned structured JSON with `success: false`, `error`, and `retryAfterSeconds`.
  - Part 2 (Local Source-Address Bypass Demonstration):
    - Step 1: Address A (`127.0.0.1`) returned `HTTP 429` (`limiterKey=127.0.0.1`).
    - Step 2: Address B (`192.168.1.53`) sent the exact same request to the same running server process. Server observed distinct peer `::ffff:192.168.1.53` and limiter key `192.168.1.53`. The request was **not rate limited** and reached the handler (`HTTP 401`, `used=1/5`).
    - Step 3: Address A (`127.0.0.1`) re-sent the request and remained blocked (`HTTP 429`).
    - Forged Header Check: Request from Address A with `X-Forwarded-For: 203.0.113.77` was ignored (`trust proxy` is OFF) and remained blocked (`HTTP 429`, key `127.0.0.1`).
  - Integrity check: Database user count remained 21 (0 rows created). Real database SHA-256 confirmed 100% untouched (`cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`).
  - Scope Note: This is an authentic local multi-homed source-address demonstration, not proof of changing public WAN IP networks.
- Status: Complete. Not committed (per learner instruction).

## Step 9 — Breached password checks

### Breached password check rejection in browser (`15-breach-check-rejection.png`)
- Date: 2026-11-09.
- Target database: `app/data/step5_test.db` (**isolated test database**; real database `nits_cut.db` untouched).
- Requirement: Implement a check against a breached password service on registration only using the k-anonymity hash-prefix model. Capture rejection in `evidence/15-breach-check-rejection.png` and author `docs/breach-check.md`.
- Action: Executed `scripts/capture-step9-evidence.mjs` against Express on port 3115 pointed to `step5_test.db` using headless Chrome via CDP. Filled registration form with name `"Ade Kolawole"`, email `"ade.kolawole@example.com"`, and live-confirmed breached password `"password12345678"` (16 characters, passing local 15-character validation). Submitted the form; server queried HIBP range API with prefix `2317A` (`Add-Padding: true`), detected suffix match with count `24,881`, and returned `HTTP 400 Bad Request`. Captured card screenshot showing the rejection state.
- Evidence: `../evidence/15-breach-check-rejection.png`, `../docs/breach-check.md`, `../scripts/capture-step9-evidence.mjs`, `../scripts/test-step9-breach-check.mjs`, `../../app/src/breachCheck.js`.
- Observed:
  - Error banner: Renders `.form-error-banner` with `role="alert"` displaying *"This password has appeared in a known data breach. Please choose a different password to protect your account."*
  - Credential safety: Password input is completely cleared (`value=""`); password is never reflected or echoed in HTML.
  - Safe field preservation: Name (`"Ade Kolawole"`) and email (`"ade.kolawole@example.com"`) are preserved in form inputs.
  - Zero database writes: User count in database remained unchanged (0 accounts created).
  - Production database integrity: SHA-256 confirmed 100% bit-for-bit identical (`cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`).
- Automated Test Suite Results (`scripts/test-step9-breach-check.mjs`, 59 checks, 59 passed):
  - Live query: `"password12345678"` (16 chars) confirmed breached with observed count 24,881 at test time.
  - Live query: `"correcthorsebatterystaple"` (25 chars) confirmed breached with observed count 4,173 at test time.
  - Live query: `"NitsCut#2026-UniqueBespokePassphrase!"` (37 chars) confirmed not found in this service at test time (not an absolute security guarantee).
  - Boundary check: Short password (`"short"`) rejected by Zod schema before calling the service.
  - Unbreached registration: Passphrase not found in service produced `HTTP 201 Created` and stored Argon2id hash.
  - Route isolation: Login and reset routes do not query the external breach service.
  - Strict response validation & fail-closed tests: Simulated timeout, non-200 responses (HTTP 201, HTTP 503), mixed valid/malformed lines, and invalid counts ("0garbage", decimals, negatives, leading zero) all returned `HTTP 503 Service Unavailable` with zero accounts created.
  - Valid CRLF & trailing blank lines: Valid response with trailing blank lines succeeded with `HTTP 201 Created`.
  - Padding dummy immunity: Suffix present with `count: 0` is discarded as a dummy entry and not treated as breached.
- Fictional test fixtures vs operational logs: The passphrases printed above and in test output are test fixtures; the application's runtime operational code and server logs strictly exclude all passwords, hashes, suffixes, prefixes, and range URLs.
- Status: Complete. Not committed (per learner instruction).

## Step 10 — Email verification

### Earlier SMTP execution failures (`16-smtp-failure.txt`)
- Date: 2026-11-16.
- Recorded local execution and sandbox network-isolation failures (`ERR_MODULE_NOT_FOUND` for Nodemailer v10 ESM entry path and `EDNS getaddrinfo ENOTFOUND smtp.resend.com` inside the restricted sandbox), explicitly distinguished from remote SMTP server authentication rejections.

### Genuine Resend SMTP acceptance & inbox delivery (`17-smtp-success.txt`)
- Date: 2026-11-16.
- Transport: `smtp.resend.com:587` (`STARTTLS` required, username `resend`, domain-free sender `Nit's Cut <onboarding@resend.dev>`).
- Observed: SMTP 250 acceptance (`250 01a1e4f5-ec5f-774f-ae55-c1c3a86fc5d3`, Message ID `<bf110d0d-611b-727c-f5c7-a34a63b4678e@resend.dev>`), followed by learner confirmation of Gmail inbox delivery on 2026-11-16.

### Synchronous vs. background-job registration timing (`18-registration-timing-sync-vs-job.txt`)
- Date: 2026-11-16.
- Isolated test database `app/data/step5_test.db` using real Resend SMTP (`smtp.resend.com:587`) and designated test recipient (`d***2@gmail.com`).
- Observed (one comparison; requests also included live HIBP calls):
  - Synchronous SMTP inside `POST /auth/signup`: `3839.18 ms` (`HTTP 201`).
  - Background job async dispatch inside `POST /auth/signup`: `841.62 ms` (`HTTP 201`).

### Verified user & consumed verification code row (`19-verification-row.png`, `19-verification-row.txt`)
- Date: 2026-11-16.
- Confirmed atomic verification of test user `id=14` (`d***2@gmail.com`) in `app/data/step5_test.db`:
  - `users.email_verified_at`: `2026-11-16T16:06:54.898Z`
  - `verification_codes.id=24`, `used_at`: `2026-11-16T16:06:54.898Z`, `failed_tries: 0`, `code_hash`: `aae7b25562fc085ea1d6ebe42f5be64f33cecb0eae54a8fa7b213e20b29a0760` (64-char HMAC-SHA256 hex digest; zero plaintext code stored).

### Reused verification code rejection (`22-verification-code-reused.png`)
- Date: 2026-11-16.
- Learner observed browser result: Submitting the previously verified code a second time displayed `"This verification code has already been used."`
- Evidence `22-verification-code-reused.png` captured against the live isolated server (`http://localhost:3120/auth/verify`) reproducing that exact consumed-code state before resetting the test account for the wrong-code test.

### Wrong verification code rejection (`21-verification-wrong-code.png`)
- Date: 2026-11-16.
- Source: **User-provided browser screenshot** captured on `http://localhost:3120/auth/verify`.
- Learner observed browser result: Submitting an incorrect 6-digit code rendered `"The verification code is incorrect. Please check your email and try again."` in the accessible `.form-error-banner` (`role="alert"`), preserved the email field, and cleared the code input.
- Isolated DB confirmation: `verification_codes.id=24` (`user_id=14`) incremented `failed_tries` to `1` while leaving `used_at = NULL`.

### Expired verification code rejection (`20-verification-expired.png`)
- Date: 2026-11-16.
- Source: **User-provided browser screenshot** captured on `http://localhost:3120/auth/verify`.
- Learner observed browser result: Submitting the correct emailed 6-digit code after its 10-minute expiry window rendered `"This verification code has expired. Please request a new code."` in the accessible `.form-error-banner` (`role="alert"`), preserved the email field, and cleared the code input.

### Verified state success screen (`19a-verification-success.png`)
- Date: 2026-11-16.
- Source: **User-provided browser screenshot** captured on `http://localhost:3120/auth/verify`.
- Learner observed browser result: Submitting the fresh emailed 6-digit code displayed `"Email Verified"` (`verify-result.ejs`) with `"Verification complete for ... at 2026-11-16T17:05:12.036Z."` and the `"Continue to Sign In"` action.
- Status: Step 10 complete. Not committed (per learner instruction).

## Step 11 — Branded verification email design & copy

### Browser-rendered email preview (`23-rendered-email.png`)
- Date: 2026-11-16.
- Source: Captured via `scripts/capture-step11-email.mjs` from `buildVerificationMessage()` using a fictional account (`Ade Kolawole`) and fictional inactive code (`048291`). Zero emails were sent.
- Updates: Refreshed with documented Headline `line-height: 1.4`; earlier `line-height: 1.25` capture preserved as `23-rendered-email-v1-line-height-125.png`.
- Scope Note: Accurate **browser-rendered email preview** in headless Chromium confirming manually mapped Task 1 inline styles (`#334DAF` brand blue, `#DDE1FF`, `#001454`, `#FBF8FF`, `#FFFFFF`, `#C6C5D0`, `#1B1B21`, `#45464F`, `"Cormorant Garamond"` serif with `line-height: 1.4` + `"Manrope"` sans-serif with email fallbacks, `14px`/`8px` radii, `1px` border) and intentional email exceptions (`520px` width, monospace code)—**not** proof of Gmail or Outlook client rendering.
- Documentation: `../docs/email-copy.md` (includes learner's personal copy critique).
- Status: Complete. Not committed (per learner instruction).
