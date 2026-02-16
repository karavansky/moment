# Role-Based Access Control

## Роли пользователей

| Status | Роль | Описание |
|--------|------|----------|
| 0 | Директор | Владелец организации. Полный доступ |
| 1 | Работник | Сотрудник. Видит только свои appointments, может open/close |
| 2 | Клиент | Клиент. Видит только свои appointments, read-only |
| 3 | Менеджер | Полный доступ (как директор) |
| NULL | До миграции | Трактуется как директор |

## UI доступ

| | Director (0) | Manager (3) | Worker (1) | Client (2) | Неавторизованный |
|---|---|---|---|---|---|
| Sidebar | Да | Да | Нет | Нет | Да (демо) |
| Navbar | Да | Да | Да | Да | Да |
| Все маршруты | Да | Да | Нет | Нет | Да (демо) |
| /dienstplan | Да | Да | Да | Да | Да |
| /auth/* | Да | Да | Да | Да | Да |

Worker и Client при попытке открыть любой другой маршрут автоматически перенаправляются на `/dienstplan`.

## Фильтрация данных (API)

### GET /api/scheduling

| Роль | Appointments | Workers/Clients/Teams/... |
|------|-------------|--------------------------|
| Director (0/null) | Все | Все |
| Worker (1) | Только где `workerId` = свой workerID | Все (для отображения) |
| Client (2) | Только где `clientID` = свой clientID | Все (для отображения) |

Связь user → worker/client определяется через колонку `userID` в таблицах `workers`/`clients`:

```
session.user.id → workers."userID" → workers."workerID" → appointments."workerId"
session.user.id → clients."userID" → clients."clientID" → appointments."clientID"
```

### PUT /api/scheduling/appointments

| Роль | Доступ | Разрешённые поля |
|------|--------|------------------|
| Director (0/null) | Полный | Все |
| Worker (1) | Только свои appointments | `isOpen`, `openedAt`, `closedAt` |
| Client (2) | Запрещён (403) | — |

### POST/DELETE (все CRUD routes)

Только Director (status=0/null). Используют `getSchedulingSession()`.

### SSE /api/scheduling/events

Доступен всем авторизованным с `firmaID`. Используют `getAnySchedulingSession()`.

## Реализация

### Auth-check (`app/api/scheduling/auth-check.ts`)

Две функции:

```typescript
// Только директор — для CRUD
getSchedulingSession()
  → status=0 или null/undefined + firmaID

// Любой авторизованный — для GET и SSE
getAnySchedulingSession()
  → любой status + firmaID
```

### Role Guard (`hooks/useRoleGuard.ts`)

Client-side hook в `LayoutClient`:

```typescript
const { isRestricted } = useRoleGuard()
// isRestricted = true для status=1 и status=2
```

- Скрывает `<Sidebar />`
- Редирект на `/dienstplan` при попытке открыть другие маршруты
- Разрешённые маршруты: `/dienstplan`, `/auth/*`

### SchedulingContext

`isLiveMode` включён для всех авторизованных с `firmaID`:

```typescript
isLiveMode = authenticated && (status=0 || status=1 || status=2 || status=null) && firmaID
```

Данные загружаются через API с серверной фильтрацией по роли.

## DB функции

```typescript
// lib/workers.ts
getWorkerByUserID(userID, firmaID) → WorkerRecord | null

// lib/clients.ts
getClientByUserID(userID, firmaID) → ClientRecord | null
```

## Файлы

| Файл | Роль |
|------|------|
| `app/api/scheduling/auth-check.ts` | `getSchedulingSession()` + `getAnySchedulingSession()` |
| `app/api/scheduling/route.ts` | GET с фильтрацией appointments по роли |
| `app/api/scheduling/appointments/route.ts` | PUT с ограничениями для worker/client |
| `hooks/useRoleGuard.ts` | Client-side редирект для ограниченных ролей |
| `components/LayoutClient.tsx` | Условный рендеринг Sidebar |
| `contexts/SchedulingContext.tsx` | isLiveMode для всех ролей |
| `lib/workers.ts` | `getWorkerByUserID()` |
| `lib/clients.ts` | `getClientByUserID()` |
