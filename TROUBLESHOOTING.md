# Troubleshooting Guide

## Access Denied after Google OAuth

### Проблема
После успешной авторизации в Google появляется ошибка:
```
Access Denied
You do not have permission to sign in.
```

В логах:
```
[auth][error] AccessDenied: AccessDenied
Error in signIn callback: ...
```

### Причина
Ошибка возникает когда callback `signIn` в NextAuth возвращает `false`. Это может произойти из-за:
1. Проблем с подключением к базе данных
2. Ошибок при сохранении пользователя
3. Неправильной структуры таблиц

### Решение

#### 1. Проверьте подключение к базе данных
```bash
npm run test:db
```

Если тест не проходит, проверьте переменные окружения в `.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=quailbreeder
DATABASE_USER=hronop
DATABASE_PASSWORD=hronop
```

#### 2. Проверьте структуру таблиц

Правильная структура таблицы `users`:
```sql
CREATE TABLE users (
  "userID" VARCHAR(20) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "token" VARCHAR(500) NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "provider" VARCHAR(50) NOT NULL
);
```

Правильная структура таблицы `ticket`:
```sql
CREATE TABLE ticket (
  "ticketID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) NOT NULL,
  "subject" VARCHAR(500) NOT NULL,
  "category" INTEGER NOT NULL,
  "pripority" INTEGER NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_ticket_user FOREIGN KEY ("userID") REFERENCES users("userID")
);
```

#### 3. Пересоздайте таблицы (если структура неправильная)

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -f scripts/recreate-tables.sql
```

**⚠️ ВНИМАНИЕ**: Это удалит все существующие данные в таблицах `users` и `ticket`!

#### 4. Очистите кеш Next.js и перезапустите

```bash
rm -rf .next
npm run dev
```

## Частые ошибки с типами данных PostgreSQL

### Проблема: Данные обрезаются или не сохраняются

**Причина**: Использование типа `"char"` (с кавычками) вместо `VARCHAR`.

Тип `"char"` в PostgreSQL - это внутренний системный тип, который хранит только 1 байт.
Для строк используйте `VARCHAR(n)` или `TEXT`.

**Неправильно:**
```sql
CREATE TABLE users (
  email "char"  -- Сохранит только 1 символ!
);
```

**Правильно:**
```sql
CREATE TABLE users (
  email VARCHAR(255)  -- Сохранит до 255 символов
);
```

### Проблема: Ошибка при INSERT с датами

**Причина**: Использование `TIME WITH TIME ZONE` вместо `TIMESTAMP WITH TIME ZONE`.

`TIME` хранит только время суток (например, 14:30:00), без даты.
`TIMESTAMP` хранит дату и время вместе.

**Неправильно:**
```sql
date TIME WITH TIME ZONE
```

**Правильно:**
```sql
date TIMESTAMP WITH TIME ZONE
```

## Логирование и отладка

### Включить детальное логирование NextAuth

В файле `lib/auth.ts` добавьте:

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  // ... остальная конфигурация
  debug: true, // Включает детальное логирование
})
```

### Проверить логи PostgreSQL

```bash
docker logs <container_name> --tail 100
```

### Проверить данные в базе

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder

# В консоли psql:
SELECT * FROM users;
SELECT * FROM ticket;
```

## Server Action errors

### Проблема: "Failed to find Server Action"

**Причина**: Устаревший кеш Next.js после изменений в коде.

**Решение**:
```bash
rm -rf .next
npm run build  # или npm run dev
```

## Проблемы с Docker

### База данных недоступна

Проверьте, что контейнер PostgreSQL запущен:
```bash
docker ps | grep postgres
```

Проверьте порты:
```bash
netstat -tulpn | grep 5432
```

Проверьте подключение:
```bash
docker exec -it <postgres_container> psql -U hronop -d quailbreeder
```
