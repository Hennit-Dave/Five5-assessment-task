# Security Controls Not Implemented Yet (Task 4 Step 12)

> **Status:** Approved deferrals for this local assessment prototype.
> **Scope Note:** This document distinguishes **essential pre-production work** (required before Nit's Cut goes live to real customers) from **optional or scale-driven controls** deferred because of the current prototype's stage, size, or operational complexity. Controls already implemented in Task 4 (Argon2id hashing, email/password normalization, Zod boundary validation, IP rate limiting, HIBP breached-password checks, and cryptographic 6-digit email verification) are not listed here.

---

## Category A: Essential Pre-Production Work (Deferred Prototype Limitations)

### 1. Persistent Login Sessions & Secure Session Cookies
- **What it does:** Keeps a customer signed in across page requests by generating a random session token, storing its hash in our existing `sessions` table, and setting an `HttpOnly`, `Secure`, `SameSite=Lax` cookie on the browser.
- **Why it is currently deferred:** The Task 4 prototype focuses on registration, credential verification, and boundary security. Protected customer pages (such as viewing personal orders, tailoring measurements, or managing account details) are not built yet, and `POST /auth/login` currently renders a static confirmation view without issuing a session cookie.
- **When it must be added:** Before any user-specific or protected route is added to the portal (required for production launch).

### 2. CSRF (Cross-Site Request Forgery) Protection
- **What it does:** Validates a server-issued CSRF token (or strict origin/fetch-metadata check alongside `SameSite` cookies) on state-changing `POST` requests so an external website cannot silently submit requests using a victim's browser.
- **Why it is currently deferred:** CSRF protection for authenticated user actions is pending the introduction of cookie-authenticated sessions (Control 1). Note that the absence of login cookies does **not** eliminate all cross-site request risks—an outside page can still trigger unauthenticated `POST` requests (such as form submissions or verification resends), which today are mitigated only by rate limiting rather than anti-CSRF tokens.
- **When it must be added:** Immediately alongside persistent login cookies and any state-changing authenticated actions (required for production launch).

### 3. HTTPS / TLS Deployment
- **What it does:** Encrypts all HTTP traffic in transit between the customer's browser and the Nit's Cut server using TLS certificates, preventing passive eavesdropping or tampering on public Wi-Fi and ISP networks.
- **Why it is currently deferred:** This prototype runs strictly on `http://localhost` during local development and assessment testing, with no public domain, cloud load balancer, or TLS certificate provisioned.
- **When it must be added:** Before deploying Nit's Cut to any public staging or production URL (required for production launch; passwords and verification codes must never cross the public internet in plaintext HTTP).

### 4. Security HTTP Headers (`helmet`, CSP, HSTS, `X-Frame-Options`)
- **What it does:** Adds protective response headers—such as `Content-Security-Policy` (restricting where scripts can load from), `Strict-Transport-Security` (forcing HTTPS), `X-Frame-Options: DENY` (blocking clickjacking), and `X-Content-Type-Options: nosniff`.
- **Why it is currently deferred:** Setting HSTS locally on `http://localhost` can interfere with local HTTP development, and a strict Content Security Policy needs careful tuning against the portal's inline scripts and local static assets after all application routes are finalized.
- **When it must be added:** Before deploying to a public staging or production environment (required for production launch).

### 5. Complete Self-Service Password-Reset Token Flow
- **What it does:** Generates a cryptographically random, single-use, time-limited reset token (stored hashed in `verification_codes` with purpose `'password_reset'`), emails a reset link or code, and lets the user set a new password (checked against HIBP and hashed with Argon2id).
- **Why it is currently deferred:** `POST /auth/reset` was implemented as a prototype demonstration that validates email format, enforces rate limiting, and displays a generic notice without sending reset emails or modifying passwords.
- **When it must be added:** Before real customers register accounts they need to recover if forgotten (required for production launch).

---

## Category B: Stage, Scale & Complexity Trade-Offs (Optional / Trigger-Driven)

### 6. Reverse-Proxy Trust Configuration (`trust proxy`)
- **What it does:** Configures Express `trust proxy` with the exact hop count or trusted subnet of a reverse proxy/CDN (such as Nginx, Cloudflare, or Cloud Run) so `req.ip` resolves the real client IP from `X-Forwarded-For` rather than the proxy's own internal IP. (Note: a single app instance behind a proxy needs `trust proxy` configured, without needing Redis.)
- **Why it is currently deferred:** The prototype runs directly on `http://localhost` with no reverse proxy in front of it. Leaving `trust proxy` disabled ensures `req.ip` comes strictly from the TCP socket peer address and prevents clients from spoofing `X-Forwarded-For` headers (verified in Step 8).
- **When it must be added:** Immediately before deploying the app behind any reverse proxy, load balancer, or CDN (otherwise every customer will appear to share the proxy's IP address and trip the rate limit together).

### 7. Shared Rate-Limit Storage (Redis / External Store)
- **What it does:** Stores rate-limit counters in a shared external store (such as Redis) instead of single-process Node.js memory, so all application instances enforce consistent limits and counters survive process restarts.
- **Why it is currently deferred:** The prototype runs as a single local Node.js process. Running a separate Redis server adds operational and infrastructure complexity that is unnecessary for demonstrating single-instance rate limiting and its IP-bypass limitations (Step 8).
- **When it should be added:** When Nit's Cut scales to **multiple application instances** (where in-memory counters would otherwise drift per instance) or requires rate-limit counters to persist across server restarts.
- **Chosen Future Outage Policy (Not Yet Implemented):** When an external rate-limit store is introduced, authentication endpoints (`signup`, `login`, and `password reset`) will **fail closed** (temporarily returning `HTTP 503`) if the external store becomes unavailable, while public pages remain available—accepting a temporary interruption rather than allowing unthrottled authentication requests.

### 8. Account-Based Login Throttling (Per-Email Lockout)
- **What it does:** Tracks failed `POST /auth/login` attempts per normalized email address (across all IP addresses), slowing down or temporarily locking an account if an attacker rotates source IPs.
- **Why it is currently deferred:** Note that 6-digit email verification codes **already** enforce a strict 5-attempt per-code limit (`verification_codes.failed_tries`). By contrast, `POST /auth/login` currently uses IP-only rate limiting (5 requests / 15 minutes). Adding hard per-email lockouts introduces a denial-of-service risk where an attacker who knows a customer's email address can deliberately lock that customer out of their account, requiring careful progressive backoff or CAPTCHA/email-unlock flows.
- **When it should be added:** When login monitoring shows distributed credential-stuffing attacks rotating across multiple IP addresses, paired with progressive delays or email-based unlock rather than permanent hard lockouts.

### 9. Two-Factor Authentication (2FA / MFA) for Staff & Admin Accounts
- **What it does:** Requires a second verification factor (such as a TOTP authenticator app or hardware passkey) after password verification for `tailor` and `admin` roles.
- **Why it is currently deferred:** Nit's Cut is a small bespoke tailoring business prototype with no live staff/admin dashboard, customer-data export tools, or payment-refund controls implemented yet. Enforcing TOTP enrollment and backup-code recovery adds significant UX and support overhead before staff workflows exist.
- **When it should be added:** Before any `tailor` or `admin` account can sign in to view customer orders, manage measurements, or trigger refunds in production.
