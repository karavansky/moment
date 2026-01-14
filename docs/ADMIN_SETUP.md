# Admin Panel Setup

Руководство по настройке системы администрирования тикетов.

## Что реализовано

### 1. ✅ База данных

**Таблица users:**

- Добавлено поле `isAdmin` (BOOLEAN, по умолчанию FALSE)
- Email `karavansky@gmail.com` установлен как администратор

**Таблица messages:**

- `messageID` - уникальный ID сообщения
- `ticketID` - связь с тикетом
- `userID` - кто отправил сообщение
- `message` - текст сообщения
- `isAdmin` - флаг сообщения от администратора
- `isRead` - прочитано ли сообщение
- `date` - дата отправки
- `dateRead` - дата прочтения

### 2. ✅ API Endpoints

**Для администратора:**

- `GET /api/admin/tickets` - все тикеты с статистикой

**Для пользователей:**

- `GET /api/tickets/my` - мои тикеты
- `POST /api/support/tickets` - создать тикет (+ автоматически создается первое сообщение)

**Для переписки:**

- `GET /api/tickets/[ticketID]/messages` - получить все сообщения
- `POST /api/tickets/[ticketID]/messages` - отправить сообщение

### 3. ✅ Утилиты

- [lib/messages.ts](../lib/messages.ts) - функции для работы с сообщениями
- [lib/users.ts](../lib/users.ts) - обновлен интерфейс User с полем `isAdmin`

## Текущее состояние

Проверьте администратора:

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -c "SELECT \"email\", \"isAdmin\" FROM users;"
```

Должны увидеть:

```
        email         | isAdmin
----------------------+---------
 karavansky@gmail.com | t
```

## Как работает система

### Создание тикета пользователем

1. Пользователь заполняет форму поддержки:
   - Subject (тема)
   - Category (категория)
   - Priority (приоритет)
   - Description (описание проблемы)

2. При отправке:
   - Создается тикет в таблице `ticket`
   - Автоматически создается первое сообщение с `description`
   - Сообщение помечается как `isAdmin = false`

### Ответ администратора

1. Администратор заходит в систему (email: karavansky@gmail.com)
2. Видит все тикеты через `GET /api/admin/tickets`
3. Открывает тикет и видит историю переписки
4. Отправляет ответ через `POST /api/tickets/[ticketID]/messages`
5. Ответ автоматически помечается как `isAdmin = true`

### Просмотр пользователем

1. Пользователь заходит в раздел "Мои тикеты"
2. Видит список своих тикетов с количеством непрочитанных сообщений
3. Открывает тикет
4. Видит ответ администратора
5. Может продолжить переписку

## Добавление новых администраторов

### Вариант 1: SQL команда

```sql
UPDATE users SET "isAdmin" = TRUE WHERE "email" = 'new-admin@example.com';
```

### Вариант 2: Скрипт

```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -c "UPDATE users SET \"isAdmin\" = TRUE WHERE \"email\" = 'new-admin@example.com';"
```

### Вариант 3: Автоматически при создании

Раскомментируйте и отредактируйте в `lib/users.ts`:

```typescript
export async function createUser(
  name: string,
  email: string,
  token: string,
  provider: string
): Promise<User> {
  // Список email администраторов
  const adminEmails = ['karavansky@gmail.com', 'admin@moment-lbs.app']

  const isAdmin = adminEmails.includes(email)

  // ... остальной код
}
```

## Структура переписки

```
Тикет #abc123
├── Message #1 (от пользователя)
│   └── "У меня проблема с входом"
├── Message #2 (от админа)
│   └── "Спасибо за обращение. Проверяем..."
├── Message #3 (от пользователя)
│   └── "Спасибо, жду ответа"
└── Message #4 (от админа)
    └── "Проблема решена. Попробуйте войти сейчас."
```

## Примеры запросов

### Получить все тикеты (админ)

```bash
curl -X GET http://localhost:3001/api/admin/tickets \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

### Отправить сообщение

```bash
curl -X POST http://localhost:3001/api/tickets/abc123/messages \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from admin!"}'
```

### Получить историю переписки

```bash
curl -X GET http://localhost:3001/api/tickets/abc123/messages \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

## Следующие шаги

### Frontend компоненты (нужно создать):

1. **Admin Dashboard**
   - `/app/[lang]/admin/tickets/page.tsx`
   - Список всех тикетов
   - Фильтры по статусу, приоритету
   - Индикатор непрочитанных сообщений

2. **Ticket Chat Component**
   - `components/TicketChat.tsx`
   - Отображение истории переписки
   - Форма для отправки сообщения
   - Auto-refresh или WebSocket для real-time

3. **User Tickets Page**
   - `/app/[lang]/tickets/page.tsx`
   - Мои тикеты
   - Статус каждого тикета
   - Количество непрочитанных ответов

4. **Ticket Detail Page**
   - `/app/[lang]/tickets/[ticketID]/page.tsx`
   - Полная история переписки
   - Возможность ответить

### Улучшения:

- [ ] Email уведомления при новых сообщениях
- [ ] Push уведомления
- [ ] Статусы тикетов (открыт, в работе, закрыт)
- [ ] Прикрепление файлов
- [ ] WebSocket для real-time обновлений
- [ ] Поиск по тикетам
- [ ] Экспорт переписки в PDF

## Безопасность

✅ **Реализовано:**

- Проверка аутентификации на всех endpoints
- Проверка прав доступа (владелец или админ)
- Автоматическая маркировка сообщений от админа
- Foreign keys для целостности данных

⚠️ **Рекомендации:**

- Rate limiting для API endpoints
- Валидация длины сообщений (max 10000 символов)
- XSS защита при отображении сообщений
- CSRF токены (встроены в NextAuth)

## Тестирование

```bash
# 1. Создать тикет как пользователь
# 2. Проверить, что он появился в admin панели
# 3. Ответить как администратор
# 4. Проверить, что пользователь видит ответ
# 5. Продолжить переписку
```

## Документация

- [ADMIN_API.md](ADMIN_API.md) - полное описание всех API endpoints
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - настройка базы данных
- [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) - система аутентификации
