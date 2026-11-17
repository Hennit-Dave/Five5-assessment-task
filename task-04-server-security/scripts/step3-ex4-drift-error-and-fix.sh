#!/usr/bin/env bash
# Task 4 Step 3 — Exercise 4: Deliberate Schema Drift Error and Fix
# Target database: app/data/step3_disposable_drift.db (DISPOSABLE — never touches app/data/nits_cut.db)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

DRIFT_DB="$REPO_ROOT/app/data/step3_disposable_drift.db"
rm -f "$DRIFT_DB" "${DRIFT_DB}-wal" "${DRIFT_DB}-shm"

echo "=== Task 4 Step 3 (Exercise 4): Deliberate Schema Drift Error & Recovery ==="
echo "Disposable database: $DRIFT_DB"
echo "Real app database (app/data/nits_cut.db) is NOT touched."
echo ""

echo "----------------------------------------------------------------------"
echo "1. Initialize disposable database with baseline 001 migration only"
echo "   (inquiries table has 8 columns and 2 existing rows; no branch_code yet)"
echo "----------------------------------------------------------------------"
node app/src/migrate.js \
  --db "$DRIFT_DB" \
  --dir "$REPO_ROOT/task-04-server-security/migrations-exercises/drift-step1-baseline"

echo ""
echo "Baseline rows in $DRIFT_DB before drift:"
sqlite3 -header -column "$DRIFT_DB" "SELECT id, client_name, phone, garment_type, fitting_date, created_at FROM inquiries ORDER BY id;"
echo ""
echo "Columns actually in $DRIFT_DB inquiries table (8 columns):"
sqlite3 -header -column "$DRIFT_DB" "SELECT cid, name, type, [notnull] FROM pragma_table_info('inquiries');"
echo ""

echo "----------------------------------------------------------------------"
echo "2. Trigger Schema Drift Error:"
echo "   Application client schema (INQUIRIES_SELECT_COLUMNS with SCHEMA_CLIENT_EXPECTS_BRANCH_CODE=1)"
echo "   includes 'branch_code', but the migration has NOT been run on $DRIFT_DB."
echo "----------------------------------------------------------------------"
set +e
DATABASE_PATH="$DRIFT_DB" SCHEMA_CLIENT_EXPECTS_BRANCH_CODE=1 node -e '
import("./app/src/db.js").then(({ getAllInquiries, INQUIRIES_SELECT_COLUMNS, closeDb }) => {
  console.log("[Client Schema] Expected columns:", INQUIRIES_SELECT_COLUMNS.join(", "));
  try {
    const rows = getAllInquiries();
    console.log("[Client Query] Unexpected success:", rows.length);
    process.exitCode = 0;
  } catch (err) {
    console.error("[DRIFT ERROR] Application client query failed against unmigrated database:");
    console.error("  Error name:", err.name);
    console.error("  Error code:", err.code);
    console.error("  Error message:", err.message);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
});
'
DRIFT_EXIT=$?
set -e

echo "Deliberate drift query exit code: $DRIFT_EXIT (expected: 1)"
if [ "$DRIFT_EXIT" -eq 0 ]; then
  echo "[ERROR] Expected deliberate missing-column error, but query succeeded." >&2
  exit 1
fi
echo ""

echo "----------------------------------------------------------------------"
echo "3. Fix the Drift on the SAME database ($DRIFT_DB):"
echo "   Apply the corrective migrations (002a, 002b, 002c) to $DRIFT_DB without"
echo "   deleting it, verify existing enquiry IDs and values survive, and re-run"
echo "   the exact same application query."
echo "----------------------------------------------------------------------"
node app/src/migrate.js \
  --db "$DRIFT_DB" \
  --dir "$REPO_ROOT/task-04-server-security/migrations-exercises/three-step-step3-enforce"

echo ""
echo "--- Verifying existing enquiry IDs and values survived in $DRIFT_DB: ---"
sqlite3 -header -column "$DRIFT_DB" "SELECT id, client_name, phone, garment_type, fitting_date, created_at, branch_code FROM inquiries ORDER BY id;"

echo ""
echo "--- Re-running the same application client query after applying corrective migrations: ---"
DATABASE_PATH="$DRIFT_DB" SCHEMA_CLIENT_EXPECTS_BRANCH_CODE=1 node -e '
import("./app/src/db.js").then(({ getAllInquiries, INQUIRIES_SELECT_COLUMNS, closeDb }) => {
  console.log("[Client Schema] Expected columns:", INQUIRIES_SELECT_COLUMNS.join(", "));
  const rows = getAllInquiries();
  if (rows.length !== 2 || rows[0].id !== 2 || rows[1].id !== 1) {
    throw new Error("Expected existing enquiry IDs 1 and 2 to survive after migration");
  }
  console.log("[Client Query] RESOLVED — fetched", rows.length, "existing row(s) with surviving IDs and backfilled branch_code:");
  console.log(JSON.stringify(rows, null, 2));
  closeDb();
});
'
