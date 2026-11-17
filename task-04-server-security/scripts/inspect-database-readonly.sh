#!/bin/zsh
# Read-only inspection of the Nit's Cut SQLite database (Task 4, Step 2).
# Opens the file with `sqlite3 -readonly`. Does NOT start the application and does NOT run migrations.
# Usage: zsh task-04-server-security/scripts/inspect-database-readonly.sh
cd "$(dirname "$0")/../.." || exit 1
DB="app/data/nits_cut.db"

echo "=== READ-ONLY DATABASE INSPECTION: $DB ($(date '+%Y-%m-%d %H:%M:%S %Z')) ==="
echo "$ sqlite3 -readonly $DB"
echo
echo "--- Objects in sqlite_master ---"
sqlite3 -readonly -header -column "$DB" "SELECT type, name, tbl_name FROM sqlite_master ORDER BY type, name;"
echo
echo "--- Columns: PRAGMA table_info('inquiries') ---"
sqlite3 -readonly -header -column "$DB" "SELECT cid, name, type, \"notnull\" AS not_null, dflt_value, pk FROM pragma_table_info('inquiries');"
echo
echo "--- Indexes: PRAGMA index_list('inquiries') ---"
sqlite3 -readonly -header -column "$DB" "SELECT l.name, l.\"unique\" AS is_unique, i.name AS column_name FROM pragma_index_list('inquiries') l JOIN pragma_index_info(l.name) i;"
echo
echo "--- Row counts ---"
sqlite3 -readonly -header -column "$DB" "SELECT 'inquiries' AS table_name, COUNT(*) AS row_count FROM inquiries;"
echo
echo "--- Settings and integrity ---"
sqlite3 -readonly -header -column "$DB" "SELECT (SELECT journal_mode FROM pragma_journal_mode) AS journal_mode, (SELECT user_version FROM pragma_user_version) AS user_version, (SELECT integrity_check FROM pragma_integrity_check) AS integrity_check;"
echo
echo "--- Proposed Task 4 tables found in this database ---"
sqlite3 -readonly -header -column "$DB" "SELECT COUNT(*) AS proposed_present FROM sqlite_master WHERE type='table' AND name IN ('users','sessions','orders','payment_attempts','payment_attempt_events','payments','verification_codes','document_chunks');"
