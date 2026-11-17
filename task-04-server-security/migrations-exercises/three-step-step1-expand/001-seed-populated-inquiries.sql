-- Disposable Exercise Baseline: Populated inquiries table (matches 001-initial-schema.sql + 2 rows)
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  garment_type TEXT NOT NULL,
  fabric_choice TEXT NOT NULL,
  fitting_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Inquiry Received',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

INSERT INTO inquiries (id, client_name, phone, garment_type, fabric_choice, fitting_date, status, created_at)
VALUES
  (1, 'Chinedu Okafor', '+234 803 555 0142', 'Agbada Three-Piece', 'Cashmere Wool — Charcoal', '2026-11-18', 'Inquiry Received', '2026-10-30 17:48:43'),
  (2, 'Babatunde Adeleke', '+234 809 555 0198', 'Senator Native Wear', 'Aso-Oke Handwoven — Navy', '2026-11-24', 'Inquiry Received', '2026-10-30 17:51:01');
