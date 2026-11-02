# Evidence Index — Task 2

Record requirement, decision and reason, actual action/command, observed result, evidence path, date and commit (or explicitly not committed). Never backdate or invent observations.

---

## Step 1 & 2: Scaffolding Plan and Minimal File Creation

- `01-agent-plan.txt`:
  - **Requirement:** Task 2 Step 1 & 2 — Agent must summarize its understanding, proposed files, and assumptions, and wait for learner approval before scaffolding.
  - **Action:** Formally generated understanding of Nit's Cut bespoke tailoring context, scope boundary (minimal project setup and home screen only; database deferred to Step 6), proposed file manifest, and stated assumptions (modern Node.js with `--watch`, no unapproved database setup, local self-hosted assets, dark mode default with light mode token compatibility).
  - **Result:** Saved and explicitly approved by learner before creating any application files or running dependency installation.

- `02-files-created.txt`:
  - **Requirement:** Task 2 Step 2 — List every file created and every assumption made during scaffolding.
  - **Action:** Created root-level `app/` folder with `package.json`, installed `express@4.21.2` and `ejs@3.1.10`, created `src/server.js`, copied Task 1 design tokens to `public/css/nc-tokens.css`, Task 2 layout tokens to `public/css/nc-layout-tokens.css`, local font assets to `public/fonts/` and `public/css/fonts.css`, token-only stylesheet `public/css/app.css` (verified 0 raw hexes and 0 raw pixel values), and EJS views (`views/partials/head.ejs`, `views/partials/header.ejs`, `views/partials/footer.ejs`, `views/home.ejs`).
  - **Result:** Executed diagnostic endpoint smoke test; verified HTTP 200 on `/`, static CSS and fonts, and HTTP 404 for unrecognized routes. Logged complete file manifest, stated assumptions, and checks in `evidence/02-files-created.txt`.

---

## Step 4: Development Server Diagnostics and Performance

- `03-server-start.txt`:
  - **Requirement:** Task 2 Step 4 — Terminal output showing server starting, including port number and process ID.
  - **Action:** Started development server via `node src/server.js` from `app/` folder. Captured terminal startup output.
  - **Result:** Server announced PID `48216`, listening on port `3000` (`http://localhost:3000`).

- `04-first-load.txt`:
  - **Requirement:** Task 2 Step 4 — First page load terminal/HTTP log, status code, and load time in milliseconds.
  - **Action:** Executed cold initial request and warm subsequent reload to `http://127.0.0.1:3000/`. Captured client-measured round-trip time, server-internal duration, HTTP status, and response headers.
  - **Result:** Cold first load recorded HTTP 200 in `25.25 ms` (server duration `6 ms`); subsequent reload recorded HTTP 200 in `2.47 ms` (server duration `1 ms`). Analysis documented in `docs/performance-note.md`.

---

## Step 5: Deliberate Failures and Recoveries (Three Ways)

- `05-nested-folder-error.txt`:
  - **Requirement:** Task 2 Step 5 — Cause nested folder / wrong directory error; capture terminal output.
  - **Action:** Executed `node src/server.js` and `npm start` from repository root (`/Users/blk/Developer/Five5 assessment task`) instead of `app/`.
  - **Result:** Node exited with `code: 'MODULE_NOT_FOUND'` (`Error: Cannot find module '.../src/server.js'`); npm exited with `npm error code ENOENT` (`Could not read package.json`). Captured exact terminal traces.

- `06-nested-folder-fixed.txt`:
  - **Requirement:** Task 2 Step 5 — Fix nested folder error both ways: by changing directory and by rescaffolding in place.
  - **Action:** Demonstrated Fix 1 via explicit directory navigation (`cd app && npm start`). Demonstrated Fix 2 via actual in-place structural rescaffolding and flattening (moving nested contents up, removing empty folder, and running `npm start` directly in place).
  - **Result:** Both fix paths verified with clean server starts.

- `07-port-conflict.txt`:
  - **Requirement:** Task 2 Step 5 — Start second process on same port; capture conflict.
  - **Action:** Ran primary server on port 3000 (PID 48446), then attempted to start second server process on port 3000.
  - **Result:** Second process crashed with `Error: listen EADDRINUSE: address already in use :::3000`. Captured unhandled error event and stack trace.

- `08-port-conflict-resolved.txt`:
  - **Requirement:** Task 2 Step 5 — Find PID holding port with shell command, kill it, and restart cleanly.
  - **Action:** Ran `lsof -i :3000` to isolate blocking process (`node PID 48446`), killed the process with `kill 48446`, and restarted server cleanly with `node src/server.js`.
  - **Result:** Primary blocking process terminated; clean server restarted on port 3000 (PID 48457).

- `09-404-error.txt`:
  - **Requirement:** Task 2 Step 5 — Cause 404 / blank page; capture status code, time, and headers.
  - **Action:** Sent HTTP GET request to unmapped route `http://127.0.0.1:3000/orders/NC-204/download-receipt`.
  - **Result:** Captured HTTP 404 Not Found response in `26.41 ms`, server log `[2026-10-31T17:41:01.057Z] GET /orders/NC-204/download-receipt 404 (6ms)`, and rendered HTML snippet.

- `10-404-resolved.txt`:
  - **Requirement:** Task 2 Step 5 — Diagnose 404 systematically; write what was checked in order before asking for help.
  - **Action:** Documented 5-step diagnostic sequence: checked source routing table, verified request URI/method, checked Task 2 scope boundaries (deferred features), audited Express 404 middleware and tokenized alert card rendering, and outlined route registration / clean portal home return.
  - **Result:** Diagnostic sequence confirmed clean graceful degradation without unhandled exceptions or blank unstyled screens.

---

## Step 6: Database Persistence, Diagnostics, and Broken Connection

- `11-write-succeeded-logs.txt`:
  - **Requirement:** Task 2 Step 6 — Submit form writing to database, capture full server log output, identify status codes, and explain significance of HTTP 201.
  - **Action:** Executed form POST to `/inquiries` with initial client record (Chinedu Okafor, Two-Piece Senator Native Wear). Executed versioned schema migration (`001-initial-schema.sql`) and prepared SQL INSERT with bound parameters.
  - **Result:** Server returned HTTP `201 Created` in 351 ms. Logged exact SQL execution and row creation at `2026-10-31 17:48:43 UTC`. Detailed why 201 Created proves true database insertion over ambiguous 200/302 responses.

- `12-database-rows.png`:
  - **Requirement:** Task 2 Step 6 — Inspect database table; submit second form with different values minutes apart; capture visual proof showing both rows, row IDs, and separate timestamps.
  - **Action:** Submitted second inquiry (Babatunde Adeleke, Bespoke Fitted Trousers) at `2026-10-31 17:51:01 UTC` (2 minutes and 18 seconds after row 1). Queried SQLite `nits_cut.db` and captured full-screen browser snapshot via Chrome DevTools Protocol at `http://127.0.0.1:3000/`.
  - **Result:** Captured screenshot showing live rendered table with Row #1 (`17:48:43`) and Row #2 (`17:51:01`), autoincrement IDs, client contacts, and styling tokens.

- `13-write-failed-logs.txt`:
  - **Requirement:** Task 2 Step 6 — Deliberately break database connection; submit form; capture server error logs and UI response.
  - **Action:** Overrode `DATABASE_PATH` to an unwritable broken path (`/dev/null/broken_directory/nits_cut.db`) and attempted form submission for Ibrahim Danladi.
  - **Result:** Server caught the filesystem/database failure, logged `[Database Failure] 500 Internal Server Error`, returned HTTP `500`, and presented an explicit error alert informing the user that data was not saved. Analyzed in `docs/false-success.md`.

---

## Step 8 & 9: Working Tree and Git Branching

- `14-working-tree-drawing.jpg`:
  - **Requirement:** Task 2 Step 8 — Physical hand-drawn diagram of the Git pipeline on paper with today's date in learner's handwriting, photographed.
  - **Action:** Created on physical paper covering local working directory, staging area, `.git` store, GitHub origin, production deployment, `main` branch, two feature branches, user-visibility boundary, and the no-quiet-undo threshold.
  - **Result:** Photographed by learner, verified with handwritten date, and saved as `evidence/14-working-tree-drawing.jpg` (3.2 MB).

- `15-git-log-graph.txt`:
  - **Requirement:** Task 2 Step 9 — Text-format git log showing branches and commits.
  - **Action:** Executed `git log --graph --all --oneline --decorate > evidence/15-git-log-graph.txt`.
  - **Result:** Captured branch and commit graph representing repository progression across verified dates.

---

## Step 10: Information Design Evidence

- `16-head-route-one.png`:
  - **Requirement:** Task 2 Step 10 — Rendered `<head>` verification on Route 1 (`GET /`).
  - **Action:** Captured rendered head configuration via CDP, demonstrating route-specific page title ("Nit's Cut — Bespoke Men's Tailoring"), 9-word tagline meta description, marketing SEO keywords, self-crafted SVG favicon link, and Open Graph tags.
  - **Result:** Visual capture saved in `evidence/16-head-route-one.png`.

- `17-head-route-two.png`:
  - **Requirement:** Task 2 Step 10 — Rendered `<head>` verification on Route 2 (`GET /services`).
  - **Action:** Captured rendered head configuration on navigable services route, verifying dynamic title shift ("Bespoke Tailoring Services — Nit's Cut") and dedicated meta description across two genuine application routes.
  - **Result:** Visual capture saved in `evidence/17-head-route-two.png`.

- `18-heading-wrap-bad.png`:
  - **Requirement:** Task 2 Step 10 — Main heading wrapping badly without max-width constraint.
  - **Action:** Captured heading wrapping at 780px viewport with unconstrained container width (`max-width: none`), demonstrating an awkward hanging single-word widow ("Platform").
  - **Result:** Visual capture saved in `evidence/18-heading-wrap-bad.png`.

- `19-heading-wrap-good.png`:
  - **Requirement:** Task 2 Step 10 — Main heading wrapping cleanly with deliberate max-width constraint.
  - **Action:** Captured heading wrapping at 780px viewport with `--nc-layout-heading-max: 22ch`, establishing a deliberate, balanced 3-line silhouette.
  - **Result:** Visual capture saved in `evidence/19-heading-wrap-good.png`.

- `20-responsive-three-widths.png`:
  - **Requirement:** Task 2 Step 10 — Fluid responsive layout verification across three standard screen widths.
  - **Action:** Captured application layout at Desktop (1280px), Tablet (768px), and Mobile (375px), composited into a side-by-side comparison proving fluid `clamp()` text scaling, single-column reflow, and zero horizontal scroll.
  - **Result:** Visual capture saved in `evidence/20-responsive-three-widths.png`.

---

## Step 3 & 6: Model Comparison Trial — Incomplete Enquiry Form Preservation

- `21-incomplete-enquiry-form-preservation.txt`:
  - **Requirement:** Task 2 Step 3 & Step 6 — Preserve submitted form values when server-side validation fails on `POST /inquiries` (HTTP 400), keep the omitted field empty, escape output via EJS, and verify against a temporary SQLite database.
  - **Action:** Started server on port `3099` with `DATABASE_PATH=/tmp/nits_cut_form_test.db`. Sent incomplete `POST /inquiries` with 4 fields (`clientName`, `phone`, `garmentType`, `fittingDate`) and omitted `fabricChoice`. Verified HTTP 400 response, preserved form control values, empty `fabricChoice` input, and `0` rows in SQLite. Resubmitted with `fabricChoice=Burgundy Aso-Oke Silk` and verified HTTP 201 and `1` persisted row in SQLite.
  - **Result:** Commands, HTTP responses, rendered form HTML, SQLite row counts, and server logs recorded in `evidence/21-incomplete-enquiry-form-preservation.txt` (not yet committed; left local for review).
