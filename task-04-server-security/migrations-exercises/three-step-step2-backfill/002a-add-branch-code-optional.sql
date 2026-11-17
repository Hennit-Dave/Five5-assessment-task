-- Step 1 of 3 (Expand): Add `branch_code` as an optional (nullable) column.
-- Existing rows in `inquiries` receive NULL so the schema change succeeds without data loss.
ALTER TABLE inquiries ADD COLUMN branch_code TEXT;
