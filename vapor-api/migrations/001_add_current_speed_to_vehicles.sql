-- Add currentSpeed column to vehicles table
-- This stores the last calculated speed (km/h) for dynamic GPS noise filtering

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS "currentSpeed" DOUBLE PRECISION;

-- Add comment
COMMENT ON COLUMN vehicles."currentSpeed" IS 'Current vehicle speed in km/h (calculated from GPS updates)';
