# Nit's Cut — Bespoke Men's Tailoring Client Portal

An authentic, server-rendered client portal and workshop management system for Nit's Cut, an artisanal bespoke tailoring house based in Lagos, Nigeria.

---

## 1. What This Is

A server-rendered client portal and workshop management system for Nit's Cut, a bespoke Nigerian men's tailoring business in Lagos, designed to ensure client garment measurements and custom orders are reliably recorded and tracked from consultation to final fitting.

---

## 2. Status

- **Finished & Verified:**
  - **Task 1 Design System Tokens:** Light and Dark semantic color palettes, typography scales, and shadows exported to [`task-01-design-system/tokens/generated/nc-tokens.css`](task-01-design-system/tokens/generated/nc-tokens.css), verified with 0 raw hex values in application styles.
  - **Server Scaffold (`app/`):** Lightweight, server-rendered Node.js and Express architecture utilizing semantic EJS views, self-hosted local fonts (`Cormorant Garamond` and `Manrope`), and zero client bundle overhead.
  - **Persistent Relational Database:** Direct SQLite integration with `better-sqlite3`, WAL journaling, and automated idempotent startup schema execution ([`app/migrations/001-initial-schema.sql`](app/migrations/001-initial-schema.sql)).
  - **Form Persistence & Live Table:** Functional inquiry submission (`POST /inquiries`) with verified persistent SQLite storage on disk (Rows #1 and #2 confirmed with autoincrement IDs and independent timestamps).
  - **Deliberate Failure & Recovery Suite:** Recreated and triaged three real failure modes: nested project directory (recovering via `cd` and in-place restructuring), port 3000 collision (`EADDRINUSE`), and 404 route handling, alongside deliberate database disconnection handling.
  - **Information Design:** Dynamic route-driven titles across two navigable endpoints (`GET /` and `GET /services`), SEO and explicit `robots` directives, custom SVG favicon, 1200×630 Open Graph preview card, and fluid responsive typography using `--nc-layout-heading-max: 22ch` and `clamp()`.

- **In Progress / Awaiting Learner Actions:**
  - Pasting learner's raw first-draft scaffolding prompt into [`task-02-repository-and-scaffold/docs/scaffold-prompt.md`](task-02-repository-and-scaffold/docs/scaffold-prompt.md).
  - Handing this README to an independent peer tester unfamiliar with the project and capturing their verbatim feedback in [`task-02-repository-and-scaffold/docs/readme-test.md`](task-02-repository-and-scaffold/docs/readme-test.md).
  - Learner confirmation of actual secondary model/tool usage for [`task-02-repository-and-scaffold/docs/model-choices.md`](task-02-repository-and-scaffold/docs/model-choices.md).
  - Adding required A/B threshold and `git add`/`git commit` labels to the hand-drawn working tree diagram and taking an updated photograph.
  - Executing the Step 9 feature branch, PR, and discarded-branch exercise upon learner authorization.

- **Not Started:**
  - Task 3: Client-side validation and progressive enhancement.
  - Task 4: Server security, rate limiting, and input sanitization.
  - Task 5: Sessions, compliance, account deletion, and viva defence.

---

## 3. The Stack, with Reasons

- **Node.js (v24 LTS):** Modern runtime with native ECMAScript Modules (ESM) and native watch mode (`--watch`), chosen over complex build runtimes to eliminate transpilery overhead and keep execution transparent.
- **Express (v4):** Minimalist HTTP framework chosen over heavyweight meta-frameworks (Next.js/Remix) to maintain explicit control over middleware execution, routing pipelines, and exact HTTP response codes.
- **Server-Rendered EJS:** Lightweight HTML templating chosen over client-side SPA frameworks (React/Vue) to render complete, accessible HTML directly on the server with 0 KB JavaScript payload, ensuring rapid initial page loads on low-bandwidth Nigerian mobile networks.
- **SQLite via `better-sqlite3`:** Native, high-performance file-based relational database chosen over ORMs (Prisma/TypeORM) so the learner writes, tests, and explains raw SQL prepared statements directly with zero network latency.
- **Pure CSS with Design Tokens:** Direct consumption of CSS custom properties (`nc-tokens.css` and `nc-layout-tokens.css`) without utility frameworks (Tailwind), ensuring 100% token fidelity, instant theme switching, and zero CSS build steps.

---

## 4. Getting Started

Follow these exact commands from a terminal to set up and run the application from scratch:

```bash
# 1. Clone the repository
git clone https://github.com/Hennit-Dave/Five5-assessment-task.git
cd "Five5 assessment task"

# 2. Navigate to the application root directory
cd app

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

### Expected Startup Output:
```text
[Nit's Cut Server] Process <PID> listening on port 3000
[Nit's Cut Server] Local URL: http://localhost:3000
[Database] Connecting to SQLite database at: .../app/data/nits_cut.db
[Database] Running migration: 001-initial-schema.sql
```

Open `http://localhost:3000` in your web browser. You can navigate between **Portal Home** and **Services**, and submit a bespoke tailoring inquiry to see it recorded in the live SQLite table.

To run with live automatic reloading during development:
```bash
npm run dev
```

---

## 5. Environment Variables

Configure these optional variables in your execution environment or a local `.env` file (never commit secret credentials to Git):

- `PORT`: TCP port number for the HTTP server to listen on. Defaults to `3000` if omitted.
- `DATABASE_PATH`: Absolute or relative filesystem path to the SQLite database file. Defaults to `app/data/nits_cut.db` if omitted.
- `NODE_ENV`: Application runtime mode (`development` or `production`). Controls SQL statement logging verbosity in server stdout.

---

## 6. What This Deliberately Does Not Do

- **No User Authentication or Session Management:** Deliberately deferred to Task 5 to keep the scaffolding clean and avoid unvetted authentication boilerplate.
- **No Third-Party Font CDNs:** Remote Google Fonts requests are completely eliminated. All fonts (`Cormorant Garamond` and `Manrope`) are self-hosted locally under `app/public/fonts/` for offline resilience.
- **No Multi-Step Payment or Booking Wizard:** The application scope is strictly bounded to the foundational client portal and persistent inquiry ledger; full tailoring eCommerce workflows are not simulated.
- **No Stateful Database Migration Tracking Table:** Schema files are executed sequentially on boot using idempotent `CREATE TABLE IF NOT EXISTS` syntax without a separate `schema_migrations` table.
- **No Client-Side JavaScript Frameworks:** Zero megabytes of client framework code are shipped to the browser.

---

## 7. Known Defects

Documented technical defects discovered and resolved during development (with file references):

- **`D9` — Loopback Socket Name Resolution in macOS Sandbox:**  
  *Location:* `scratch/` test runners and loopback smoke tests.  
  *Issue:* Node's `fetch('http://localhost:3000/')` failed with `AggregateError [EPERM]` due to sandbox hostname resolution policies.  
  *Resolution:* Configured test runners to target literal IPv4 loopback (`http://127.0.0.1:3000/`) and documented sandbox elevation requirements.

- **`D10` — Development Port Collision (`EADDRINUSE`):**  
  *Location:* [`app/src/server.js`](app/src/server.js) lines 144–147; [`task-02-repository-and-scaffold/evidence/07-port-conflict.txt`](task-02-repository-and-scaffold/evidence/07-port-conflict.txt).  
  *Issue:* Starting the server while another process held port 3000 crashed the process with unhandled `EADDRINUSE`.  
  *Resolution:* Documented process isolation command (`lsof -i :3000`), terminated the holding process, and cleanly restarted.

- **`D11` — Single-Word Heading Widow at Tablet Breakpoints:**  
  *Location:* [`app/public/css/app.css`](app/public/css/app.css) line 123; [`task-02-repository-and-scaffold/evidence/18-heading-wrap-bad.png`](task-02-repository-and-scaffold/evidence/18-heading-wrap-bad.png).  
  *Issue:* At viewports between 720px and 850px, unconstrained headline width orphaned the single word "Platform" onto line 3.  
  *Resolution:* Applied `--nc-layout-heading-max: 22ch` from layout tokens to enforce deliberate 2-line visual phrasing.

- **`D12` — Silent Database Failure Anti-Pattern (False Success):**  
  *Location:* [`app/src/server.js`](app/src/server.js) lines 105–120; [`task-02-repository-and-scaffold/docs/false-success.md`](task-02-repository-and-scaffold/docs/false-success.md).  
  *Issue:* Naive scaffolding wraps database writes in generic try/catch blocks that redirect to success even when writes fail.  
  *Resolution:* Hardened route handlers to return explicit HTTP 500 error cards alerting users when database operations fail.

- **`D13` — Headless Chrome DevTools Protocol Initialization Race:**  
  *Location:* `scratch/perform-write-2-and-inspect.mjs` line 52.  
  *Issue:* Rapidly polling the CDP socket (`http://127.0.0.1:9222/json/list`) before Chrome finished binding caused empty response parse errors.  
  *Resolution:* Implemented retry backoff loops and isolated temporary browser profiles (`--user-data-dir`).
