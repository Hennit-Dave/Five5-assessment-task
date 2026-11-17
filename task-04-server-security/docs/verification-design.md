# Email Verification Design (Task 4 Step 10)

## 1. Cryptographic Code Generation & Attack Analysis

### Implementation
Verification codes are 6-digit numeric strings generated using Node.js's cryptographic pseudorandom number generator (`node:crypto`):
```javascript
crypto.randomInt(0, 1000000).toString().padStart(6, '0')
```
- **Leading Zeros Preserved:** `padStart(6, '0')` guarantees that codes such as `004219` remain 6 characters long and are never coerced to integers.
- **Why CSPRNG Is Mandatory:** Ordinary pseudorandom generators (`Math.random()`) use non-cryptographic algorithms (such as Xoroshiro128+) whose internal state can be reconstructed by an attacker after observing a small sequence of generated outputs.

### Attack Against Predictable Codes
If verification codes were generated with `Math.random()` or sequential/timestamp-seeded values, an attacker could register a few throwaway accounts, observe the codes sent to their own inbox, reconstruct the PRNG internal state, and then predict the exact 6-digit code issued to a victim's email address on the next registration—bypassing email ownership verification entirely within a single attempt, rendering both the 10-minute expiry window and the 5-attempt limit ineffective.

---

## 2. Expiry Window, Attempt Limit, Cooldown & Superseded Codes

| Parameter | Chosen Setting | Justification |
| :--- | :--- | :--- |
| **Expiry Window** | **10 minutes** | Two minutes is too short for real customers who must unlock their phone, switch apps, wait for cellular push/IMAP sync (often 30–90 seconds), and type the digits. Ten minutes provides a realistic human buffer while keeping the active attack window short. |
| **Attempt Limit** | **5 failed tries** | With $10^6$ possible 6-digit codes, 5 guesses give an attacker a $5 / 1,000,000 = 0.0005\%$ probability of guessing a live code before it locks permanently. |
| **Resend Cooldown** | **60 seconds** | Prevents users or automated scripts from flooding the Resend SMTP relay or triggering overlapping race conditions. |
| **Superseded Codes** | **Invalidated immediately** | Issuing a new code runs an `UPDATE` setting `expires_at = now` on all prior unused, unexpired codes for that `(user_id, purpose)`, ensuring only the most recent code can be used. |

---

## 3. Secure `code_hash` Storage & Atomic Consumption

### Keyed Hash Storage (`verification_codes.code_hash`)
A 6-digit code has only $1,000,000$ possible values. If `code_hash` were a plain unsalted SHA-256 digest, an attacker who obtained a read-only copy of `verification_codes` could precompute all 1,000,000 hashes in milliseconds and recover every live code.

Therefore, [`app/src/verification.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/src/verification.js) stores a **keyed HMAC-SHA-256** digest bound to a required private server secret (`VERIFICATION_HMAC_SECRET`, minimum 32 characters, stored only in the ignored `.env` file with no hardcoded fallback), `user_id`, `purpose`, and `created_at`:
```javascript
crypto.createHmac('sha256', secret).update(`${userId}:${purpose}:${createdAt}:${code}`).digest('hex')
```
Plaintext codes are **never** stored in the database and **never** written to server logs. `assertVerificationSecretConfigured()` validates the secret before accepting registrations or creating verification records. Note: any verification codes issued prior to configuring the private secret in `.env` are no longer verifiable and require issuing a fresh code.

### Atomic Consumption (`used_at` + `email_verified_at`)
Verification runs inside a single SQLite transaction (`db.transaction(...)`):
1. Rejects immediately if `used_at IS NOT NULL` (`CODE_REUSED`), `expires_at <= now` (`CODE_EXPIRED`), or `failed_tries >= 5` (`ATTEMPTS_EXHAUSTED`).
2. Compares digests with `crypto.timingSafeEqual`. On mismatch, increments `failed_tries`.
3. On match, executes a conditional update:
   ```sql
   UPDATE verification_codes
   SET used_at = ?
   WHERE id = ? AND used_at IS NULL AND expires_at > ? AND failed_tries < ?
   ```
   If `changes !== 1` (concurrent submission race), the transaction aborts. Otherwise, it updates `users.email_verified_at` in the same transaction.

---

## 4. Background Email Delivery, Retries & Restart Behaviour

### Decoupled Delivery (`app/src/email.js`)
Verification emails are sent via **Resend SMTP** (`smtp.resend.com`, port `587`, `STARTTLS` required, username `resend`) using Nodemailer.
- **Background Queue:** `POST /auth/signup` issues the code and enqueues `enqueueVerificationEmail(...)` asynchronously via `setImmediate`, returning `HTTP 201` immediately.
- **Retries:** Transient SMTP errors trigger up to **3 total attempts (1 initial attempt + 2 retries)** with exponential backoff (`500 ms`, `1,000 ms`).
- **Failure Handling:** If all 3 total attempts fail, the error is logged with API keys redacted (`[REDACTED_API_KEY]`) and the HTTP server continues running normally. The user can click **Resend Code** on `/auth/verify` after the 60-second cooldown.
- **Strict Recipient Allowlist:** `assertRecipientAllowed()` enforces `TEST_RECIPIENT_EMAIL` at the actual email-sending boundary (`sendVerificationEmail` and `enqueueVerificationEmail`) before any SMTP connection is opened. Neither `NODE_ENV` nor `EMAIL_DELIVERY_MODE` can bypass this check.
- **Restart Limitations:** Because the prototype queue runs in Node.js memory (`pendingJobs`), any queued or retrying email job in flight during a server crash or process restart is lost. Production deployments replace this with a persistent database-backed job table or Redis queue.

### One Observed Timing Comparison: Synchronous vs. Background Job
Measured once against `app/data/step5_test.db` using real Resend SMTP (`smtp.resend.com:587`) and designated test recipient (`evidence/18-registration-timing-sync-vs-job.txt`). Both requests also included live HIBP breached-password lookups and Argon2id hashing:
- **Synchronous SMTP inside request:** `3839.18 ms` (HTTP 201)
- **Background job (async dispatch):** `841.62 ms` (HTTP 201)
- **Observed Difference:** `2997.57 ms` difference in this single observed comparison (not a guaranteed constant speedup across varying network conditions).

---

## 5. Resend Domain-Free Sender Restriction & Provisional Email Styling

- **Sender Restriction:** This prototype uses Resend's domain-free test sender `Nit's Cut <onboarding@resend.dev>`. Per Resend policy, `onboarding@resend.dev` is **strictly restricted to sending test emails to the email address registered to the Resend account owner** (`TEST_RECIPIENT_EMAIL`), and **cannot** be used for general customer email delivery. General customer delivery requires verifying a custom domain (with SPF, DKIM, and DMARC DNS records) in Resend.
- **Provisional Email Styling:** The current inline HTML template in `app/src/email.js` is provisional for Step 10. Matching the brand blue (`#334DAF`) alone does not prove all email styling comes from Task 1 tokens; full branded email design and token verification belong to Step 11.

---

## 6. Observed Browser & Database Verification Evidence

- **Database Row (`evidence/19-verification-row.png`, `19-verification-row.txt`):** Captured from isolated `app/data/step5_test.db` confirming `users.email_verified_at` and `verification_codes.used_at` updated atomically (`2026-11-16T16:06:54.898Z`) with only `code_hash` stored.
- **Verified State Screen (`evidence/19a-verification-success.png`, user-provided screenshot):** Submitting a fresh emailed 6-digit code displayed `"Email Verified"` (`verify-result.ejs`) with confirmation timestamp `2026-11-16T17:05:12.036Z`.
- **Expired Code (`evidence/20-verification-expired.png`, user-provided screenshot):** Submitting the correct emailed code after its 10-minute expiry window displayed `"This verification code has expired. Please request a new code."`.
- **Wrong Code (`evidence/21-verification-wrong-code.png`, user-provided screenshot):** Submitting an incorrect 6-digit code displayed `"The verification code is incorrect. Please check your email and try again."` and incremented `failed_tries` to `1`.
- **Reused Code (`evidence/22-verification-code-reused.png`):** Re-submitting an already-consumed code displayed `"This verification code has already been used."` (observed by learner in browser and captured on the live isolated server).
