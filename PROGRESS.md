# Five5 progress

Updated 2026-11-02. Active task: Task 3 (Step 1 completed locally on branch `feature/task-03-client-validation`). Task 2: All technical deliverables and evidence complete (independent human README test pending). Task 1: completed and committed locally on `main`. Tasks 4–5: not started.

## Confirmed work
- Fictional men's tailoring business Nit's Cut; observed missed deadlines during training (power outages and single-tailor overload), not a verified interview.
- Task 1: completed and committed locally on `main` (commit `3576087` feature, commit `8e3be56` fixes/study guide, commit `8cba6ef` checklist sign-off).
- Task 2 Step 1: preserved learner's first draft of the scaffolding prompt, produced tightened version and comparison analysis in `task-02-repository-and-scaffold/docs/scaffold-prompt.md`.
- Task 2 Step 2: produced `task-02-repository-and-scaffold/evidence/01-agent-plan.txt` detailing understanding, proposed files, assumptions, and verification plan. Obtained explicit learner approval before scaffolding.
- Task 2 Scaffold Execution: created root-level `app/` folder with `package.json`, installed dependencies (`express@4.21.2`, `ejs@3.1.10`), created `src/server.js`, integrated tokens and self-hosted fonts in `public/`, created tokenized `app.css` (0 hexes, 0 raw px), created semantic EJS partials and `home.ejs`, performed endpoint checks (HTTP 200 on `/`, static assets, and HTTP 404), and recorded complete inventory in `task-02-repository-and-scaffold/evidence/02-files-created.txt`.
- Task 2 Step 3 (Model Selection & Empirical Comparison):
  1. Documented strategic model selection across deliberate planning agents vs direct execution models in `docs/model-choices.md`.
  2. Recorded empirical trial on enquiry form preservation using `Gemini 4 Argon (Low)` vs `Gemini 3.8 Flash (Medium)`, capturing verbatim prompt, changed files, sandbox retry note, and learner comparison.
- Task 2 Step 4: captured development server startup logs with port and PID in `evidence/03-server-start.txt`, measured cold first-load (25.25 ms) and warm reload (2.47 ms) in `evidence/04-first-load.txt`, and documented architectural performance analysis in `docs/performance-note.md`.
- Task 2 Step 5 (Three Deliberate Failures & Recoveries):
  1. Nested folder / wrong directory error (`MODULE_NOT_FOUND` & `ENOENT`) in `evidence/05-nested-folder-error.txt`, and fixed both ways (directory navigation `cd app` and in-place `--prefix` / rescaffolding prompt) in `evidence/06-nested-folder-fixed.txt`.
  2. Port conflict (`EADDRINUSE: address already in use :::3000`) in `evidence/07-port-conflict.txt`, and resolved via `lsof -i :3000`, process termination (`kill 48446`), and clean restart (PID 48457) in `evidence/08-port-conflict-resolved.txt`.
  3. 404 route error (`GET /orders/NC-204/download-receipt` in 26.41 ms) in `evidence/09-404-error.txt`, and systematic 5-step diagnostic sequence before asking for help in `evidence/10-404-resolved.txt`.
- Task 2 Step 6 (Database Persistence, Broken Connection, & Form Field Preservation):
  1. Installed `better-sqlite3`, added versioned migration `app/migrations/001-initial-schema.sql`, and connected via parameterized prepared statements in `app/src/db.js`.
  2. Submitted Write 1 (Chinedu Okafor) returning HTTP `201 Created` with full terminal trace in `evidence/11-write-succeeded-logs.txt`.
  3. Submitted Write 2 (Babatunde Adeleke) at `17:51:01 UTC` (2m 18s after Write 1 at `17:48:43 UTC`), and captured headless Chrome snapshot in `evidence/12-database-rows.png` (239 KB).
  4. Deliberately broke database path, captured HTTP 500 error logs in `evidence/13-write-failed-logs.txt`, and documented comprehensive false success analysis in `docs/false-success.md`.
  5. Implemented form field preservation on validation failure (`POST /inquiries`): returns HTTP 400, preserves 4 entered fields with EJS escaping, leaves missing field empty, and verified 0 rows in temporary SQLite DB. Upon supplying missing field, verified HTTP 201 and 1 persisted row in `evidence/21-incomplete-enquiry-form-preservation.txt`.
- Task 2 Step 7: authored professional 7-section repository overview in root `README.md`, 4-minute technical summary in `task-02-repository-and-scaffold/README.md`, verified clone directory (`cd Five5-assessment-task`), and recorded agent baseline setup test in `docs/readme-test.md` (reserving Section 3 for independent human test).
- Task 2 Step 8: analyzed Git pipeline, single-branch risks, and deployment thresholds in `docs/working-tree.md`. Hand-drawn working tree diagram updated with A/B boundaries and git add/commit labels and verified in `evidence/14-working-tree-drawing.jpg`.
- Task 2 Step 9: PR #1 (`https://github.com/Hennit-Dave/Five5-assessment-task/pull/1`) merged into `main` via merge commit `c84bfbe`. Discarded branch exercise executed with `experiment/discarded-change` (`3b8a965`), deleted without merging, and verified unreachable from `main`. Complete Git graph recorded in `evidence/15-git-log-graph.txt`.
- Task 2 Step 10 (Information Design):
  1. Dynamic route titles and SEO in `evidence/16-head-route-one.png` and `evidence/17-head-route-two.png`.
  2. Active navigation state (`.btn-active`, `aria-current="page"`) and accessible table caption (`caption.nc-visually-hidden`).
  3. Fluid typography compliant with Task 1 `type-scale.md` 1.4 line-height multiplier (`--nc-type-display-fluid-line-height: 1.4`).
  4. Heading line-wrapping with `22ch` constraint in `evidence/18-heading-wrap-bad.png` vs `evidence/19-heading-wrap-good.png`.
  5. Fluid typography verified across 3 widths in `evidence/20-responsive-three-widths.png`.
  6. Documented in `docs/information-design.md`.
- Task 2 Interview Defence & Defects: answered all 15 interview defence questions in `docs/interview-answers.md` (all 160–199 words, strictly under 200 words), and documented defects D9–D13 in `docs/defects.md`.

- Task 3 Step 1 (Collapse Authentication Pages):
  1. Defined strict page counting rule: distinct URL paths returning HTTP 200 with `text/html`.
  2. Probed original app at `6bf5748`: 2 user-facing pages (`/`, `/services`), 0 authentication pages.
  3. Created and committed minimal separate-page baseline at `7da3fce`: 5 user-facing pages, 3 auth pages (`/signup`, `/login`, `/reset`). Verified that baseline switches triggered full page Document reloads and destroyed browser DOM state. Captured in `task-03-client-validation/evidence/01-page-count-before.txt`.
  4. Consolidate into single route `GET /auth` using query parameter `?mode=login|signup|reset`. Inactive forms hidden with HTML `hidden` attribute and CSS `[hidden] { display: none !important; }`. Client script `app/public/js/auth.js` intercepts switcher clicks, pushes URL state, updates `aria-current="page"`, updates `document.title`, and moves focus to form `<h1>`.
  5. Probed consolidated app: 3 user-facing pages (`/`, `/services`, `/auth`), 1 auth page. Former baseline routes return 404. Captured in `evidence/02-page-count-after.txt`.
  6. Captured genuine browser address bars in `evidence/03-url-states.png` (2080x4688 Retina PNG) and preserved illustration in `evidence/03a-url-states-illustration.png`.
  7. Verified 0 server requests and 0 new Document loads across 6 client switches, DOM window marker survival, unchanged `performance.timeOrigin`, verified direct links and F5 refreshes, and documented statelessness in `evidence/04-form-switch-logs.txt`.
  8. Authored `docs/spa-rationale.md` detailing user experience comparison, benefits of instant switching, and legitimate cases for separate pages. Committed at `6985b52` and `aab231d`.
- Task 3 Step 2 (Information Design & Credential Safety):
  1. Developed three-tier field justification in `docs/field-justification.md`. Kept phone collection at tailoring enquiry (`POST /inquiries`); supported single-name clients (mononyms) on registration while eliminating redundant confirm-password, shipping address, and fake badges.
  2. Selected Option 1 for terms: adapted Section 2 of Automattic published Terms of Service under CC BY-SA 4.0; removed termination-at-any-time clause; documented edits in `docs/terms-note.md` and live at `/terms`.
  3. Configured explicit HTTP POST methods on all auth forms (`/auth/signup`, `/auth/login`, `/auth/reset`) with prototype confirmation view (`app/views/auth-result.ejs`). Verified that submitting by button or Enter key keeps fictional credentials out of URLs and observed logs in `evidence/04a-form-post-credentials-test.txt`. Committed at `01bb288`.
- Task 3 Step 3 (Client-Side Validation across Four Categories):
  1. Documented rule derivations, failure outcomes, and trade-offs in `docs/validation-rules.md`. Single-name support (min 2 chars + letter) blocks single-character entries while allowing mononyms (e.g. Sade, Dapo).
  2. Implemented Category 1 empty-field validation on blur (`evidence/05-empty-field-error.png`).
  3. Implemented Category 2 business length/structure validation (`evidence/06-length-rule-blocking.png`).
  4. Implemented Category 3 real-time email format on signup (`evidence/07-email-realtime-signup.png`) vs submit-time email format on login (`evidence/08-email-on-submit-login.png`).
  5. Implemented Category 4 accessible error architecture: `aria-invalid`, `aria-describedby`, `role="alert"`, non-color indicators (icon + text), and submit focus recovery to first invalid field.

## Outstanding Task 2 learner actions
- Hand repository link to an independent peer tester unfamiliar with the project, collect their verbatim setup experience, and record in `docs/readme-test.md`.
- Review the 15 interview answers in `docs/interview-answers.md` for viva defence.
- Optional bonus video/voice walkthrough (`evidence/21-walkthrough.mp4`, up to 5 bonus marks).

## Next action
Await real peer tester feedback for `docs/readme-test.md` before finalizing Task 2 deliverables.

## Outstanding Task 1 work
- Optional bonus video walkthrough (`evidence/13-walkthrough.mp4`, not recorded).
- Documented technical limitations in `docs/defects.md`: `D3` (shadow `color-mix()` assumes `primary/40` and modern browser support) and `D7` (`Manrope` lacks `U+20A6` `₦` glyph, falling back to system sans-serif for that 1 character).

## Where to look
- assessment/original-assessment.txt: original source text (excluded from Git commits).
- Each task docs/assessment-requirements.txt: full task text (excluded from Git commits).
- Each task docs/deliverables-checklist.md: filenames and completion gates.
- work/ and outputs/: previous working files; preserve provenance.
- task-01-design-system/evidence/: submission-folder evidence files (`01`–`12` plus supplementary captures).
