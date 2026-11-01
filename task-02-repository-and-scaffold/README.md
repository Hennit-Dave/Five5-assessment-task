# Task 2 — Repository and Scaffold (`Nit's Cut`)

**Four-minute technical overview for an interviewer.**

---

## 1. What This Task Was

Take the Nit's Cut bespoke tailoring client portal from nothing using an AI agent, present the repository so an interviewer can assess it in four minutes, and rigorously diagnose what is actually running behind the interface rather than trusting rendered screens.

The core engineering challenge tests whether a developer can prevent the single most prevalent failure mode in AI-generated software: **an interface that appears to work while writing nothing to disk** (the Aisha dilemma, where a founder's 6-week product showed zero conversions because every signup succeeded visually while failing silently in the backend).

---

## 2. What Was Built

- **Root-Level Server Application (`app/`):**
  - Built with **Node.js**, **Express**, and server-rendered **EJS** views. Zero client bundle overhead, ensuring resilient access for mobile users on intermittent Nigerian 3G/4G networks.
  - Development and startup scripts configured in [`app/package.json`](../../app/package.json) (`"dev": "node --watch src/server.js"`), leveraging native Node 24 watch mode without external dependencies.
- **Design System & Layout Token Integration:**
  - Integrated Task 1 CSS tokens ([`app/public/css/nc-tokens.css`](../../app/public/css/nc-tokens.css): 192 primitives, 57 Light & 57 Dark semantic roles) and Task 2 layout foundations ([`app/public/css/nc-layout-tokens.css`](../../app/public/css/nc-layout-tokens.css): rem spacing scales, component padding, corner radii, and content max-widths).
  - Stylesheet ([`app/public/css/app.css`](../../app/public/css/app.css)) verified via automated scans to contain **0 raw hex colors** and **0 un-tokenized pixel values**.
  - Local font assets bundled in [`app/public/fonts/`](../../app/public/fonts/) (`Cormorant Garamond 600` and `Manrope 400/600` `.woff2`), eliminating Google CDN dependencies and preventing layout shift.
- **Database Persistence Layer (`app/src/db.js` & `app/migrations/`):**
  - Implemented direct SQLite integration using `better-sqlite3` with Write-Ahead Logging (`WAL`) enabled.
  - Automated startup schema boot script executing SQL files in [`app/migrations/`](../../app/migrations/) sequentially (running [`001-initial-schema.sql`](../../app/migrations/001-initial-schema.sql) with idempotent `CREATE TABLE IF NOT EXISTS inquiries`). *Note:* It executes migration files on startup without a stateful `_migrations` tracking table; future schema adjustments must remain idempotent or introduce tracking.
  - Parameterized prepared statements preventing SQL injection (`createInquiry`, `getAllInquiries`).
- **Bespoke Garment Inquiry Form & Live Database Inspector:**
  - Server-rendered form in [`app/views/home.ejs`](../../app/views/home.ejs) submitting to `POST /inquiries`, displaying a live reflection table querying SQLite directly.

---

## 3. Key Decisions & Empirical Diagnostics

1. **Pre-Planning and Scaffolding Discipline:**
   - Authored the scaffolding prompt personally ([`docs/scaffold-prompt.md`](docs/scaffold-prompt.md)), tightened it with the agent, and generated [`evidence/01-agent-plan.txt`](evidence/01-agent-plan.txt) detailing assumptions and file manifests. Scaffolding code was executed only after explicit learner approval, resulting in zero orphan files ([`evidence/02-files-created.txt`](evidence/02-files-created.txt)).
2. **Cold First-Load vs Warm Reload Timings ([`docs/performance-note.md`](docs/performance-note.md)):**
   - Cold first load: **25.25 ms** (server duration 6 ms); subsequent warm reload: **2.47 ms** (server duration 1 ms) ([`evidence/04-first-load.txt`](evidence/04-first-load.txt)). By choosing vanilla Express and pre-compiled tokens over bloated frontend SSR frameworks, we avoided the 10-second cold-start compilation traps common in AI-generated Next.js/Vite stacks.
3. **Three Deliberate Breakages and Recoveries ([`evidence/05`](evidence/)–[`10`](evidence/)):**
   - **Nested Folder:** Triggered in an isolated fixture causing `MODULE_NOT_FOUND` and npm `ENOENT`; recovered both via directory navigation (`cd app && npm start`) and actual in-place structural rescaffolding/flattening.
   - **Port Collision:** Triggered port 3000 collision (`EADDRINUSE`); isolated holding process via `lsof -i :3000` (PID 48446), killed it, and restarted cleanly on PID 48457.
   - **404 Route Error:** Sent unmapped request `GET /orders/NC-204/download-receipt` (404 in 26 ms); executed a systematic 5-step diagnostic sequence before prompting for fixes.
4. **True Database Persistence (HTTP 201 Created vs False Success):**
   - Submitted Write 1 (Chinedu Okafor) returning HTTP **201 Created** in 351 ms ([`evidence/11-write-succeeded-logs.txt`](evidence/11-write-succeeded-logs.txt)).
   - Submitted Write 2 (Babatunde Adeleke) at `17:51:01 UTC` (2m 18s after Write 1 at `17:48:43 UTC`), verifying row autoincrement and independent timestamps. Captured database inspector snapshot in [`evidence/12-database-rows.png`](evidence/12-database-rows.png).
   - **Deliberate Connection Break:** Pointed `DATABASE_PATH` to an unwritable path; submitted form; verified server threw HTTP 500 and warned the user rather than faking success ([`evidence/13-write-failed-logs.txt`](evidence/13-write-failed-logs.txt)). Authored [`docs/false-success.md`](docs/false-success.md) analyzing why naive AI catch blocks deceive demo viewers.
5. **Information Design & Fluid Typography ([`docs/information-design.md`](docs/information-design.md)):**
   - Dynamic `<head>` titles and SEO tags verified on Route 1 ([`evidence/16-head-route-one.png`](evidence/16-head-route-one.png)) and Route 2 ([`evidence/17-head-route-two.png`](evidence/17-head-route-two.png)).
   - Removed visual noise (redundant topbar badge) and collapsed booking choices into one unified inquiry flow.
   - Constrained main heading with `--nc-layout-heading-max: 22ch` to eliminate single-word widows ([`evidence/18-heading-wrap-bad.png`](evidence/18-heading-wrap-bad.png) vs [`evidence/19-heading-wrap-good.png`](evidence/19-heading-wrap-good.png)).
   - Implemented fluid typography with `clamp(2rem, 3.5vw + 1rem, 3.5625rem)`, verified across desktop (1280px), tablet (768px), and mobile (375px) in [`evidence/20-responsive-three-widths.png`](evidence/20-responsive-three-widths.png).

---

## 4. What We Got Wrong & Real Defects Found ([`docs/defects.md`](docs/defects.md))

- **`D9` — Loopback Socket Lookup Blocked in Sandbox:** `fetch('http://localhost:3000/')` failed with `AggregateError [EPERM]` in macOS sandbox; resolved by targeting `127.0.0.1` directly and running socket commands with explicit elevation.
- **`D10` — Port 3000 Collision (`EADDRINUSE`):** Concurrent server starts crashed due to unhandled port binding; resolved by capturing the holding PID with `lsof -i :3000` and terminating it.
- **`D11` — Single-Word Heading Widow:** Unconstrained headline at tablet widths orphaned "Platform" on line 3; resolved by enforcing `22ch` layout max-width.
- **`D12` — AI False-Success Anti-Pattern:** Naive AI code swallows database errors and redirects to success; resolved by enforcing explicit HTTP 201/500 propagation and clear error cards.
- **`D13` — Headless Chrome CDP Port Race:** Rapid script launch queried DevTools before Chrome socket opened, throwing JSON parse errors; resolved by adding polling retries and isolated `--user-data-dir` profiles.

---

## 5. Deliverables & Evidence Index

All 20 required deliverables and evidence artifacts are completed, verified against actual logs, and indexed in [`docs/deliverables-checklist.md`](docs/deliverables-checklist.md) and [`docs/evidence-index.md`](docs/evidence-index.md).
