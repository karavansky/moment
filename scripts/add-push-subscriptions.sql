-- Push notification subscriptions (Web Push API)
-- Each user can have multiple subscriptions (different devices/browsers)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  "id" SERIAL PRIMARY KEY,
  "userID" VARCHAR(20) NOT NULL REFERENCES users("userID") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subs_userID ON push_subscriptions("userID");

-- User notification preference (opt-out capability)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "pushNotificationsEnabled" BOOLEAN DEFAULT TRUE;
