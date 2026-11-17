-- Migration: 002-task04-core-schema.sql
-- Purpose: Create the eight proposed Task 4 tables and their indexes as specified in
--          task-04-server-security/docs/schema.md and evidence/01-schema-drawing.jpg.
-- Existing table preserved: inquiries (declared in 001-initial-schema.sql).

-- Table 1: users
CREATE TABLE users (
  id INTEGER NOT NULL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);

-- Table 2: sessions
CREATE TABLE sessions (
  id INTEGER NOT NULL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Table 3: orders
CREATE TABLE orders (
  id INTEGER NOT NULL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  inquiry_id INTEGER UNIQUE REFERENCES inquiries(id),
  item_count INTEGER NOT NULL,
  total_kobo INTEGER NOT NULL,
  deposit_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Table 5: payment_attempts (Table 4 is existing inquiries)
CREATE TABLE payment_attempts (
  id INTEGER NOT NULL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  failure_code TEXT,
  gateway_reference TEXT UNIQUE,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX idx_payment_attempts_order_id ON payment_attempts(order_id);
CREATE INDEX idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX idx_payment_attempts_status_created_at ON payment_attempts(status, created_at);

-- Table 6: payment_attempt_events
CREATE TABLE payment_attempt_events (
  id INTEGER NOT NULL PRIMARY KEY,
  payment_attempt_id INTEGER NOT NULL REFERENCES payment_attempts(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  gateway_reference TEXT,
  occurred_at TEXT NOT NULL
);

CREATE INDEX idx_payment_attempt_events_attempt_occurred
  ON payment_attempt_events(payment_attempt_id, occurred_at);

-- Table 7: payments
CREATE TABLE payments (
  id INTEGER NOT NULL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  payment_attempt_id INTEGER NOT NULL UNIQUE REFERENCES payment_attempts(id),
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  gateway_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  refunded_amount_kobo INTEGER,
  refund_gateway_reference TEXT UNIQUE,
  refunded_at TEXT
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- Table 8: verification_codes
CREATE TABLE verification_codes (
  id INTEGER NOT NULL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  failed_tries INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX idx_verification_codes_user_expires
  ON verification_codes(user_id, expires_at);

-- Table 9: document_chunks
CREATE TABLE document_chunks (
  id INTEGER NOT NULL PRIMARY KEY,
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding BLOB,
  created_at TEXT NOT NULL,
  UNIQUE (source_file, chunk_index)
);
