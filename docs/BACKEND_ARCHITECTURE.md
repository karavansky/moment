# Backend Architecture

## Обзор

Приложение построено на **Next.js App Router** с PostgreSQL в качестве БД. Все API endpoints расположены в `app/api/`. Прямые SQL-запросы через `pg` pool (`lib/db.ts`), без ORM.

## Аутентификация

NextAuth.js с JWT-стратегией. Три провайдера: Google, Apple, Credentials (email/password).

### Роли пользователей (status)

| Status | Роль | Описание |
|--------|------|----------|
| 0 | Директор | Владелец организации. Полный доступ к scheduling, управлению workers/clients |
| 1 | Работник | Сотрудник организации. Выполняет appointments |
| 2 | Клиент | Клиент организации |
| 3 | Менеджер | Менеджер (зарезервировано) |
| NULL | До миграции | Трактуется как директор (status=0) |

### Сессия и JWT

```
authorize() / OAuth → JWT Callback → Session Callback → Client
```

JWT callback (`lib/auth.ts`):
- При первом входе: создает/обновляет пользователя в БД, записывает `userId`, `firmaID`, `status`, `isAdmin` в token
- При каждом запросе: проверяет валидность сессии в БД (`getSession`)

Session callback передает данные из token в `session.user`:
- `id`, `provider`, `isAdmin`, `firmaID`, `organisationName`, `status`

### Паттерн авторизации для Scheduling API

```typescript
// app/api/scheduling/auth-check.ts
export async function getSchedulingSession() {
  const session = await auth()
  if (!session?.user?.firmaID) return null
  const status = session.user.status
  if (status != null && status !== 0) return null // Только директор
  return session
}
```

## Мультитенантность

Все данные scoped по `firmaID`. Каждый запрос фильтруется по `firmaID` из сессии. Пользователь видит только данные своей организации.

## База данных

### Структура таблиц

```
organisations
  ├── users (firmaID FK)
  ├── workers (firmaID FK, userID FK → users)
  ├── clients (firmaID FK, userID FK → users, groupeID FK → groupes)
  ├── teams (firmaID FK)
  ├── groupes (firmaID FK)
  ├── services (firmaID FK, parentId FK → services) — дерево
  ├── appointments (firmaID FK, clientID FK, workerId FK)
  │   └── appointment_services (M2M → services)
  ├── reports (firmaID FK, workerId FK, appointmentId FK)
  │   └── report_photos (reportID FK)
  └── invites (firmaID FK, createdBy FK → users)
```

### ID генерация

- Entity IDs: `generateId(20)` — 20-символьные строки
- Tokens (invite, verification): `generateId(64)` — 64-символьные строки

### Именование колонок

- camelCase с кавычками: `"workerID"`, `"firmaID"`, `"teamName"`
- В frontend типах: `id` вместо `workerID`/`clientID` — маппинг в API route GET

## Scheduling API

### GET /api/scheduling

Загружает все данные для `firmaID` одним запросом:

```json
{
  "user": { "id", "firmaID", "userName" },
  "workers": [...],
  "clients": [...],
  "teams": [...],
  "groupes": [...],
  "services": [...],
  "appointments": [...],
  "reports": [...],
  "firmaID": "..."
}
```

### CRUD Routes

| Route | POST | PUT | DELETE |
|-------|------|-----|--------|
| `/api/scheduling/workers` | Create | Update | Delete |
| `/api/scheduling/clients` | Create | Update | Delete |
| `/api/scheduling/teams` | Create | Update | Delete |
| `/api/scheduling/groupes` | Create | Update | Delete |
| `/api/scheduling/services` | Create | Update | Delete |
| `/api/scheduling/appointments` | Create | Update | Delete |
| `/api/scheduling/reports` | Create | — | — |

Все routes используют `getSchedulingSession()` для авторизации.

### PUT формат

```json
{
  "id": "appointmentID",
  "field1": "value1",
  "field2": "value2"
}
```

Dynamic SET — обновляются только переданные поля.

## SchedulingContext (Frontend)

Двойной режим работы:

- **Live mode** (`isLiveMode = true`): авторизованный директор (status=0 или NULL) с `firmaID` — данные из API, CRUD через fetch
- **Mock mode** (`isLiveMode = false`): неавторизованный пользователь — mock данные, операции только в памяти (демо)

```
isLiveMode = authStatus === 'authenticated'
  && (status === 0 || status == null)
  && !!firmaID
```

Оптимистичные обновления: state обновляется сразу, API-вызов в фоне.

## Файловая структура

```
lib/
  auth.ts          — NextAuth конфигурация
  db.ts            — PostgreSQL pool
  users.ts         — CRUD users
  workers.ts       — CRUD workers
  clients.ts       — CRUD clients
  teams.ts         — CRUD teams
  groupes.ts       — CRUD groupes
  services.ts      — CRUD services
  appointments.ts  — CRUD appointments + pg_notify
  reports.ts       — CRUD reports
  invites.ts       — создание/получение invites
  scheduling-events.ts — PostgreSQL LISTEN singleton

app/api/
  auth/
    register/route.ts    — Регистрация (обычная + по invite)
    confirm/route.ts     — Подтверждение email
    reset-password/route.ts
  scheduling/
    route.ts             — GET all data
    auth-check.ts        — Shared auth helper
    events/route.ts      — SSE endpoint
    workers/route.ts
    clients/route.ts
    teams/route.ts
    groupes/route.ts
    services/route.ts
    appointments/route.ts
    reports/route.ts
  invites/route.ts       — POST create, GET validate

contexts/
  SchedulingContext.tsx   — State management (live/mock)

hooks/
  useSchedulingEvents.ts — SSE EventSource hook
```
