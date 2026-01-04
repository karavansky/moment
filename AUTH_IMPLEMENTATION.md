# Auth & Database Implementation

Эта документация описывает реализацию аутентификации и работы с базой данных PostgreSQL.

## Структура базы данных

### Таблица `users`
- `userID` (VARCHAR(20)) - уникальный идентификатор пользователя (PRIMARY KEY)
- `name` (VARCHAR(255)) - имя пользователя
- `email` (VARCHAR(255)) - email пользователя (UNIQUE)
- `token` (VARCHAR(500)) - OAuth токен
- `date` (TIMESTAMP WITH TIME ZONE) - дата создания
- `provider` (VARCHAR(50)) - провайдер аутентификации (google/apple)

### Таблица `ticket`
- `ticketID` (VARCHAR(20)) - уникальный идентификатор тикета (PRIMARY KEY)
- `userID` (VARCHAR(20)) - ID пользователя (FOREIGN KEY -> users.userID)
- `subject` (VARCHAR(500)) - тема тикета
- `category` (INTEGER) - категория (1-5)
- `pripority` (INTEGER) - приоритет (1-3)
- `date` (TIMESTAMP WITH TIME ZONE) - дата создания

**Примечание**: Для создания/пересоздания таблиц используйте скрипт:
```bash
PGPASSWORD=hronop psql -h localhost -p 5432 -U hronop -d quailbreeder -f scripts/recreate-tables.sql
```

## Конфигурация

### Переменные окружения (.env)

```env
# NextAuth
AUTH_SECRET=your-auth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret

# PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=quailbreeder
DATABASE_USER=hronop
DATABASE_PASSWORD=hronop
```

## Использование AuthProvider

### В компонентах

```tsx
import { useAuth } from '@/components/AuthProvider'

function MyComponent() {
  const { session, status, signIn, signOut } = useAuth()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'authenticated') {
    return (
      <div>
        <p>Welcome, {session?.user?.name}</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => signIn('google')}>Sign in with Google</button>
      <button onClick={() => signIn('apple')}>Sign in with Apple</button>
    </div>
  )
}
```

### Готовый компонент AuthButtons

```tsx
import { AuthButtons } from '@/components/AuthButtons'

function Navbar() {
  return (
    <nav>
      <AuthButtons />
    </nav>
  )
}
```

## API Endpoints

### POST /api/support/tickets

Создание нового тикета поддержки.

**Требуется аутентификация**

**Body:**
```json
{
  "subject": "Тема тикета",
  "category": "technical|billing|feature|data|other",
  "priority": "low|medium|high",
  "description": "Описание проблемы"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "ticketId": "abc123xyz..."
}
```

## Функции для работы с базой данных

### Пользователи (lib/users.ts)

```typescript
import { createUser, getUserByEmail, getUserById, updateUserToken } from '@/lib/users'

// Создать пользователя
const user = await createUser('John Doe', 'john@example.com', 'token', 'google')

// Получить по email
const user = await getUserByEmail('john@example.com')

// Получить по ID
const user = await getUserById('abc123...')

// Обновить токен
await updateUserToken('abc123...', 'newToken')
```

### Тикеты (lib/tickets.ts)

```typescript
import { createTicket, getTicketsByUserId, getTicketById } from '@/lib/tickets'

// Создать тикет
const ticket = await createTicket('userID', 'Subject', 1, 2)

// Получить тикеты пользователя
const tickets = await getTicketsByUserId('userID')

// Получить тикет по ID
const ticket = await getTicketById('ticketID')
```

## Маппинг значений

### Категории тикетов
- `technical` → 1
- `billing` → 2
- `feature` → 3
- `data` → 4
- `other` → 5

### Приоритеты
- `low` → 1
- `medium` → 2
- `high` → 3

## Архитектура

1. **NextAuth** - обрабатывает OAuth аутентификацию
2. **Callbacks в lib/auth.ts** - сохраняют/обновляют пользователей в PostgreSQL
3. **AuthProvider** - React Context для доступа к сессии
4. **Database utilities** - функции для работы с PostgreSQL
5. **API routes** - обрабатывают создание тикетов

## Безопасность

- Все API endpoints защищены проверкой сессии
- Токены хранятся в базе данных
- JWT сессии для состояния клиента
- Пароли базы данных в переменных окружения
