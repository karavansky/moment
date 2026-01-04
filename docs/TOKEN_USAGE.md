# OAuth Token - Использование и Альтернативы

## Что такое token в таблице users?

Это **OAuth Access Token** от Google/Apple, который позволяет вашему приложению делать запросы к их API от имени пользователя.

## Когда token НЕ нужен

Если вы используете OAuth **только для аутентификации** (проверка личности), то token можно:

### Вариант 1: Сделать поле необязательным

```sql
ALTER TABLE users ALTER COLUMN "token" DROP NOT NULL;
```

```typescript
// lib/users.ts
export async function createUser(
  name: string,
  email: string,
  token: string | null,  // ← nullable
  provider: string
): Promise<User> {
  // ...
}
```

### Вариант 2: Удалить поле совсем

```sql
ALTER TABLE users DROP COLUMN "token";
```

```typescript
export interface User {
  userID: string
  name: string
  email: string
  // token: string  ← удалено
  date: Date
  provider: string
}
```

## Когда token НУЖЕН

### 1. Интеграция с Google Services

```typescript
// Синхронизация с Google Calendar
async function syncCalendar(userID: string) {
  const user = await getUserById(userID)

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      headers: { Authorization: `Bearer ${user.token}` }
    }
  )

  return response.json()
}
```

### 2. Импорт данных пользователя

```typescript
// Импорт контактов из Google
async function importContacts(userID: string) {
  const user = await getUserById(userID)

  const response = await fetch(
    'https://people.googleapis.com/v1/people/me/connections',
    {
      headers: { Authorization: `Bearer ${user.token}` }
    }
  )

  return response.json()
}
```

### 3. Отправка email от имени пользователя

```typescript
// Отправка через Gmail API
async function sendEmail(userID: string, to: string, subject: string, body: string) {
  const user = await getUserById(userID)

  await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: createEmailRaw(to, subject, body)
    })
  })
}
```

### 4. Доступ к Google Drive

```typescript
// Загрузка файлов в Drive пользователя
async function uploadToUserDrive(userID: string, file: File) {
  const user = await getUserById(userID)

  const formData = new FormData()
  formData.append('file', file)

  await fetch('https://www.googleapis.com/upload/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.token}`
    },
    body: formData
  })
}
```

## Проблемы с токенами

### ⏱️ Срок действия

OAuth Access Token обычно действует **1 час**. После этого нужен **Refresh Token**.

#### Решение: Сохранять Refresh Token

```sql
ALTER TABLE users ADD COLUMN "refreshToken" VARCHAR(500);
```

```typescript
// Обновление access token
async function refreshAccessToken(userID: string) {
  const user = await getUserById(userID)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: user.refreshToken,
      grant_type: 'refresh_token'
    })
  })

  const { access_token } = await response.json()
  await updateUserToken(userID, access_token)

  return access_token
}
```

### 🔐 Безопасность

Token дает полный доступ к данным пользователя.

**Правила безопасности:**
- ✅ Храним в БД с шифрованием
- ✅ Используем только на сервере
- ❌ НИКОГДА не отправляем на клиент
- ❌ НИКОГДА не логируем целиком
- ❌ НИКОГДА не передаем через URL

## Рекомендация для QuailBreeder

Для системы управления перепелами OAuth token **скорее всего НЕ нужен**, так как вы:
- Не интегрируетесь с Google API
- Не импортируете контакты
- Не синхронизируете календарь
- Не работаете с Gmail/Drive

### Упрощенная схема (рекомендуется):

```sql
-- Сделать token необязательным
ALTER TABLE users ALTER COLUMN "token" DROP NOT NULL;
ALTER TABLE users ALTER COLUMN "token" SET DEFAULT '';
```

```typescript
// lib/auth.ts - обновить
const newUser = await createUser(
  user.name,
  user.email,
  '', // ← пустая строка вместо токена
  account.provider
)
```

## Альтернатива: Таблица oauth_tokens

Если планируете интеграцию в будущем:

```sql
CREATE TABLE oauth_tokens (
  "tokenID" VARCHAR(20) PRIMARY KEY,
  "userID" VARCHAR(20) NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "scopes" TEXT[],
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_oauth_user FOREIGN KEY ("userID") REFERENCES users("userID") ON DELETE CASCADE
);
```

**Преимущества:**
- Один пользователь может иметь несколько токенов (Google + Apple)
- Отдельное управление токенами
- Легче обновлять и ротировать токены
- Основная таблица users остается простой
