-- Migration 001: Initial schema for Nit's Cut Client Inquiries
-- Author: Learner (Nit's Cut Order Portal)
-- Database: SQLite

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

