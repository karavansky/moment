-- Добавляем поле isAdmin в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE;

-- Устанавливаем администратора для конкретного email
UPDATE users SET "isAdmin" = TRUE WHERE "email" = 'karavansky@gmail.com';

-- Пересоздаем таблицу messages с правильной структурой
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
  "messageID" VARCHAR(20) PRIMARY KEY,
  "ticketID" VARCHAR(20) NOT NULL,
  "userID" VARCHAR(20) NOT NULL,
  "message" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateRead" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_message_ticket FOREIGN KEY ("ticketID") REFERENCES ticket("ticketID") ON DELETE CASCADE,
  CONSTRAINT fk_message_user FOREIGN KEY ("userID") REFERENCES users("userID") ON DELETE CASCADE
);

-- Создаем индексы для быстрого поиска
CREATE INDEX idx_messages_ticketID ON messages("ticketID");
CREATE INDEX idx_messages_userID ON messages("userID");
CREATE INDEX idx_messages_date ON messages("date");
CREATE INDEX idx_messages_isRead ON messages("isRead");

-- Комментарии к полям
COMMENT ON COLUMN messages."messageID" IS 'Уникальный ID сообщения (20 символов)';
COMMENT ON COLUMN messages."ticketID" IS 'ID тикета, к которому относится сообщение';
COMMENT ON COLUMN messages."userID" IS 'ID пользователя, который отправил сообщение';
COMMENT ON COLUMN messages."message" IS 'Текст сообщения';
COMMENT ON COLUMN messages."isAdmin" IS 'Отправлено ли сообщение администратором';
COMMENT ON COLUMN messages."isRead" IS 'Прочитано ли сообщение';
COMMENT ON COLUMN messages."date" IS 'Дата отправки сообщения';
COMMENT ON COLUMN messages."dateRead" IS 'Дата прочтения сообщения';
