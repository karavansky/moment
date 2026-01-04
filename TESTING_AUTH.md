# Тестирование аутентификации

## Шаги для проверки

### 1. Остановите текущий dev сервер

Нажмите `Ctrl+C` в терминале где запущен `npm run dev`

### 2. Очистите кеш Next.js

```bash
rm -rf .next
```

### 3. Запустите dev сервер

```bash
npm run dev
```

### 4. Откройте браузер

Откройте консоль разработчика (F12) во вкладке Console

### 5. Авторизуйтесь через Google

Нажмите кнопку "Sign in with Google" и завершите авторизацию

### 6. Проверьте логи в терминале

Вы должны увидеть следующие сообщения:

```
[JWT Callback] User signing in: { email: 'your@email.com', name: 'Your Name', provider: 'google' }
[JWT Callback] Checking if user exists in DB...
[getUserByEmail] Looking for user with email: your@email.com
[getUserByEmail] Query result: User not found
[JWT Callback] User does not exist, creating new user...
[createUser] Creating user with values: { userID: 'abc123...', name: 'Your Name', email: 'your@email.com', provider: 'google' }
[createUser] User created successfully: { userID: 'abc123...', ... }
[JWT Callback] New user created. UserID: abc123...
```

### 7. Проверьте базу данных

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -c "SELECT * FROM users;"
```

Вы должны увидеть вашего пользователя в таблице.

### 8. Повторная авторизация

Выйдите и войдите снова. Теперь вы должны увидеть:

```
[JWT Callback] User signing in: { email: 'your@email.com', name: 'Your Name', provider: 'google' }
[JWT Callback] Checking if user exists in DB...
[getUserByEmail] Looking for user with email: your@email.com
[getUserByEmail] Query result: User found
[JWT Callback] User exists, updating token. UserID: abc123...
[updateUserToken] Updating token for userID: abc123...
[updateUserToken] Token updated successfully
```

## Возможные проблемы

### Проблема: Не вижу логов в терминале

**Решение**: Убедитесь что вы смотрите в правильный терминал, где запущен `npm run dev`

### Проблема: Ошибка "Error saving user to database"

**Решение**: Проверьте подключение к базе данных:

```bash
npm run test:db
```

Если тест не проходит:
1. Убедитесь что PostgreSQL запущен
2. Проверьте переменные окружения в `.env`
3. Проверьте что база данных `quailbreeder` существует

### Проблема: Пользователь не создается в БД, но ошибок нет

**Причины**:
1. Callback может вызываться в edge runtime, где переменные окружения недоступны
2. Неправильная структура таблиц

**Решение**:

1. Пересоздать таблицы:
```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -f scripts/recreate-tables.sql
```

2. Проверить переменные окружения:
```bash
grep DATABASE .env
```

3. Перезапустить сервер:
```bash
rm -rf .next
npm run dev
```

### Проблема: JWT callback не вызывается

Если вообще не видите логов `[JWT Callback]`, проверьте:

1. Файл был сохранен: `lib/auth.ts`
2. Кеш очищен: `rm -rf .next`
3. Сервер перезапущен

## Тест создания тикета

После успешной авторизации:

1. Перейдите на страницу поддержки
2. Заполните форму тикета
3. Отправьте

Проверьте в базе:

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -c "SELECT * FROM ticket;"
```

## Debug режим NextAuth

Для еще более детального логирования добавьте в `.env`:

```env
AUTH_DEBUG=true
```

И перезапустите сервер.
