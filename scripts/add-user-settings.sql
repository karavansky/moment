-- Add geolocationEnabled column to users table
-- pushNotificationsEnabled already exists from push-subscriptions migration

ALTER TABLE users ADD COLUMN IF NOT EXISTS "geolocationEnabled" BOOLEAN DEFAULT TRUE;
