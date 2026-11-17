-- Step 3 of 3 (Contract / Enforce NOT NULL):
-- Rebuild `inquiries` with `branch_code TEXT NOT NULL`, copy all backfilled rows,
-- swap the table, and recreate `idx_inquiries_created_at`.
CREATE TABLE inquiries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  garment_type TEXT NOT NULL,
  fabric_choice TEXT NOT NULL,
  fitting_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Inquiry Received',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  branch_code TEXT NOT NULL
);

INSERT INTO inquiries_new (
  id, client_name, phone, garment_type, fabric_choice, fitting_date, status, created_at, branch_code
)
SELECT
  id, client_name, phone, garment_type, fabric_choice, fitting_date, status, created_at, branch_code
FROM inquiries;

DROP TABLE inquiries;
ALTER TABLE inquiries_new RENAME TO inquiries;
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at);
