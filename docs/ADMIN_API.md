# Admin API Documentation

API для системы администрирования тикетов поддержки.

## Аутентификация

Все API endpoints требуют аутентификации через NextAuth session.
Для admin endpoints требуется `isAdmin = true` в профиле пользователя.

## Admin Endpoints

### GET /api/admin/tickets

Получить все тикеты для администратора.

**Требования:**
- Аутентификация
- `isAdmin = true`

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "ticketID": "abc123...",
      "userID": "xyz789...",
      "subject": "Problem with login",
      "category": 1,
      "pripority": 2,
      "date": "2025-12-17T10:00:00.000Z",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "messageCount": 3,
      "unreadCount": 1
    }
  ]
}
```

**Status codes:**
- `200` - Success
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not admin)
- `500` - Internal server error

---

## User Endpoints

### GET /api/tickets/my

Получить все тикеты текущего пользователя.

**Требования:**
- Аутентификация

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "ticketID": "abc123...",
      "subject": "My problem",
      "category": 1,
      "pripority": 2,
      "date": "2025-12-17T10:00:00.000Z",
      "messageCount": 3,
      "unreadCount": 1
    }
  ]
}
```

**Status codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

---

### POST /api/support/tickets

Создать новый тикет.

**Требования:**
- Аутентификация

**Request body:**
```json
{
  "subject": "Problem with feature",
  "category": "technical",
  "priority": "high",
  "description": "Detailed description of the problem"
}
```

**Category options:**
- `technical` → 1
- `billing` → 2
- `feature` → 3
- `data` → 4
- `other` → 5

**Priority options:**
- `low` → 1
- `medium` → 2
- `high` → 3

**Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "ticketId": "abc123..."
}
```

**Status codes:**
- `201` - Created
- `400` - Missing required fields
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

---

## Messages Endpoints

### GET /api/tickets/[ticketID]/messages

Получить все сообщения тикета.

**Требования:**
- Аутентификация
- Владелец тикета ИЛИ администратор

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "messageID": "msg123...",
      "ticketID": "abc123...",
      "userID": "xyz789...",
      "message": "Hello, I have a problem",
      "isAdmin": false,
      "isRead": true,
      "date": "2025-12-17T10:00:00.000Z",
      "dateRead": "2025-12-17T10:05:00.000Z"
    },
    {
      "messageID": "msg456...",
      "ticketID": "abc123...",
      "userID": "admin123...",
      "message": "We're looking into it",
      "isAdmin": true,
      "isRead": false,
      "date": "2025-12-17T10:10:00.000Z",
      "dateRead": null
    }
  ]
}
```

**Side effects:**
- Автоматически помечает сообщения как прочитанные для текущего пользователя

**Status codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not owner and not admin)
- `404` - Ticket not found or user not found
- `500` - Internal server error

---

### POST /api/tickets/[ticketID]/messages

Отправить сообщение в тикет.

**Требования:**
- Аутентификация
- Владелец тикета ИЛИ администратор

**Request body:**
```json
{
  "message": "Thank you for your help!"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "messageID": "msg789...",
    "ticketID": "abc123...",
    "userID": "xyz789...",
    "message": "Thank you for your help!",
    "isAdmin": false,
    "isRead": false,
    "date": "2025-12-17T10:15:00.000Z",
    "dateRead": null
  }
}
```

**Status codes:**
- `201` - Created
- `400` - Message is required
- `401` - Unauthorized
- `403` - Forbidden (not owner and not admin)
- `404` - Ticket not found or user not found
- `500` - Internal server error

---

## Примеры использования

### Frontend: Получить мои тикеты

```typescript
const response = await fetch('/api/tickets/my')
const data = await response.json()

if (data.success) {
  console.log('My tickets:', data.tickets)
}
```

### Frontend: Отправить сообщение

```typescript
const response = await fetch('/api/tickets/abc123/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello, admin!'
  })
})

const data = await response.json()
if (data.success) {
  console.log('Message sent:', data.message)
}
```

### Frontend: Admin получает все тикеты

```typescript
const response = await fetch('/api/admin/tickets')
const data = await response.json()

if (data.success) {
  console.log('All tickets:', data.tickets)

  // Найти тикеты с непрочитанными сообщениями
  const unreadTickets = data.tickets.filter(t => t.unreadCount > 0)
  console.log('Tickets with unread messages:', unreadTickets)
}
```

### Frontend: Получить историю переписки

```typescript
const ticketID = 'abc123...'
const response = await fetch(`/api/tickets/${ticketID}/messages`)
const data = await response.json()

if (data.success) {
  data.messages.forEach(msg => {
    console.log(
      `${msg.isAdmin ? 'Admin' : 'User'}: ${msg.message}`,
      `(${msg.date})`
    )
  })
}
```

## Поля базы данных

### Таблица messages

- `messageID` - VARCHAR(20) PRIMARY KEY
- `ticketID` - VARCHAR(20) FOREIGN KEY → ticket.ticketID
- `userID` - VARCHAR(20) FOREIGN KEY → users.userID
- `message` - TEXT (содержимое сообщения)
- `isAdmin` - BOOLEAN (отправлено администратором?)
- `isRead` - BOOLEAN (прочитано?)
- `date` - TIMESTAMP WITH TIME ZONE (дата отправки)
- `dateRead` - TIMESTAMP WITH TIME ZONE (дата прочтения)

### Таблица users (обновлено)

- `isAdmin` - BOOLEAN DEFAULT FALSE (является ли администратором)

## Безопасность

1. **Проверка прав доступа:**
   - Пользователь может видеть только свои тикеты
   - Администратор может видеть все тикеты
   - Пользователь может отправлять сообщения только в свои тикеты
   - Администратор может отправлять сообщения в любые тикеты

2. **Автоматическая маркировка:**
   - Сообщения автоматически помечаются как от администратора если `user.isAdmin = true`
   - При чтении тикета сообщения автоматически помечаются как прочитанные

3. **Валидация:**
   - Все endpoints проверяют аутентификацию
   - Admin endpoints проверяют `isAdmin` флаг
   - Проверяется существование тикета и пользователя
   - Проверяется право доступа к тикету
