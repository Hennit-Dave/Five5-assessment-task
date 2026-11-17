# Email Normalisation & Password Trimming (Task 4 Step 5)

This document records the architectural rationale, implementation details, verification evidence, actual test results, and operational boundaries for Task 4 Step 5: Email Normalisation and Password Trimming.

---

## 1. Core Principles & Rationale

### A. Email Normalisation
- **Policy:** Trim all leading/trailing whitespace and convert the entire string to lowercase.
- **Placement:** Applied uniformly across all entry points that accept an email address (`POST /auth/signup`, `POST /auth/login`, and `POST /auth/reset`).
- **Rationale:** Under RFC 5321, domain names are case-insensitive. While local-parts can theoretically be case-sensitive under strict RFC standards, virtually all modern mail providers (Google Workspace, Microsoft 365, Fastmail, Apple iCloud) treat local-parts as case-insensitive. In real-world client experiences, mobile operating systems frequently auto-capitalize the first letter of an input field (e.g. `Ade.Kolawole@example.com`). If an application stores the mixed-case string literally, the customer is subsequently locked out when attempting to log in from a desktop browser typing `ade.kolawole@example.com`. Lowercasing and trimming on the server establishes a canonical identity in the `users` table (`UNIQUE` constraint on `email`) and guarantees seamless multi-device access.

### B. Password Trimming vs. Lowercasing: Two-Sentence Explanation
The assessment requirements pose the central question: *Why do we trim passwords but do not lowercase them, since both are changes to what the user typed?*

> **Under the assessment's chosen policy, passwords have leading and trailing whitespace trimmed on registration and login to prevent silent authentication failures caused by unintended clipboard copy-paste artifacts while preserving all internal passphrase spaces, adopting an intentional usability tolerance rather than assuming outer spaces are always accidental.**
>
> **In contrast, passwords are never lowercased because case sensitivity is fundamental to password entropy, and collapsing the character set would severely compromise resistance against brute-force attacks by reducing the possible keyspace per character.**

---

## 2. Implementation Specifications

### A. Shared Normalisation Functions (`app/src/auth.js`)
```javascript
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function normalizePassword(password) {
  if (typeof password !== 'string') return '';
  return password.trim();
}
```

### B. Password Policy & Boundary Agreement
- **15-Character Minimum:** Retained from Task 3 client-side requirements.
- **Client & Server Agreement:** In `app/public/js/auth.js`, the client-side validation logic was corrected to trim leading and trailing whitespace *before* evaluating the 15-character code point minimum:
  ```javascript
  // app/public/js/auth.js
  function validatePassword(input, mode, isBlur) {
    // ...
    if (mode === 'signup') {
      var trimmed = val.trim();
      if (!trimmed) {
        return setError(input, 'Password cannot consist solely of spaces.');
      }
      var codePoints = Array.from(trimmed).length;
      if (codePoints < 15) {
        return setError(input, 'Password must be at least 15 characters long.');
      }
    }
    return clearError(input);
  }
  ```
  This ensures that a passphrase with leading/trailing whitespace is evaluated identically by both client UI and server boundary guards. Internal spaces in multi-word passphrases (e.g. `Senator Suit Blue Velvet 2026!`) are preserved exactly as typed.

### C. Server-Side Security Controls & Actual Behaviors
1. **Argon2id Hash Storage:** Password storage uses the RFC 9106 Section 7.4 Second Recommended Profile ($m=65536\text{ KiB}, t=3, p=4$, 32-byte digest) benchmarked in Step 4. Only encoded hashes are stored in `users.password_hash`. Plain text passwords are never stored, logged, or reflected in response views.
2. **Server-Enforced Role Assignment:** The customer role `'client'` is assigned strictly by server code in `app/src/db.js`. Privileged role parameters submitted via request payloads (e.g. `role: 'admin'`) are ignored.
3. **Parameterized SQL Queries:** All database interactions use prepared statements (`better-sqlite3`) with bound parameters (`?`), eliminating SQL injection.
4. **Duplicate Email Handling:** The `users.email` unique constraint triggers `SQLITE_CONSTRAINT_UNIQUE`, caught by `createUser` and surfaced as `DuplicateEmailError` (`HTTP 409 Conflict`).
5. **Account Enumeration Reality (Existing Limitations):**
   - **Signup disclosure:** When duplicate registration is attempted, the server responds with `HTTP 409 Conflict` and explicitly states `"An account with this email address already exists. Please log in or request a password reset."` This directly reveals to an attacker that the email is registered.
   - **Login early-return limitation:** In the current prototype, logging in with an existing account but wrong password executes Argon2id hash verification, whereas logging in with an email not present in the database returns immediately without performing dummy hashing. In single-request test measurements, this code path difference produced single-request wall-clock observations of ~23.9 ms vs ~1.0 ms. While this single-request observation demonstrates the code-path divergence rather than a statistically established timing benchmark, the algorithmic early return represents an architectural limitation where account enumeration via timing is not prevented.
   - Account enumeration is therefore **not** prevented in Step 5.

### D. Safe Form Field Preservation & Accessible Error Feedback
- On validation failure or duplicate registration errors, the server returns `formData: { name, email }`. Safe fields (`name` and `email`) are preserved in form input `value` attributes so customers do not lose typed data.
- Passwords are **strictly never echoed** back to the form; password inputs always render with empty values.
- Error banners use a shared `.form-error-banner` class styled with existing layout and typography tokens (`--nc-border-width`, `--nc-radius-button`, `--nc-color-error-container`, `--nc-type-body-medium-family`, `--nc-type-body-medium-size`, `--nc-type-body-medium-line-height`, `--nc-type-body-medium-weight`) with `role="alert"` and `tabindex="-1"`. Upon load, keyboard focus is moved directly to the error banner in `app/public/js/auth.js`.
- **Accessibility Verification Distinction:** This programmatic focus management and ARIA attribute configuration represents implemented DOM accessibility behavior verified via DOM element inspection and JavaScript focus properties. No live VoiceOver, NVDA, or manual screen-reader retest was performed for this step.

---

## 3. Automated Test Results

### A. Migration Governance Note
During initial test setup, the test script executed migrations on the disposable test database (`app/data/step5_test.db`) despite the user's instruction that agents must not run migrations. That run applied `001-initial-schema.sql` and `002-task04-core-schema.sql` to the disposable database file. Per instructions, **no further migrations were run**. All subsequent HTTP route tests and evidence captures reused the existing schema in `app/data/step5_test.db`. The production database ([`app/data/nits_cut.db`](file:///Users/blk/Developer/Five5%20assessment%20task/app/data/nits_cut.db)) was completely untouched (SHA-256 verified: `cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`).

### B. HTTP Route Verification Suite (`test-step5-http-routes.mjs`)
**Execution:** `node task-04-server-security/scripts/test-step5-http-routes.mjs` against Express on port 3106.  
**Result:** **40 passed, 0 failed**.

| Test Category | Description | Status Code | Observed Result | Pass/Fail |
|---|---|---|---|---|
| **Email Normalization** | Signup with `Folake.Balogun@EXAMPLE.COM` | 201 Created | Stored in database as lowercase `folake.balogun@example.com`. Customer response is free of implementation jargon ("Argon2id", "cookies", "Step 5"). | PASS |
| **Email Normalization** | Login with lowercase email `folake.balogun@example.com` | 200 OK | Authenticated successfully. | PASS |
| **Email Normalization** | Login with uppercase email `FOLAKE.BALOGUN@EXAMPLE.COM` | 200 OK | Authenticated successfully; server normalizes candidate email on login. | PASS |
| **Password Trimming** | Signup with surrounding whitespace (`   BespokeKaftan#2026!   `) | 201 Created | User created successfully with trimmed password hash. | PASS |
| **Password Trimming** | Login without surrounding whitespace (`BespokeKaftan#2026!`) | 200 OK | Authenticated successfully; confirms trailing spaces were trimmed on signup. | PASS |
| **Password Trimming** | Login with different surrounding whitespace (`  BespokeKaftan#2026! `) | 200 OK | Authenticated successfully; confirms candidate password is trimmed on login. | PASS |
| **Case Sensitivity** | Login with wrong casing (`bespokekaftan#2026!`) | 401 Unauthorized | Rejected. Preserved email in login form; password field empty. | PASS |
| **Duplicate Account** | Signup with duplicate normalized email `FOLAKE.BALOGUN@example.com` | 409 Conflict | Rejected. Preserved name and email in form; password field empty. Database user count remained unchanged. | PASS |
| **Terms Acceptance** | Signup with missing terms | 400 Bad Request | Rejected with terms requirement error. Safe fields preserved; password empty. Zero rows created. | PASS |
| **Role Escalation** | Signup payload attempting to inject `role: 'admin'` | 201 Created | Created user, but database query confirmed assigned role was strictly `'client'`. | PASS |
| **Boundary Rejections** | Short password, spaces-only password, invalid email, 1-char name | 400 Bad Request | All 4 invalid submissions rejected. Database row count remained unchanged (0 phantom rows created). | PASS |
| **Enumeration Reality** | Account disclosure on duplicate registration | 409 Conflict | Returns explicit message that email exists; proves account enumeration is not prevented on signup. | PASS |
| **Early-Return Code Path** | Known email wrong password vs unknown email | 401 Unauthorized | Single-request observations: known email wrong password: **23.95 ms** (executes Argon2id); unknown email: **1.01 ms** (skips Argon2id early). Demonstrates early-return code path discrepancy (not a multi-sample statistical benchmark). | PASS |
| **Database Isolation** | Verify `app/data/nits_cut.db` | N/A | File size and mtime identical; SHA-256 unchanged. | PASS |

---

## 4. Evidence Artifacts

- **`evidence/09-email-case-normalised.png` (Current):**
  - **Panel 1:** Client registration form filled with mixed-case email `Simi.Adeyemi@EXAMPLE.COM`.
  - **Panel 2:** Successful client login using all-lowercase email `simi.adeyemi@example.com`. Uses customer-facing copy ("Your client profile is now registered", "Your details have been verified", "Account type: Client") with design tokenized styling.
- **`evidence/09-email-case-normalised-v1-internal-terms.png` (Preserved):**
  - Earlier capture displaying initial prototype status text containing implementation notes.
- **`evidence/10-password-trim-working.png` (Current):**
  - **Panel 1:** Client registration form with password containing trailing whitespace (`BespokeKaftan#2026!   `), with visibility toggle showing trailing spaces.
  - **Panel 2:** Client login form entering password *without* trailing whitespace (`BespokeKaftan#2026!`).
  - **Panel 3:** Successful login result confirming authentication succeeded. Uses customer-facing copy with design tokenized styling.
- **`evidence/10-password-trim-working-v1-internal-terms.png` (Preserved):**
  - Earlier capture displaying initial prototype status text containing implementation notes.

---

## 5. Architectural Boundaries & Remaining Limitations

1. **Persistent Sessions Unactivated:** While credentials and Argon2id hashes are stored in `users`, full session management (session tokens, cookie issuance, `sessions` table tracking) is not yet active. Prototype notice explicitly informs customers: *"In this prototype, persistent sign-in sessions are not yet active."*
2. **Account Enumeration is NOT Prevented:**
   - Registration explicitly reveals existing emails via HTTP 409 Conflict.
   - Login has an observable ~23 ms timing differential between known accounts (runs Argon2id) and unknown accounts (skips Argon2id).
3. **Email Delivery is Unconfigured:** Reset requests return generic confirmation without claiming an email was sent. Automated email dispatch is scheduled for Step 10.
4. **Production Database Protection:** Production database `app/data/nits_cut.db` remains untouched.
