-- Migration: Add openAt/closeAt and geolocation fields to reports table
-- Run once against PostgreSQL before deploying code changes

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS "openAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "closeAt" TIMESTAMP WITH TIME ZONE,
  -- Geolocation at Start (when worker presses Start button)
  ADD COLUMN IF NOT EXISTS "openLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "openLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "openAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "openDistanceToAppointment" INTEGER,
  -- Geolocation at Finish (to detect forgotten-finish cases)
  -- If closeAt IS NULL but openAt IS NOT NULL: worker started but never pressed Finish
  -- If closeLatitude IS NULL after closeAt: Finish was pressed without geo permission
  ADD COLUMN IF NOT EXISTS "closeLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "closeLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "closeAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "closeDistanceToAppointment" INTEGER;
