# Ongoing Defects Log — Task 4 (The Server is the Source of Truth)

> **Status: Active & Ongoing.** This document is maintained incrementally across the entirety of Task 4 (Steps 1 through 10). It records genuine defects and architectural discrepancies discovered, reproduced, remediated, or formally tracked during implementation.

---

## Defect 1: Mixed-Case Email Registration Causing Multi-Device Login Lockouts

- **Task / Step:** Step 5 (Email Normalisation & Password Trimming)
- **Component:** User Registration & Authentication (`app/src/server.js`, `app/src/db.js`, `app/src/auth.js`)
- **What the User Experienced:**
  On mobile operating systems, virtual keyboards frequently auto-capitalize the first letter of an email input (e.g. `Ade.Kolawole@example.com`). If stored verbatim in the database, subsequent login attempts from a desktop computer typing standard lowercase (`ade.kolawole@example.com`) fail, locking the customer out despite entering the correct email address.
- **How We Reproduced It:**
  Created an account in the test database with email `Ade.Kolawole@EXAMPLE.COM`. Queried the database with `WHERE email = 'ade.kolawole@example.com'`. Without normalisation, the query returned `null` and authentication failed.
- **What Changed:**
  Implemented server-side email normalisation (`normalizeEmail` in `app/src/auth.js`) that trims whitespace and converts the email to lowercase across registration, login, and reset handlers.
- **How We Checked the Fix:**
  Ran automated HTTP route test suite (`task-04-server-security/scripts/test-step5-http-routes.mjs`) Test 1. Confirmed that registering with `Folake.Balogun@EXAMPLE.COM` stored `folake.balogun@example.com` in `users.email`, and login succeeded with both lowercase and uppercase variations.
- **Evidence:**
  - Artifact: [`evidence/09-email-case-normalised.png`](../evidence/09-email-case-normalised.png)

---

## Defect 2: Clipboard Trailing Whitespace in Passwords Causing Undiagnosable Login Failures

- **Task / Step:** Step 5 (Email Normalisation & Password Trimming)
- **Component:** Authentication Handlers (`app/src/auth.js`, `app/src/server.js`)
- **What the User Experienced:**
  When users copy a generated or stored password from a password manager or text message, mobile copy-paste operations frequently append an invisible trailing space (e.g. `BespokeKaftan#2026! `). If the registration form hashes the password with the space, subsequent manual typing on login without the space fails. The user cannot see why the login failed because the space is invisible.
- **How We Reproduced It:**
  Registered an account with trailing spaces in the password. Attempted login with the intended password without spaces. Without trimming, Argon2id verification failed because hashes differ completely.
- **What Changed:**
  Implemented `normalizePassword` in `app/src/auth.js` to trim leading and trailing whitespace on both registration and login while strictly preserving internal spaces in multi-word passphrases and retaining character case sensitivity.
- **How We Checked the Fix:**
  Ran automated HTTP route test suite Test 2. Registered with `   BespokeKaftan#2026!   `, and verified that login succeeded using clean `BespokeKaftan#2026!`. Confirmed in Test 3 that wrong password casing is rejected.
- **Evidence:**
  - Artifact: [`evidence/10-password-trim-working.png`](../evidence/10-password-trim-working.png)

---

## Defect 3: Client-Side Password Length Check Mismatch with Server Trimming Policy

- **Task / Step:** Step 5 (Email Normalisation & Password Trimming)
- **Component:** Client-side Validation Engine (`app/public/js/auth.js`)
- **What the User Experienced:**
  The server trims leading/trailing whitespace before validating the 15-character minimum requirement. However, `app/public/js/auth.js` originally evaluated `Array.from(val).length >= 15` on the raw, untrimmed input. If a user entered a 14-character password preceded by a space (15 characters total), the client-side submit button became active, but the server rejected the submission with `HTTP 400 Bad Request` because after server trimming, the password was only 14 characters long.
- **How We Reproduced It:**
  Inspected `app/public/js/auth.js` lines 140–176. Observed that `isSignupPasswordValid` checked `val.trim().length > 0 && Array.from(val).length >= 15`. An input of `' ' + 'A'.repeat(14)` evaluated as true on the client, but failed the server's `validateSignupPassword`.
- **What Changed:**
  Updated `validatePassword` and `isSignupPasswordValid` in `app/public/js/auth.js` to trim whitespace *before* measuring code point length:
  `var trimmed = val.trim(); var codePoints = Array.from(trimmed).length;`
- **How We Checked the Fix:**
  Tested client-side validation logic with 14-character strings padded with outer whitespace. Confirmed the client-side error `Password must be at least 15 characters long.` displays and submit button remains inactive until 15 non-padding code points are entered.

---

## Defect 4: Server-Error Responses Discarded Safe Form Entries on Validation Failure

- **Task / Step:** Step 5 (Email Normalisation & Password Trimming)
- **Component:** Form Re-rendering (`app/src/server.js`, `app/views/auth.ejs`)
- **What the User Experienced:**
  When a customer made an error during registration (such as failing to check the Terms of Service checkbox, entering an existing email, or typing an invalid format), the server re-rendered the authentication view with an error banner but completely cleared all input fields. The customer was forced to re-type their full name and email address from scratch.
- **How We Reproduced It:**
  Submitted `POST /auth/signup` with valid name and email but without the `terms` parameter. The response re-rendered `auth.ejs` with blank input values.
- **What Changed:**
  Updated server route handlers in `app/src/server.js` to return `formData: { name, email }` on validation or conflict failures. Updated `app/views/auth.ejs` to bind `value="<%= locals.formData && formData.name ? formData.name : '' %>"` on `#signup-name`, `#signup-email`, `#login-email`, and `#reset-email`. Password input values are **strictly never echoed** back to the form (always rendered empty).
- **How We Checked the Fix:**
  HTTP route tests 3, 4, and 5 confirmed that after rejected requests (missing terms, duplicate email, wrong password), HTML responses preserve the customer's entered name and email while leaving password fields completely blank. Added automated browser check confirming `.form-error-banner` (`role="alert"`, `tabindex="-1"`) receives programmatic `.focus()` on load. Note: This verifies DOM attribute and programmatic focus behavior; no live VoiceOver or manual screen-reader retest was conducted for this step.

---

## Ongoing Architectural Limitations & Tracked Deficiencies

The following items are active, confirmed limitations observed during Step 5 testing, tracked here for resolution in subsequent steps:

1. **Limitation L-04-01: Account Enumeration on Registration (Duplicate Disclosure)**
   - *Status:* Active / Confirmed.
   - *Observed Behavior:* Attempting to register an already-registered email returns `HTTP 409 Conflict` with the explicit message: `"An account with this email address already exists. Please log in or request a password reset."` An attacker can use this endpoint to test whether a given email address possesses an account.
2. **Limitation L-04-02: Account Enumeration on Login (Early-Return Code Path)**
   - *Status:* Active / Confirmed.
   - *Observed Behavior:* When logging in with a known registered email but wrong password, the server runs Argon2id hash verification. When logging in with an unknown email address, `verifyUserCredentials` returns `null` immediately without performing a dummy hash calculation. In single-request test measurements, this difference yielded single-request elapsed wall-clock times of ~23.95 ms vs ~1.01 ms. While this single-request observation demonstrates the early-return code path divergence rather than a statistically established timing distribution, the architectural early return represents an unmitigated timing side-channel.
3. **Limitation L-04-03: Session Management Unactivated**
   - *Status:* Active.
   - *Observed Behavior:* User credentials and Argon2id password hashes are persisted in `users`, but full session management (cookie issuance, session token generation, `sessions` table tracking) is deferred to subsequent steps.
