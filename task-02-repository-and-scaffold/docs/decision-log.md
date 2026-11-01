# Decision log

Record requirement, decision and reason, actual action/command, observed result, evidence path, date and commit (or explicitly not committed). Never backdate or invent observations.

## Task 2 application stack, database, and folder architecture — 2026-10-31
- **Requirement:** Select an application runtime, server framework, template/UI layer, database engine, SQL access pattern, and repository layout for Nit's Cut that enables fast cold starts, understandable HTTP/SQL diagnostics, and reuse of Task 1 tokens.
- **Decision and reason:**
  1. **Stack:** Node.js, Express, and server-rendered HTML using EJS. Chosen to ensure lightweight performance (<50ms cold start), clear HTTP status code logging (200, 201, 404, 500), and simple mental models without heavy single-page application bundling overhead.
  2. **Database:** SQLite using `better-sqlite3` directly (no ORM abstraction). Chosen because the learner wants to learn, write, and explain the SQL queries directly. Required to use prepared statements with bound parameters for security against injection, and versioned migration SQL files for schema tracking.
  3. **Folder structure:** The running application will live in a dedicated root-level `app/` folder, while all assessment task documentation and evidence remain inside their respective `task-*/` directories.
  4. **Design system reuse:** Reuse the Task 1 design system tokens (`nc-tokens.css`, typography, colours, and brand shadows) in the scaffolded app views.
  5. **Scope boundary for initial scaffold:** The initial scaffolding prompt and execution remain strictly limited to the project skeleton and a minimal home screen. The database schema, migrations, and database-writing form are deliberately deferred to Step 6 of Task 2.
- **Observed result:** Decision recorded in `task-02-repository-and-scaffold/docs/decision-log.md`. No code scaffolded yet; waiting for learner's first draft of the scaffolding prompt. No commit made.
