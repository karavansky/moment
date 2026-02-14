-- Таблица организаций
CREATE TABLE IF NOT EXISTS organisations (
  "firmaID" VARCHAR(21) PRIMARY KEY,
  "name" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Добавить firmaID в users (если ещё нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'firmaID'
  ) THEN
    ALTER TABLE users ADD COLUMN "firmaID" VARCHAR(21);
  END IF;
END $$;

-- Foreign key
ALTER TABLE users
  ADD CONSTRAINT fk_user_organisation
  FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_firmaID ON users("firmaID");
CREATE INDEX IF NOT EXISTS idx_organisations_name ON organisations("name");
