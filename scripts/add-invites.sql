-- Добавляем поле status в таблицу users
-- 0 = директор (по умолчанию), 1 = работник, 2 = клиент, 3 = менеджер
ALTER TABLE users ADD COLUMN IF NOT EXISTS "status" INTEGER DEFAULT 0;

-- Таблица приглашений
CREATE TABLE IF NOT EXISTS invites (
  "inviteID" VARCHAR(20) PRIMARY KEY,
  "token" VARCHAR(64) UNIQUE NOT NULL,
  "firmaID" VARCHAR(21) NOT NULL,
  "createdBy" VARCHAR(20) NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invite_firma FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE,
  CONSTRAINT fk_invite_user FOREIGN KEY ("createdBy") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites("token");
CREATE INDEX IF NOT EXISTS idx_invites_firmaID ON invites("firmaID");
