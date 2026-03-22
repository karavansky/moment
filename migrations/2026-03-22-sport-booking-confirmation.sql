-- Migration: Add booking confirmation fields for Sport Booking System
-- Date: 2026-03-22
-- Description: Adds isConfirmed, confirmedBy, confirmedAt fields to appointments table
--              for the Sport- und Bäderamt booking confirmation workflow

-- Add new columns
ALTER TABLE appointments
ADD COLUMN "isConfirmed" BOOLEAN DEFAULT false,
ADD COLUMN "confirmedBy" VARCHAR(21) REFERENCES users("userID"),
ADD COLUMN "confirmedAt" TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX idx_appointments_isconfirmed ON appointments("isConfirmed") WHERE "isConfirmed" = false;
CREATE INDEX idx_appointments_confirmedby ON appointments("confirmedBy");
CREATE INDEX idx_appointments_confirmedat ON appointments("confirmedAt");

-- Set existing appointments as confirmed (backwards compatibility)
-- Only appointments NOT belonging to Sport- und Bäderamt (status=7) organization
UPDATE appointments
SET "isConfirmed" = true
WHERE "firmaID" NOT IN (
  SELECT DISTINCT u."firmaID"
  FROM users u
  WHERE u.status = 7
);

-- Comment the table columns
COMMENT ON COLUMN appointments."isConfirmed" IS 'Whether the appointment has been confirmed by management (status=7). Required for Sport Booking System workflow.';
COMMENT ON COLUMN appointments."confirmedBy" IS 'User ID who confirmed the appointment. Only set when isConfirmed=true.';
COMMENT ON COLUMN appointments."confirmedAt" IS 'Timestamp when the appointment was confirmed.';
