-- Миграция: Email+Password авторизация + DB-сессии
-- Расширение таблицы users для поддержки credentials-авторизации
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT FALSE;

-- Делаем token необязательным (для credentials-пользователей токена нет)
ALTER TABLE users ALTER COLUMN "token" DROP NOT NULL;

-- Устанавливаем дефолтный provider
ALTER TABLE users ALTER COLUMN "provider" SET DEFAULT 'credentials';

-- OAuth-пользователи считаются верифицированными
UPDATE users SET "emailVerified" = TRUE WHERE "provider" IN ('google', 'apple');

-- Таблица сессий для принудительной инвалидации и отслеживания
CREATE TABLE IF NOT EXISTS sessions (
  "sessionID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "ip" VARCHAR(45),
  CONSTRAINT fk_session_user FOREIGN KEY ("userID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_userID ON sessions("userID");
CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions("expiresAt");

-- Таблица токенов верификации email и сброса пароля
CREATE TABLE IF NOT EXISTS verification_tokens (
  "tokenID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) NOT NULL,
  "token" VARCHAR(64) NOT NULL UNIQUE,
  "type" VARCHAR(20) NOT NULL, -- 'email_verify' | 'password_reset'
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "usedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vtoken_user FOREIGN KEY ("userID") REFERENCES users("userID") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vtokens_token ON verification_tokens("token");
CREATE INDEX IF NOT EXISTS idx_vtokens_userID ON verification_tokens("userID");
