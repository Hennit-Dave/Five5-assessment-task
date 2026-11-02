# Five5 progress

Updated 2026-11-02. Active task: Task 2 — All technical deliverables, evidence captures, enquiry form preservation, model comparison notes, and documentation completed. Task 1: completed and committed locally. Tasks 3–5: not started.

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
- Task 2 Step 9: text-format Git branch graph in `evidence/15-git-log-graph.txt` (to be updated with PR merge and discarded branch exercise upon publication approval).
- Task 2 Step 10 (Information Design):
  1. Dynamic route titles and SEO in `evidence/16-head-route-one.png` and `evidence/17-head-route-two.png`.
  2. Active navigation state (`.btn-active`, `aria-current="page"`) and accessible table caption (`caption.nc-visually-hidden`).
  3. Fluid typography compliant with Task 1 `type-scale.md` 1.4 line-height multiplier (`--nc-type-display-fluid-line-height: 1.4`).
  4. Heading line-wrapping with `22ch` constraint in `evidence/18-heading-wrap-bad.png` vs `evidence/19-heading-wrap-good.png`.
  5. Fluid typography verified across 3 widths in `evidence/20-responsive-three-widths.png`.
  6. Documented in `docs/information-design.md`.
- Task 2 Interview Defence & Defects: answered all 15 interview defence questions in `docs/interview-answers.md` (all 160–199 words, strictly under 200 words), and documented defects D9–D13 in `docs/defects.md`.

## Outstanding Task 2 learner actions
- Review the GitHub publication plan and confirm whether customer details in `7fcca4c` are fictional before push authorization.
- Provide invitation and repository link to an independent tester to test the README instructions and provide verbatim feedback for `docs/readme-test.md`.
- Review the 15 interview answers in `docs/interview-answers.md` for viva defence.
- Optional bonus video/voice walkthrough (`evidence/21-walkthrough.mp4`, up to 5 bonus marks).

## Next action
Review publication plan with learner (branches, PR title/description, checks, and remote visibility) and obtain explicit approval before pushing to GitHub.

## Outstanding Task 1 work
- Optional bonus video walkthrough (`evidence/13-walkthrough.mp4`, not recorded).
- Documented technical limitations in `docs/defects.md`: `D3` (shadow `color-mix()` assumes `primary/40` and modern browser support) and `D7` (`Manrope` lacks `U+20A6` `₦` glyph, falling back to system sans-serif for that 1 character).

## Where to look
- assessment/original-assessment.txt: original source text (excluded from Git commits).
- Each task docs/assessment-requirements.txt: full task text (excluded from Git commits).
- Each task docs/deliverables-checklist.md: filenames and completion gates.
- work/ and outputs/: previous working files; preserve provenance.
- task-01-design-system/evidence/: submission-folder evidence files (`01`–`12` plus supplementary captures).
