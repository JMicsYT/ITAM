-- Migration: add documentUrls to equipment and tokens tables

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS "documentUrls" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tokens    ADD COLUMN IF NOT EXISTS "documentUrls" JSONB NOT NULL DEFAULT '[]'::jsonb;
