# Invite System

## Обзор

Система инвайтов позволяет директору (status=0) приглашать работников и клиентов в свою организацию. Приглашение содержит QR-код и ссылку для регистрации.

## Поток

```
1. Директор → WorkersTable/ClientsTable → кнопка "Invite"
2. POST /api/invites { status: 1|2|3 }
3. Создание invite в БД (token 64 символа)
4. Ответ: { token, url }
5. UI показывает QR-код (qrcode.react) + URL
6. Приглашённый переходит по ссылке → /auth/register?invite=TOKEN
7. Форма регистрации загружает данные invite (GET /api/invites?token=TOKEN)
8. Показывает название организации, скрывает поле "Organisation"
9. POST /api/auth/register { name, email, password, inviteToken }
10. Создаётся user с firmaID и status из invite
11. Создаётся worker (status=1) или client (status=2) запись
12. Отправляется email для верификации
```

## Роли при инвайте

| Invite status | Роль | Действие при регистрации |
|--------------|------|--------------------------|
| 1 | Работник | Создаётся user + запись в `workers` |
| 2 | Клиент | Создаётся user + запись в `clients` |
| 3 | Менеджер | Создаётся user (без доп. записей) |

## API

### POST /api/invites

Создать invite.

**Auth**: Требуется сессия с `firmaID`.

**Body**:
```json
{ "status": 1 }
```

**Response**:
```json
{
  "token": "a1b2c3...64chars",
  "url": "https://moment-lbs.app/en/auth/register?invite=a1b2c3...64chars"
}
```

### GET /api/invites?token=TOKEN

Валидация invite token.

**Response**:
```json
{
  "firmaID": "RkGvXq9mizBv0c63zO1Hg",
  "organisationName": "Firma GmbH",
  "status": 1
}
```

## БД

```sql
CREATE TABLE invites (
  "inviteID" VARCHAR(20) PRIMARY KEY,
  "token" VARCHAR(64) UNIQUE NOT NULL,
  "firmaID" VARCHAR(21) NOT NULL REFERENCES organisations("firmaID") ON DELETE CASCADE,
  "createdBy" VARCHAR(20) NOT NULL REFERENCES users("userID") ON DELETE CASCADE,
  "status" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Регистрация по invite

`app/api/auth/register/route.ts`:

```typescript
if (inviteToken) {
  const invite = await getInviteByToken(inviteToken)
  if (!invite) return 400

  // Создать user с firmaID и status из invite
  user = await createUserWithPassword(name, email, passwordHash, invite.firmaID, invite.status)

  // Автоматически создать worker или client
  if (invite.status === 1) {
    await createWorker({ userID: user.userID, firmaID: invite.firmaID, name, email })
  } else if (invite.status === 2) {
    await createClient({ userID: user.userID, firmaID: invite.firmaID, name, email })
  }
} else {
  // Обычная регистрация: создать организацию, user со status=0
  const org = await createOrganisation(organisation)
  user = await createUserWithPassword(name, email, passwordHash, org.firmaID, 0)
}
```

## QR-код

Используется библиотека `qrcode.react`:

```tsx
import { QRCodeSVG } from 'qrcode.react'

<QRCodeSVG value={inviteUrl} size={200} />
```

Отображается в модальном окне с кнопкой "Share" (Web Share API / clipboard fallback).

## Файлы

- `lib/invites.ts` — `createInvite()`, `getInviteByToken()`
- `app/api/invites/route.ts` — POST create, GET validate
- `app/api/auth/register/route.ts` — регистрация с invite
- `components/WorkersTable.tsx` — UI инвайта работников (status=1)
- `components/ClientsTable.tsx` — UI инвайта клиентов (status=2)
