-- Удаляем старые таблицы и создаем новые с правильными типами
DROP TABLE IF EXISTS ticket CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Создаем таблицу users с правильными типами
CREATE TABLE users (
  "userID" VARCHAR(20) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "token" VARCHAR(500) NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provider" VARCHAR(50) NOT NULL
);

-- Создаем таблицу ticket с правильными типами
CREATE TABLE ticket (
  "ticketID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) NOT NULL,
  "subject" VARCHAR(500) NOT NULL,
  "category" INTEGER NOT NULL,
  "pripority" INTEGER NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_user FOREIGN KEY ("userID") REFERENCES users("userID") ON DELETE CASCADE
);

-- Создаем индексы
CREATE INDEX idx_users_email ON users("email");
CREATE INDEX idx_ticket_userID ON ticket("userID");
CREATE INDEX idx_ticket_date ON ticket("date");
