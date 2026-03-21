-- Migration: Add createdAt and editedAt to appointments table
-- Date: 2026-03-21
-- Description: Adds createdAt (required) and editedAt (optional) timestamp fields to appointments

BEGIN;

-- Add createdAt column (NOT NULL with default)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();

-- Add editedAt column (nullable)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP;

-- Update existing appointments: set createdAt to the appointment date
-- This is a one-time data migration for existing records
UPDATE appointments
SET "createdAt" = "date"
WHERE "createdAt" = NOW() OR "createdAt" IS NULL;

-- Create index on createdAt for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments("createdAt");

-- Create index on editedAt for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_edited_at ON appointments("editedAt");

COMMIT;

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'appointments'
    AND column_name IN ('createdAt', 'editedAt')
ORDER BY
    column_name;
