#!/usr/bin/env bash
# Task 4 Step 3 — Exercise 3: Safe Three-Step Required Column Addition (Expand -> Backfill -> Enforce NOT NULL)
# Target database: app/data/step3_disposable_required_col.db (DISPOSABLE — never touches app/data/nits_cut.db)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

DISPOSABLE_DB="$REPO_ROOT/app/data/step3_disposable_required_col.db"

echo "=== Task 4 Step 3 (Exercise 3): Three-Step Required Column Addition ==="
echo "Disposable database: $DISPOSABLE_DB"
echo "Real app database (app/data/nits_cut.db) is NOT touched."
echo ""

echo "======================================================================"
echo "STEP 1 OF 3 (EXPAND): Add branch_code as optional (nullable)"
echo "======================================================================"
node app/src/migrate.js \
  --db "$DISPOSABLE_DB" \
  --dir "$REPO_ROOT/task-04-server-security/migrations-exercises/three-step-step1-expand"
echo "--- Rows after Step 1 (branch_code is NULL on existing rows): ---"
sqlite3 -header -column "$DISPOSABLE_DB" "SELECT id, client_name, COALESCE(branch_code, '<NULL>') AS branch_code FROM inquiries ORDER BY id;"
echo ""

echo "======================================================================"
echo "STEP 2 OF 3 (BACKFILL): Populate branch_code for existing rows"
echo "======================================================================"
node app/src/migrate.js \
  --db "$DISPOSABLE_DB" \
  --dir "$REPO_ROOT/task-04-server-security/migrations-exercises/three-step-step2-backfill"
echo "--- Rows after Step 2 (branch_code backfilled to 'LAGOS-VI'): ---"
sqlite3 -header -column "$DISPOSABLE_DB" "SELECT id, client_name, branch_code FROM inquiries ORDER BY id;"
echo ""

echo "======================================================================"
echo "STEP 3 OF 3 (CONTRACT / ENFORCE): Rebuild table with branch_code NOT NULL"
echo "======================================================================"
node app/src/migrate.js \
  --db "$DISPOSABLE_DB" \
  --dir "$REPO_ROOT/task-04-server-security/migrations-exercises/three-step-step3-enforce"
echo "--- PRAGMA table_info(inquiries) after Step 3 (branch_code notnull = 1): ---"
sqlite3 -header -column "$DISPOSABLE_DB" "PRAGMA table_info(inquiries);"
echo ""
echo "--- Verifying NOT NULL constraint now blocks inserting a NULL branch_code: ---"
set +e
sqlite3 "$DISPOSABLE_DB" "INSERT INTO inquiries (client_name, phone, garment_type, fabric_choice, fitting_date, branch_code) VALUES ('Test Client', '+2348000000000', 'Senator', 'Wool', '2026-12-01', NULL);" 2>&1
NULL_INSERT_EXIT=$?
set -e
echo "NULL insert exit code: $NULL_INSERT_EXIT (expected non-zero because branch_code is now NOT NULL)"
