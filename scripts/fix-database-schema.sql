-- Скрипт для исправления структуры таблиц users и ticket
-- Меняем тип "char" на varchar для корректного хранения строк

-- Исправление таблицы users (используем кавычки для чувствительности к регистру)
ALTER TABLE users
  ALTER COLUMN "userID" TYPE VARCHAR(20),
  ALTER COLUMN "name" TYPE VARCHAR(255),
  ALTER COLUMN "email" TYPE VARCHAR(255),
  ALTER COLUMN "token" TYPE VARCHAR(500),
  ALTER COLUMN "provider" TYPE VARCHAR(50);

-- Добавляем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_users_email ON users("email");
CREATE INDEX IF NOT EXISTS idx_users_userID ON users("userID");

-- Исправление таблицы ticket
ALTER TABLE ticket
  ALTER COLUMN "ticketID" TYPE VARCHAR(20),
  ALTER COLUMN "userID" TYPE VARCHAR(20),
  ALTER COLUMN "subject" TYPE VARCHAR(500);

-- Добавляем индексы
CREATE INDEX IF NOT EXISTS idx_ticket_userID ON ticket("userID");
CREATE INDEX IF NOT EXISTS idx_ticket_ticketID ON ticket("ticketID");

-- Изменяем тип date на timestamp для корректного хранения даты и времени
ALTER TABLE users ALTER COLUMN "date" TYPE TIMESTAMP WITH TIME ZONE USING "date"::TIMESTAMP WITH TIME ZONE;
ALTER TABLE ticket ALTER COLUMN "date" TYPE TIMESTAMP WITH TIME ZONE USING "date"::TIMESTAMP WITH TIME ZONE;

-- Добавляем первичные ключи если их нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
    ALTER TABLE users ADD PRIMARY KEY ("userID");
  END IF;
END $$;

-- Добавляем внешний ключ
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_user') THEN
    ALTER TABLE ticket ADD CONSTRAINT fk_ticket_user FOREIGN KEY ("userID") REFERENCES users("userID");
  END IF;
END $$;
