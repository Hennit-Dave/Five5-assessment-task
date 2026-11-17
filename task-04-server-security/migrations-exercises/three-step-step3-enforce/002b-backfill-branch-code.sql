-- Step 2 of 3 (Backfill): Populate `branch_code` for all existing rows where it is NULL.
UPDATE inquiries
SET branch_code = 'LAGOS-VI'
WHERE branch_code IS NULL;
