-- Migration: Add regional settings to users and create cities table
-- Date: 2025-03-19

-- Add regional settings columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS lang VARCHAR(5) NOT NULL DEFAULT 'de',
ADD COLUMN IF NOT EXISTS country VARCHAR(2) NOT NULL DEFAULT 'de',
ADD COLUMN IF NOT EXISTS "citiesID" INTEGER[];

COMMENT ON COLUMN users.lang IS 'User interface language (ISO 639-1 code, e.g., de, en, ru)';
COMMENT ON COLUMN users.country IS 'Country code (ISO 3166-1 alpha-2 lowercase, e.g., de, us, ru) for address autocomplete';
COMMENT ON COLUMN users."citiesID" IS 'Array of city IDs to filter address autocomplete (optional)';

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    "firmaID" VARCHAR(21) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cities_firma FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE
);

COMMENT ON TABLE cities IS 'Cities list for filtering address autocomplete by organization';
COMMENT ON COLUMN cities.city IS 'City name in local language';
COMMENT ON COLUMN cities."firmaID" IS 'Organization ID (VARCHAR 21) that owns this city filter';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cities_firmaid ON cities("firmaID");
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_cities ON users USING GIN ("citiesID");
