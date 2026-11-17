# Task 4, Step 3: Database Migrations (`docs/migrations.md`)

> **Status:** Completed on 2026-11-08. All four Step 3 exercises were executed by the learner and genuine output captured in [`evidence/03-initial-migration.txt`](../evidence/03-initial-migration.txt) (real application database), [`evidence/04-required-column-failure.txt`](../evidence/04-required-column-failure.txt) (disposable database), [`evidence/05-required-column-three-steps.txt`](../evidence/05-required-column-three-steps.txt) (disposable database), and [`evidence/06-drift-error.txt`](../evidence/06-drift-error.txt) (disposable database).

---

## 1. How Migrations Are Controlled in Nit's Cut

### Decoupling `getDb()` from Migration Execution
Before Step 3, calling [`getDb()`](../../app/src/db.js) in [`app/src/db.js`](../../app/src/db.js) automatically looped over every `.sql` file in `app/migrations/` and ran `dbInstance.exec(sql)` on the first database query (note: importing `db.js` alone did not run migrations; calling `getDb()` did). It also lacked a migration-tracking table and left SQLite foreign-key enforcement off (`foreign_keys = 0`).

In Step 3, [`app/src/db.js`](../../app/src/db.js) and [`app/src/migrate.js`](../../app/src/migrate.js) separate normal application queries, read-only status inspection, and writable schema changes:
1. **`getDb()` in [`app/src/db.js`](../../app/src/db.js)** opens the connection, sets `PRAGMA journal_mode = WAL;`, and turns on `PRAGMA foreign_keys = ON;`. It **never** executes migration files automatically.
2. **`inspectMigrationStatus()` (`node app/src/migrate.js --status`) in [`app/src/migrate.js`](../../app/src/migrate.js)** is a strictly read-only inspection path. It opens the existing database with `{ readonly: true, fileMustExist: true }`, does not create directories, files, or tables, and does not change `journal_mode` or any pragma. If `schema_migrations` does not exist yet, it reports that migration tracking has not been initialized and lists all `.sql` files in the target directory as `PENDING`.
3. **`runMigrations()` (`node app/src/migrate.js`) in [`app/src/migrate.js`](../../app/src/migrate.js)** is the explicit writable migration command. It maintains the `schema_migrations` table (`filename`, `checksum_sha256`, `applied_at`), skips migrations that have already run if their SHA-256 checksum matches, rejects any modified historical migration, and runs each new migration inside an atomic transaction (`db.transaction(...)`) with `PRAGMA foreign_keys = ON;` and `PRAGMA foreign_key_check`.

---

## 2. Why Migrations Are Forward-Only and Why Applied Migrations Are Never Edited

1. **Why forward-only:**
   A database contains live state (customer enquiries, orders, payment attempts, and settled payments), not just stateless code. While application code can be rolled back with `git revert`, reversing a structural change in place (such as a `DOWN` script that drops a column or table) risks permanently destroying rows written since the migration ran. Forward-only migrations treat every change—including fixing a mistake or removing a column—as a new numbered migration moving forward in time, so the history of every structural change in production matches the sequence recorded in `schema_migrations`.

2. **Why you never edit a migration that has already run:**
   Once `001-initial-schema.sql` or `002-task04-core-schema.sql` has been applied to a database and recorded in `schema_migrations`, editing that file creates two different schemas under the same migration name: existing environments that already ran `002` never run the edited lines, while fresh environments (new developer machines, staging, or CI) run the modified `002`. Every environment then silently diverges. Our runner [`app/src/migrate.js`](../../app/src/migrate.js) stores `checksum_sha256` for each applied file and halts with a `Forward-only violation` if an already-applied `.sql` file is edited.

---

## 3. Why Run Migrations by Hand Instead of Letting an Agent Run Them — and the Honest Cost

### Why we prohibit the agent from running migrations
An AI coding agent operates quickly and optimistically: if a migration fails or conflicts, an unconstrained agent may be tempted to drop and recreate tables, delete the local `.db` file, edit an already-applied migration, or run destructive SQL against the wrong database file just to make an error disappear. Keeping migrations strictly human-executed ("propose and stop") forces the developer to inspect the exact SQL, verify which database file (`DATABASE_PATH`) is targeted, check whether existing rows need a three-step expand/backfill/enforce plan, and confirm backups before any schema change touches real data.

### The honest cost of running migrations by hand
Running migrations manually is slower and introduces human forgetfulness:
1. **Deployment friction and slower iteration:** Every schema change requires stopping to review the SQL, switching to a terminal, running `npm --prefix app run migrate`, and verifying the output before testing the feature.
2. **People forget to run them (causing schema drift):** When a developer pulls new code or switches branches and forgets to run the migration command by hand, the application code expects columns or tables that do not yet exist in the database, causing runtime errors (`SqliteError: no such column` or `no such table`) until the developer remembers to run the migration.

---

## 4. What Goes Out of Step During Schema Drift (One-Paragraph Explanation)

When you change the schema or query-client definition in code without running the database migration, the **application's data-access client** and the **physical SQLite database file on disk** go out of step with each other. Updating the application code updates its in-memory expectations—the explicit SQL `SELECT` column list (`INQUIRIES_SELECT_COLUMNS` in [`app/src/db.js`](../../app/src/db.js))—so the application immediately begins asking for the new column (`branch_code`) on every query, even though code changes never open or alter the database file. Meanwhile, the physical SQLite table on disk still has only the 8 baseline columns from the last migration that was actually executed (`001-seed-populated-inquiries.sql`). As soon as the running application executes `getAllInquiries()` against that unmigrated database, SQLite rejects the statement with `SqliteError: no such column: branch_code` (`SQLITE_ERROR`) because the code's view of the schema is ahead of the database's actual storage structure. This is an application-query/database schema mismatch caused by unapplied migrations, rather than an ORM-generated client or automatic drift detection (our stack uses parameterized SQLite queries via `better-sqlite3` rather than an ORM like Prisma or Drizzle).

### How Exercise 4 ([`step3-ex4-drift-error-and-fix.sh`](../scripts/step3-ex4-drift-error-and-fix.sh)) Demonstrates and Fixes the Drift
1. **Baseline database state:** On a disposable database (`app/data/step3_disposable_drift.db`), [`app/src/migrate.js`](../../app/src/migrate.js) applies only `001-seed-populated-inquiries.sql`, creating the 8-column `inquiries` table with the 2 existing rows (`id = 1` for `Chinedu Okafor` and `id = 2` for `Babatunde Adeleke`).
2. **Deliberate drift error:** The application query client (`getAllInquiries()` in [`app/src/db.js`](../../app/src/db.js) with `SCHEMA_CLIENT_EXPECTS_BRANCH_CODE=1`) is invoked expecting 9 columns (`id, client_name, phone, garment_type, fabric_choice, fitting_date, status, created_at, branch_code`) before the `branch_code` migrations have been applied to `step3_disposable_drift.db`. The query fails with `SqliteError: no such column: branch_code` (`SQLITE_ERROR`, exit code `1`), exactly capturing the unmigrated schema mismatch.
3. **In-place recovery on the same database:** Without deleting `step3_disposable_drift.db`, [`app/src/migrate.js`](../../app/src/migrate.js) runs against `migrations-exercises/three-step-step3-enforce`. Because `001-seed-populated-inquiries.sql` (`sha256:f29dc3b435c8`) is already recorded in `schema_migrations`, the runner skips `001` and applies only the corrective migrations (`002a`, `002b`, `002c`) to the existing database. Both original enquiry rows (`id = 1` and `id = 2`) and all their displayed values survive intact with `branch_code = 'LAGOS-VI'`, and re-running the exact same `getAllInquiries()` query succeeds.
