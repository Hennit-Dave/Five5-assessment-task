# Defects Log: Task 2

Real technical defects encountered during the scaffolding, server diagnostics, database persistence, and information design phases of Task 2, along with their root causes, resolutions, and production implications.

---

## D9 — Node.js Loopback DNS Lookup Blocked in Sandboxed Environment (Resolved)

- **Where:** `scratch/` test scripts and initial `fetch('http://localhost:3000/')` smoke checks.
- **What:** When executing HTTP requests from Node.js scripts inside the macOS sandbox environment, querying `localhost` failed with `AggregateError [EPERM]` from `GetAddrInfoReqWrap.emitLookup`. The sandbox policy restricted resolution of loopback hostnames.
- **Resolution:** Updated all internal test harnesses to target the literal IPv4 loopback IP (`http://127.0.0.1:3000/`) rather than the hostname `localhost`, and executed socket diagnostic tools with explicit sandbox bypass permissions.
- **Production Cost (if unaddressed):** In continuous integration (CI) or containerized microservices running in restricted network namespaces, hardcoding `localhost` can cause intermittent smoke test failures due to missing `/etc/hosts` mappings or IPv6 binding preference mismatches.

---

## D10 — Development Port Collision (`EADDRINUSE: address already in use :::3000`) (Resolved)

- **Where:** `app/src/server.js` lines 52–55, documented in [`evidence/07-port-conflict.txt`](../evidence/07-port-conflict.txt) and [`evidence/08-port-conflict-resolved.txt`](../evidence/08-port-conflict-resolved.txt).
- **What:** Starting the Node.js Express server when a background process was already bound to TCP port 3000 caused an unhandled `'error'` event and immediate process crash (`EADDRINUSE`, errno -48).
- **Resolution:** Documented the exact shell triage command to identify the holding process (`lsof -i :3000`), terminated the blocking PID (`kill 48446`), and verified a clean restart on port 3000 (PID 48457).
- **Production Cost (if unaddressed):** In blue-green or zero-downtime rolling deployment workflows, starting a new container or server worker before the previous worker gracefully releases its socket causes cascading container restart loops and deployment aborts.

---

## D11 — Single-Word Heading Widow at Intermediate Tablet Viewports (Resolved)

- **Where:** `app/public/css/app.css` line 108 (`.hero-title`), documented in [`evidence/18-heading-wrap-bad.png`](../evidence/18-heading-wrap-bad.png) and [`evidence/19-heading-wrap-good.png`](../evidence/19-heading-wrap-good.png).
- **What:** Without a width constraint on `.hero-title`, at viewport widths between 720px and 850px the headline expanded across the available width, wrapping just one trailing word ("Platform") onto a third line. This created an awkward single-word widow that broke typographic balance.
- **Resolution:** Applied `--nc-layout-heading-max: 22ch` from the Task 2 layout token library (`nc-layout-tokens.css`), creating a deliberate, balanced 3-line shape ("Nit's Cut Workshop & / Order Platform") across all viewports.
- **Production Cost (if unaddressed):** Degrades perceived visual quality and polish on tablet and landscape mobile devices, signaling careless responsive typesetting to prospective bespoke tailoring clients.

---

## D12 — Silent Database Write Failure Anti-Pattern (False Success) (Resolved)

- **Where:** `app/src/server.js` route handler `POST /inquiries`, documented in [`evidence/13-write-failed-logs.txt`](../evidence/13-write-failed-logs.txt) and [`docs/false-success.md`](false-success.md).
- **What:** AI-generated Express scaffolding frequently wraps database calls in generic try/catch blocks that redirect to `/success` regardless of whether the database query succeeded, or leaves promises unawaited. When `DATABASE_PATH` was deliberately corrupted, a naive application would present a green confirmation banner while saving zero records.
- **Resolution:** Hardened `POST /inquiries` with strict status differentiation: returning HTTP `201 Created` with live record ID when SQLite commits, and catching exceptions to return explicit HTTP `500 Internal Server Error` with an explicit UI alert: *"Database write operation failed... Your record was NOT stored."*
- **Production Cost (if unaddressed):** The catastrophic Aisha scenario: customers submit tailoring orders and believe their booking is secured, while the business owner receives zero inquiries and conversion sits at 0%.

---

## D13 — Headless Chrome CDP Initialization Race Condition (Resolved)

- **Where:** `scratch/perform-write-2-and-inspect.mjs` line 52.
- **What:** On rapid subshell execution, querying the Chrome DevTools Protocol endpoint (`http://127.0.0.1:9222/json/list`) immediately after spawning the Chrome binary resulted in an empty response and thrown `SyntaxError: Unexpected end of JSON input`, because Chrome had not yet finished binding its debugging HTTP server.
- **Resolution:** Implemented an exponential retry loop with delays and created isolated temporary browser user directories (`--user-data-dir=/tmp/chrome-nc-*`) on distinct ports (`9336`, `9338`) to prevent lock collisions with existing Chrome user profiles.
- **Production Cost (if unaddressed):** Automated headless screenshot tests and PDF report generators in CI pipelines fail intermittently ("flaky tests") due to port race conditions.

---

## D14 — Undefined Shadow Token Reference (`--nc-shadow-level-1`) (Resolved)

- **Where:** `app/public/css/app.css` line 145.
- **What:** The `.card` styling rule referenced `var(--nc-shadow-level-1)`, an invented token name that did not exist in the Task 1 exported token dictionary (`nc-tokens.css` provides `--nc-shadow-soft`, `--nc-shadow-medium`, and `--nc-shadow-hard`). The browser treated the custom property as invalid and fell back to no shadow.
- **Resolution:** Replaced the undefined reference with the authentic, documented design system token `var(--nc-shadow-soft)`.
- **Production Cost (if unaddressed):** Degrades visual hierarchy and depth consistency; component cards render completely flat on low-contrast backgrounds.

---

## D15 — Hardcoded Button Typography and Missing Line Height (Resolved)

- **Where:** `app/public/css/app.css` lines 266–270 (`.btn`).
- **What:** The `.btn` selector bypassed the design system by declaring hardcoded typography properties without setting line-height (`font-family: 'Manrope'`, `font-size: 0.875rem`, `letter-spacing: 0.00625rem`) rather than consuming the Task 1 label typography tokens.
- **Resolution:** Updated `.btn` to strictly consume `var(--nc-type-label-large-family)`, `var(--nc-type-label-large-weight)`, `var(--nc-type-label-large-size)`, `var(--nc-type-label-large-line-height)`, and `var(--nc-type-label-large-tracking)`.
- **Production Cost (if unaddressed):** Desynchronizes button typography from design token updates; causes vertical text misalignments across different device font renderers.

