# Database Setup Guide

Быстрая настройка PostgreSQL для проекта QuailBreeder.

## Предварительные требования

- PostgreSQL запущен (в Docker контейнере или локально)
- База данных `quailbreeder` создана
- Пользователь `hronop` с правами доступа

## Шаг 1: Создание таблиц

Выполните скрипт для создания таблиц `users` и `ticket`:

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -f scripts/recreate-tables.sql
```

## Шаг 2: Проверка подключения

```bash
npm run test:db
```

Вы должны увидеть:
```
✅ Successfully connected to PostgreSQL
✅ Users table: 0 records
✅ Ticket table: 0 records
```

## Шаг 3: Настройка переменных окружения

Убедитесь, что в `.env` файле есть:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=quailbreeder
DATABASE_USER=hronop
DATABASE_PASSWORD=hronop
```

## Шаг 4: Запуск приложения

```bash
npm run dev
```

## Проверка работы

1. Откройте http://localhost:3001
2. Нажмите "Sign in with Google"
3. После успешной авторизации пользователь автоматически сохранится в таблицу `users`

Проверить данные:
```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -c "SELECT * FROM users;"
```

## Troubleshooting

Если возникают проблемы, см. [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Быстрые решения:

**"Access Denied" после Google OAuth:**
```bash
# Пересоздать таблицы с правильной структурой
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -f scripts/recreate-tables.sql

# Очистить кеш Next.js
rm -rf .next

# Перезапустить
npm run dev
```

**База данных недоступна:**
```bash
# Проверить контейнер
docker ps | grep postgres

# Или запустить локальный PostgreSQL
sudo service postgresql start
```

## SQL Скрипты

### Очистить все данные (но сохранить структуру)
```sql
TRUNCATE TABLE ticket CASCADE;
TRUNCATE TABLE users CASCADE;
```

### Посмотреть структуру таблиц
```sql
\d users
\d ticket
```

### Посмотреть все индексы
```sql
\di
```

## Полезные команды

```bash
# Подключиться к базе данных
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder

# Экспортировать данные
pg_dump -h localhost -U hronop -d quailbreeder > backup.sql

# Импортировать данные
psql -h localhost -U hronop -d quailbreeder < backup.sql
```
