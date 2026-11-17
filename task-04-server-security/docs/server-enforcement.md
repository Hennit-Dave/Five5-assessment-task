# Server-Side Enforcement of Client Validation Rules (Task 4 Step 7)

This document provides a comprehensive rule-by-rule comparison between the client-side validation rules established in Task 3 ([`task-03-client-validation/docs/validation-rules.md`](../../task-03-client-validation/docs/validation-rules.md)) and their authoritative backend enforcement in Task 4 via Zod request boundary schemas ([`app/src/schemas.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/schemas.js)) and Express controllers ([`app/src/server.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/server.js)).

It accompanies the empirical attack repetition evidence recorded in [`evidence/12-direct-request-before-and-after.txt`](../evidence/12-direct-request-before-and-after.txt).

---

## 1. Architectural Philosophy: The Server is the Source of Truth

In Task 3 Step 8, we proved that client-side validation is solely an interface convenience. By issuing direct HTTP POST requests with `curl`, an attacker completely bypassed browser JavaScript, allowing malformed names (`"A"`), invalid emails (`"not-an-email"`), short passwords (`"short"`), and unchecked terms to reach the server. The Task 3 prototype server blindly accepted the payload with `HTTP 200 OK`.

In Task 4 Step 7, we enforce the core security axiom: **The server is the authoritative source of truth**. Every business constraint, structural rule, and sanity check evaluated in the browser must be evaluated again at the server boundary immediately after body parsing, before any business logic, password hashing, or database transactions occur.

---

## 2. Rule-by-Rule Parity Matrix

The table below maps every validation rule across the four categories from Task 3 to its server-side implementation in Task 4:

| Form & Field | Task 3 Client Rule | Task 4 Server Enforcement | Parity Status | Implementation Details & Error Messages |
|---|---|---|---|---|
| **Signup: Full Name** (Empty Check) | Trimmed value must not be empty on blur. | `z.string().refine(raw => raw.trim().length > 0)` | **Full Parity** | Returns: *"Please enter your name so we know who to address."* Rejects omitted, null, or empty string. |
| **Signup: Full Name** (Length & Structure) | Minimum 2 characters; must contain at least one Unicode letter (`\p{L}`). Mononyms permitted. | `.transform(v => v.trim()).refine(t => t.length >= 2 && /\p{L}/u.test(t))` | **Full Parity** | Returns: *"Please enter at least two characters, including a letter, for your name."* Mononyms (e.g. "Sade") pass; single letters ("A") or pure punctuation ("--") fail. |
| **Signup: Email** (Empty Check) | Trimmed value must not be empty. | `z.string().refine(raw => raw.trim().length > 0)` | **Full Parity** | Returns: *"Please enter your email address."* |
| **Signup: Email** (Canonical Normalization) | None on client (raw input typed by user). | `.transform(v => normalizeEmail(v))` | **Enhanced (Server)** | Trims surrounding whitespace and lowercases string (`folake@example.com`). |
| **Signup: Email** (Format Regex) | Evaluated live on `input` via `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. | `.refine(v => EMAIL_REGEX.test(v))` | **Full Parity** | Returns: *"Please enter a valid email address (e.g. name@example.com)."* |
| **Signup: Password** (Empty Check) | Value must not be empty. | `z.string().refine(raw => raw.length > 0)` | **Full Parity** | Returns: *"Please choose a password to protect your account."* |
| **Signup: Password** (Outer Whitespace Trim) | Preserved raw on client. | `.transform(v => normalizePassword(v))` | **Enhanced (Server)** | Step 5 policy: Trims only leading/trailing whitespace; strictly preserves internal spaces. |
| **Signup: Password** (All-Whitespace Check) | Password consisting solely of spaces rejected. | `.refine(t => t.length > 0)` | **Full Parity** | Returns: *"Password cannot consist solely of spaces."* |
| **Signup: Password** (Length Threshold) | Minimum 15 Unicode code points (`Array.from(v).length >= 15`). | `.refine(t => Array.from(t).length >= 15)` | **Full Parity** | Returns: *"Password must be at least 15 characters long."* Multi-byte emoji & surrogate pairs counted accurately. |
| **Signup: Terms of Service** | Checkbox must be checked (`terms === 'on'`). | `z.unknown().transform(...).refine(v => v === true)` | **Full Parity** | Returns: *"You must agree to the Terms of Service to create an account."* Rejects omitted, false, or empty terms. |
| **Signup: Role Assignment** | N/A (browser form does not expose role input). | `SignupSchema.transform(data => ({ ...data, role: 'client' }))` | **Security Enhancement** | Schema strips client-injected parameters (`role=admin`, `is_admin=true`) and strictly enforces `'client'`. |
| **Login: Email** (Empty Check) | Trimmed value non-empty on blur. | `z.string().refine(raw => raw.trim().length > 0)` | **Full Parity** | Evaluated in `LoginSchema`. |
| **Login: Email** (Canonical Normalization) | None on client. | `.transform(v => normalizeEmail(v))` | **Enhanced (Server)** | Automatically trimmed and lowercased before database user lookup. |
| **Login: Email** (Format Regex) | Evaluated strictly on submit. | `.refine(v => EMAIL_REGEX.test(v))` | **Full Parity** | Evaluated in `LoginSchema`. |
| **Login: Password** (Empty Check) | Value non-empty (`length > 0`). Does NOT enforce 15 characters. | `.refine(raw => raw.length > 0)` then Step 5 trim and non-empty re-check | **Parity plus a Step 5 difference** | Does NOT enforce 15 characters. A spaces-only password was non-empty under the original Task 3 rule but is now rejected after trimming. |
| **Login: Failure Response** | Client displays field-level inline error. | Server returns `HTTP 401 Unauthorized` with generic message. | **Intentional Difference** | Returns generic: *"Invalid email or password."* Prevents credential structure leakage. |
| **Reset: Email** (Empty & Format) | Evaluated on submit via format regex. | `ResetSchema` enforces normalization & regex. | **Full Parity** | Empty/invalid returns `HTTP 400 Bad Request`; valid returns generic confirmation. |

---

## 3. Intentional Differences Between Client and Server

While functional parity is achieved across all validation constraints, five intentional architectural differences exist between client-side UX and server-side security:

### 1. Synchronous Boundary Validation vs. Asynchronous Interactive UX
- **Client Behavior:** Provides progressive, contextual feedback. Signup email format is evaluated in real time on `input`, empty fields warn on `blur`, and submit buttons dynamically toggle between `aria-disabled="true"` and active states.
- **Server Behavior:** Evaluates all submitted fields atomically in a single synchronous pass upon HTTP POST receipt. The server does not maintain intermediate UI states; it either accepts the payload or rejects it with an explicit HTTP status code.

### 2. Login Failure Feedback Specificity
- **Client Behavior:** If a user submits an empty password on the login form, the client highlights the specific password field with *"Please enter your password."*
- **Server Behavior:** If a login request reaches the server with a missing password, invalid email format, or incorrect credentials, the server consistently returns **`HTTP 401 Unauthorized`** with the generic message:
  ```
  "Invalid email or password."
  ```
  *Security Justification:* Disclosing whether the email was malformed vs. the password was empty at the HTTP boundary provides automated enumeration bots with reconnaissance data regarding authentication internal logic. Returning a generic 401 is standard authentication hardening.

### 3. Password Outer Whitespace Trimming
- **Client Behavior:** In Task 3, client JavaScript validated raw passwords without modification.
- **Server Behavior:** Following Task 4 Step 5 requirements, the server canonicalizes passwords by trimming leading and trailing whitespace (`normalizePassword()`) before evaluating the 15-character length threshold and hashing with Argon2id. This resolves the common user defect where copying credentials from a password manager or clipboard accidentally captures a trailing space. All internal spaces (e.g. multi-word passphrases) and letter casing remain strictly preserved.

### 4. Parameter Stripping & Role Escalation Defense
- **Client Behavior:** Legitimate browser forms never render an input for `role` or `is_admin`.
- **Server Behavior:** An attacker sending direct HTTP requests can inject arbitrary form-encoded or JSON fields (e.g. `role=admin`, `is_admin=true`). Zod object schemas strip undeclared keys by default, and `SignupSchema.transform()` explicitly assigns the customer role:
  ```javascript
  role: 'client'
  ```
  Even if an attacker submits `role=admin`, the server ignores it and persists the account as `'client'`.

### 5. Robust Handling of Malformed Non-String Types
- **Client Behavior:** Browser HTML form inputs naturally serialize values as strings or omitted keys.
- **Server Behavior:** Direct HTTP clients and API fuzzers can send unexpected types in JSON bodies (e.g. `name: ['Ade']`, `name: { first: 'Ade' }`, or `name: null`). Zod 4 schemas reject non-string inputs at the boundary, returning understandable guidance rather than leaking internal runtime type exceptions (`"expected string, received array"`).

---

## 4. Recovery and Order-Lookup Rules (added after inspecting `recovery.ejs` and `order-lookup.ejs`)

The first audit covered only signup, login and reset. Task 3 also shipped two demonstration forms with their own client rules. Enforcement is in `RecoverySchema` and `OrderLookupSchema` ([`app/src/schemas.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/schemas.js)), wired into `POST /auth/recovery` and `POST /orders/lookup` in [`server.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/server.js).

| Form | Actual client rule (from the view source) | Server enforcement | Status |
|---|---|---|---|
| **Recovery** (`recovery_code`) | Inline script: `input.value.trim()` must be non-empty, else *"Please enter the code from your recovery message."* No length, digit or format rule. | `RecoverySchema`: string, trimmed, non-empty. Same generic message. Non-string, null, array, object, omitted → 400 with the same message. | **Full parity.** Newly enforced in this step; previously the server accepted anything. |
| **Order lookup, text version** (`order_ref`) | `pattern="[0-9]*"` (not enforced by the browser under a bare POST to a form without `required`) plus an `input` handler that strips non-digits. **Empty is permitted.** | Empty or digits only (`/^[0-9]*$/`). Kept as a string, so `0042` stays `0042`. Non-digits, signs, decimals → 400. | **Parity.** No required-field rule invented. |
| **Order lookup, number version** | `type="number"`, default value `0`, **no `required`**, no script. Browsers submit an empty string or a valid floating-point string. | Empty or a valid HTML floating-point string (`-?(\d+\|\d*\.\d+)([eE][-+]?\d+)?`). Raw string kept, no numeric coercion at the boundary. Other text → 400. | **Parity** with what a browser can submit. |
| **Order lookup, `version` hidden field** | Hidden input, always `number` or `text`. | Must be exactly `number` or `text`; missing or other values → 400. | **Server-only rule** (a direct request can omit or forge a hidden field). |
| Both | Browser forms only send strings. | Null, array, object, number, omitted fields → 400 with plain wording (no internal type text). | **Server-only rule.** |

Recovery guidance stays generic: no six-digit hint, the submitted code is never echoed, and the prototype notice still says no recovery verification exists. Nothing here verifies a recovery code.

Intentional limits: the order-lookup result page only reflects what was submitted; there is still no real order lookup, and the demonstration's purpose (showing that `type="number"` loses leading zeros in the browser) is unchanged.

Actual direct-request results are in [`evidence/12a-recovery-and-order-lookup-server-checks.txt`](../evidence/12a-recovery-and-order-lookup-server-checks.txt) (41 checks, isolated test database, separate from evidence 12).

---

## 5. Gap Analysis & Edge Cases (corrected)

The earlier claim of "zero gaps" was made before recovery and order lookup were audited and is withdrawn. The complete audit finds:

### Original Task 3 rules vs. Step 5 trimming changes
These must not be conflated:

- **Original Task 3 rules** (from `validation-rules.md`): non-empty trimmed name/email; name ≥ 2 characters with a letter; email regex; signup password ≥ 15 code points and not all spaces; login password non-empty; terms checked; recovery trimmed non-empty; order lookup as above.
- **Step 5 changes (assessment policy, later than Task 3):** the server trims leading/trailing whitespace from passwords on signup and login, and `auth.js` was updated to trim before the length check. Consequences compared with the original Task 3 behaviour: a signup password of 14 characters plus a trailing space passed the original rule (15 code points) but is now rejected; a login password of only spaces was non-empty originally and is now rejected. This is the assessment's chosen policy, not an assumption that surrounding spaces are always accidental. Email lowercasing is also a Step 5 addition.

### Remaining gaps and differences
1. **Client-only behaviours are not server rules:** button active/inactive state, double-submit lock, progressive hints, blur/live timing, focus recovery. These are interface conveniences and are intentionally not replicated.
2. **Login responses differ:** the client shows field-specific messages; the server answers every login failure with one generic 401 message.
3. **Not independently verified:** whether every Unicode edge case in the client name/password length checks matches the server's (both use `String.length` for names and code points for passwords by source inspection; no cross-browser comparison was run).
4. **Recovery and order lookup are demonstrations:** they validate shape only. No recovery verification, rate limiting or order database exists.
5. **Enumeration realities (Step 5):** duplicate signup returns 409; login for unknown accounts skips Argon2id verification (single-request observations, not a statistically established timing difference).
- **Form error accessibility:** server rejections re-render with `.form-error-banner` (`role="alert"`) and keep safe fields; passwords and recovery codes are not echoed. Screen-reader behaviour of the new recovery and order-lookup banners was not tested.

---

## 6. Direct Request Attack Verification ([`evidence/12-direct-request-before-and-after.txt`](../evidence/12-direct-request-before-and-after.txt))

Port note: the original Task 3 command targeted `http://localhost:3000`; the Task 4 replay targeted the isolated test server on port `3108`. Method, path, content type and payload are the same; only the test port differs (and the replay was sent with Node `fetch`, not the curl binary).

To empirically verify server enforcement, we executed [`task-04-server-security/scripts/test-step7-direct-request.mjs`](file:///Users/blk/Developer/Five5%20assessment%20task/task-04-server-security/scripts/test-step7-direct-request.mjs), repeating the exact curl attack from Task 3 Step 8:

```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "name=A&email=not-an-email&password=short"
```

### Observed Results:
1. **Refusal Status:** Returned **`HTTP 400 Bad Request`** (Task 3 returned `HTTP 200 OK`).
2. **Refusal Feedback:** Triggered immediate validation rejection: *"Please enter at least two characters, including a letter, for your name."*
3. **Database Integrity:** Exactly **0 database rows** created (verified via SQLite `SELECT COUNT(*)` before and after).
4. **Credential Protection:** Password `"short"` was completely omitted from the response HTML.
5. **Supporting Attacks:**
   - Empty mandatory fields (`name=&email=&password=`): Refused with `HTTP 400 Bad Request` (0 rows created).
   - Malformed types (JSON array, object, null, omitted password): All refused with `HTTP 400 Bad Request` (0 rows created).
   - Privilege escalation attempt (`role=admin`): Injected role stripped; persisted account assigned role `'client'`.
6. **Real Database Protection:** Production database [`app/data/nits_cut.db`](file:///Users/blk/Developer/Five5%20assessment%20task/app/data/nits_cut.db) confirmed 100% untouched (`SHA-256: cc94f733c7d564f1ba837834ed6f01a4611957cf8f43d873e14bee4bad3e882d`).
