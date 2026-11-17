#!/usr/bin/env bash
# Task 4 Step 3 — Exercise 2: Required-Column Failure on a Populated Table
# Target database: app/data/step3_disposable_required_col.db (DISPOSABLE — never touches app/data/nits_cut.db)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

DISPOSABLE_DB="$REPO_ROOT/app/data/step3_disposable_required_col.db"
rm -f "$DISPOSABLE_DB" "${DISPOSABLE_DB}-wal" "${DISPOSABLE_DB}-shm"

echo "=== Task 4 Step 3 (Exercise 2): Add Required Column to Populated Table (Failure) ==="
echo "Disposable database: $DISPOSABLE_DB"
echo "Real app database (app/data/nits_cut.db) is NOT touched."
echo ""

echo "--- Running migration runner against disposable database ---"
node app/src/migrate.js \
  --db "$DISPOSABLE_DB" \
  --dir "$REPO_ROOT/task-04-server-security/migrations-exercises/bad-required-column"
EXIT_CODE=$?

echo ""
echo "--- Migration runner exit code: $EXIT_CODE (expected: 1) ---"
echo "--- Verifying populated rows in disposable database remain intact after rollback ---"
sqlite3 -header -column "$DISPOSABLE_DB" "SELECT id, client_name, garment_type, fitting_date FROM inquiries ORDER BY id;"
sqlite3 -header -column "$DISPOSABLE_DB" "SELECT filename, applied_at FROM schema_migrations ORDER BY filename;"
