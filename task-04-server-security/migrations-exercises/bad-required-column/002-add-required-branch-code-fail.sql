-- Deliberate Failure Migration:
-- Attempting to add a required (NOT NULL) column with no DEFAULT value to a populated table.
-- SQLite rejects this because existing rows in `inquiries` have no value for `branch_code`.
ALTER TABLE inquiries ADD COLUMN branch_code TEXT NOT NULL;
