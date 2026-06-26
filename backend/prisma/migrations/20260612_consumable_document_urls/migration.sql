-- Migration: add documentUrls column to consumables table
-- documentUrls stores JSON array of file paths to attached PDFs

ALTER TABLE consumables ADD COLUMN IF NOT EXISTS "documentUrls" JSONB NOT NULL DEFAULT '[]'::jsonb;
