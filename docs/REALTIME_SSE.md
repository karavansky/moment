# Real-time: SSE + PostgreSQL LISTEN/NOTIFY

## Обзор

Система реального времени для синхронизации всех данных между всеми пользователями фирмы.
Когда директор создаёт, редактирует или удаляет любую сущность — все подключённые клиенты видят изменения мгновенно, без перезагрузки страницы.

### Поддерживаемые события

**Appointments:**

- `appointment_created` — создание нового appointment
- `appointment_updated` — изменение любого поля (включая open/close, смену состава работников)
- `appointment_deleted` — удаление appointment

**Workers:**

- `worker_created` / `worker_updated` / `worker_deleted`

**Clients:**

- `client_created` / `client_updated` / `client_deleted`

**Teams:**

- `team_created` / `team_updated` / `team_deleted`

**Groupes (категории клиентов):**

- `groupe_created` / `groupe_updated` / `groupe_deleted`

**Services:**

- `service_created` / `service_updated` / `service_deleted`

---

## Архитектура (полная цепочка)

### Appointments (с детальной логикой фильтрации)

```
Директор (браузер)
  │
  │  POST/PUT/DELETE /api/scheduling/appointments
  │
  ▼
lib/appointments.ts
  │  createAppointment() / updateAppointment() / deleteAppointment()
  │  → INSERT/UPDATE/DELETE + INSERT/DELETE appointment_workers
  │  → notifyAppointmentChange() → pg_notify('scheduling_{firmaID}', '{workerIds:[...]}')
  │
  ▼
lib/scheduling-events.ts (LISTEN Singleton)
  │  Dedicated PG Client → on('notification') → callbacks по firmaID
  │
  ▼
app/api/scheduling/events/route.ts (SSE Endpoint)
  │  ReadableStream → `data: {...}\n\n`
  │
  ├──────────────┬──────────────┐
  ▼              ▼              ▼
Worker A      Worker B      Director
EventSource   EventSource   EventSource
  │              │              │
  ▼              ▼              ▼
handleSchedulingEvent() [contexts/SchedulingContext.tsx]
  │
  │  Проверка релевантности:
  │  workerIds.includes(myWorkerID) || existsLocally
  │  → refreshAppointments()
  │    GET /api/scheduling/appointments (role-based фильтрация)
  │
  ▼
setState({ appointments }) → UI обновлён
```

### Workers / Clients / Teams / Groupes / Services (единая схема)

```
Директор (браузер)
  │
  │  POST/PUT/DELETE /api/scheduling/{workers|clients|teams|groupes|services}
  │
  ▼
lib/{workers|clients|teams|groupes|services}.ts
  │  create/update/delete функция
  │  → INSERT/UPDATE/DELETE
  │  → notifyXxxChange() → pg_notify('scheduling_{firmaID}', '{type, firmaID}')
  │
  ▼
lib/scheduling-events.ts (тот же LISTEN Singleton)
  │
  ▼
app/api/scheduling/events/route.ts (тот же SSE Endpoint)
  │
  ▼
handleSchedulingEvent() [contexts/SchedulingContext.tsx]
  │
  │  event.type === 'worker_*' → refreshWorkers()
  │  event.type === 'client_*' → refreshClients()
  │  event.type === 'team_*'   → refreshTeams()
  │  event.type === 'groupe_*' → refreshGroups()
  │  event.type === 'service_*'→ refreshServices()
  │
  ▼
GET /api/scheduling/{workers|clients|teams|groupes|services}
  │
  ▼
setState({ workers|clients|teams|groups|services }) → UI обновлён
```

---

## Структура БД: many-to-many workers

```sql
-- Связующая таблица (scripts/add-appointment-workers.sql)
CREATE TABLE appointment_workers (
  "appointmentID" VARCHAR(20) REFERENCES appointments("appointmentID") ON DELETE CASCADE,
  "workerID"      VARCHAR(20) REFERENCES workers("workerID") ON DELETE CASCADE,
  PRIMARY KEY ("appointmentID", "workerID")
);
```

Поле `appointments.workerId` сохранено для обратной совместимости (хранит первого работника), но **фильтрация и отображение** идут через `appointment_workers`.

---

## Пошаговая цепочка с кодом

### Шаг 1: API получает запрос

**Файл:** `app/api/scheduling/appointments/route.ts`

```typescript
// POST — создание (только директор)
const appointment = await createAppointment(session.user.firmaID!, {
  ...body,
  userID: session.user.id,
})

// PUT — обновление (все роли; worker — только isOpen/openedAt/closedAt)
const appointment = await updateAppointment(id, firmaID, data)

// DELETE — удаление (только директор)
const deleted = await deleteAppointment(id, session.user.firmaID!)
```

То же самое для остальных сущностей:

- `app/api/scheduling/workers/route.ts` → `createWorker` / `updateWorker` / `deleteWorker`
- `app/api/scheduling/clients/route.ts` → `createClient` / `updateClient` / `deleteClient`
- `app/api/scheduling/teams/route.ts` → `createTeam` / `updateTeam` / `deleteTeam`
- `app/api/scheduling/groupes/route.ts` → `createGroupe` / `updateGroupe` / `deleteGroupe`
- `app/api/scheduling/services/route.ts` → `createService` / `updateService` / `deleteService`

---

### Шаг 2: pg_notify из lib-функций

#### Appointments (`lib/appointments.ts`)

Передаёт полный контекст (кто назначен, кто клиент) для умной фильтрации на клиенте:

```typescript
function notifyAppointmentChange(
  firmaID: string,
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted',
  data: {
    appointmentID: string
    workerIds: string[] // ← массив всех работников appointment
    clientID: string
    isOpen?: boolean
    openedAt?: Date | null
    closedAt?: Date | null
  }
) {
  pool.query(`SELECT pg_notify($1, $2)`, [
    getChannel(firmaID),
    JSON.stringify({ type, appointmentID, workerIds, clientID, isOpen, firmaID }),
  ])
}
```

Вызывается после каждой операции:

- `createAppointment()` → `notifyAppointmentChange(firmaID, 'appointment_created', { workerIds, ... })`
- `updateAppointment()` → `notifyAppointmentChange(firmaID, 'appointment_updated', { workerIds, ... })`
- `deleteAppointment()` → предварительно считывает `workerIds` из БД, затем `notifyAppointmentChange(firmaID, 'appointment_deleted', { workerIds, ... })`

#### Workers / Clients / Teams / Groupes / Services

Для остальных сущностей payload минимальный — только тип события и `firmaID`. Клиент в ответ делает полный рефреш конкретной коллекции.

```typescript
// lib/workers.ts
function notifyWorkerChange(
  firmaID: string,
  type: 'worker_created' | 'worker_updated' | 'worker_deleted'
) {
  pool.query(`SELECT pg_notify($1, $2)`, [getChannel(firmaID), JSON.stringify({ type, firmaID })])
}

// Аналогично в lib/clients.ts, lib/teams.ts, lib/groupes.ts, lib/services.ts
```

Вызывается в каждой функции после успешной операции:

```typescript
// createWorker
const created = result.rows[0]
notifyWorkerChange(data.firmaID, 'worker_created')
return created

// updateWorker
const updated = result.rows.length > 0 ? result.rows[0] : null
if (updated) notifyWorkerChange(firmaID, 'worker_updated')
return updated

// deleteWorker
const deleted = (result.rowCount ?? 0) > 0
if (deleted) notifyWorkerChange(firmaID, 'worker_deleted')
return deleted
```

---

### Шаг 3: LISTEN Singleton принимает уведомление

Один dedicated PostgreSQL Client (не из pool) слушает каналы и рассылает callbacks.

**Файл:** `lib/scheduling-events.ts`

```typescript
client.on('notification', msg => {
  const payload = JSON.parse(msg.payload)
  const firmaID = payload.firmaID

  if (firmaID) {
    const callbacks = subscriptions.get(firmaID)
    if (callbacks) {
      for (const cb of callbacks) {
        cb(payload) // → вызывает все SSE-стримы для этого firmaID
      }
    }
  }
})
```

**Зачем отдельный Client, а не pool?**

- `LISTEN` требует постоянного открытого соединения
- Pool возвращает connection после запроса — `LISTEN` прервётся
- Один Client на все каналы — минимум ресурсов

**Reconnect:** при потере соединения через 5 секунд повторное подключение + `LISTEN` на все активные каналы.

---

### Шаг 4: SSE Endpoint отправляет событие в браузер

**Файл:** `app/api/scheduling/events/route.ts`

```typescript
export async function GET(request: Request) {
  const session = await getAnySchedulingSession() // все аутентифицированные роли
  const firmaID = session.user.firmaID!

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

      // Keepalive каждые 30 секунд
      const keepalive = setInterval(() => {
        controller.enqueue(`: keepalive\n\n`)
      }, 30000)

      // Каждое pg_notify событие → SSE стрим
      const unsubscribe = await subscribe(firmaID, payload => {
        controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`)
      })

      request.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        unsubscribe()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

---

### Шаг 5: EventSource в браузере принимает событие

**Файл:** `hooks/useSchedulingEvents.ts`

```typescript
export interface SchedulingEvent {
  type:
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_deleted'
    | 'worker_created'
    | 'worker_updated'
    | 'worker_deleted'
    | 'client_created'
    | 'client_updated'
    | 'client_deleted'
    | 'team_created'
    | 'team_updated'
    | 'team_deleted'
    | 'groupe_created'
    | 'groupe_updated'
    | 'groupe_deleted'
    | 'service_created'
    | 'service_updated'
    | 'service_deleted'
    | 'connected'
  appointmentID?: string
  workerIds?: string[] // только для appointment_*
  clientID?: string // только для appointment_*
  isOpen?: boolean // только для appointment_updated
  openedAt?: string | null
  closedAt?: string | null
  firmaID?: string
}
```

```typescript
export function useSchedulingEvents(
  isLiveMode: boolean,
  onEvent: (event: SchedulingEvent) => void
) {
  useEffect(() => {
    if (!isLiveMode) return

    const eventSource = new EventSource('/api/scheduling/events')
    eventSource.onmessage = e => {
      const data: SchedulingEvent = JSON.parse(e.data)
      if (data.type === 'connected') return
      onEventRef.current(data) // → handleSchedulingEvent
    }
    return () => eventSource.close()
  }, [isLiveMode])
}
```

---

### Шаг 6: SchedulingContext обрабатывает событие

**Файл:** `contexts/SchedulingContext.tsx`, функция `handleSchedulingEvent`

#### 6.1. Маршрутизация по типу события

```typescript
const handleSchedulingEvent = useCallback((event: SchedulingEvent) => {
  // Workers / Clients / Teams / Groupes / Services — простой рефреш коллекции
  if (event.type === 'worker_created' || event.type === 'worker_updated' || event.type === 'worker_deleted') {
    refreshWorkers(); return
  }
  if (event.type === 'client_created' || event.type === 'client_updated' || event.type === 'client_deleted') {
    refreshClients(); return
  }
  if (event.type === 'team_created' || event.type === 'team_updated' || event.type === 'team_deleted') {
    refreshTeams(); return
  }
  if (event.type === 'groupe_created' || event.type === 'groupe_updated' || event.type === 'groupe_deleted') {
    refreshGroups(); return
  }
  if (event.type === 'service_created' || event.type === 'service_updated' || event.type === 'service_deleted') {
    refreshServices(); return
  }

  // Appointments — детальная логика (см. ниже)
  if (!event.appointmentID) return
  // ...
}, [...])
```

#### 6.2. Appointments: проверка релевантности

```typescript
const user = stateRef.current?.user
const existsLocally = stateRef.current?.appointments.some(apt => apt.id === event.appointmentID)
const eventWorkerIds = event.workerIds || []

// Worker: событие релевантно если workerIds включает меня ИЛИ appointment уже в моём state
if (user?.myWorkerID && !eventWorkerIds.includes(user.myWorkerID) && !existsLocally) return
// Client: аналогично по clientID
if (user?.myClientID && event.clientID !== user.myClientID && !existsLocally) return
```

**Почему два условия (includes ИЛИ existsLocally)?**

При смене состава работников (убрали Worker_A, добавили Worker_C):

- `eventWorkerIds` = `['Worker_B', 'Worker_C']` — Worker_A не в массиве
- Без `existsLocally` Worker_A проигнорирует событие → appointment навсегда застрянет в его dienstplan
- С `existsLocally = true` — Worker_A обработает событие → `refreshAppointments()` → API не вернёт этот appointment → он исчезнет

#### 6.3. appointment_created / appointment_deleted

```typescript
if (event.type === 'appointment_created' || event.type === 'appointment_deleted') {
  refreshAppointments()
  return
}
```

#### 6.4. appointment_updated — три стратегии

```typescript
if (event.type === 'appointment_updated') {
  setState(prev => {
    const existing = prev.appointments.find(apt => apt.id === event.appointmentID)

    if (!existing) {
      refreshAppointments(); return prev  // ← назначен на этого работника
    }

    const workersChanged = /* сравнение sorted arrays */ ...
    const clientChanged = event.clientID && event.clientID !== existing.clientID

    if (workersChanged || clientChanged) {
      refreshAppointments(); return prev  // ← смена состава → полный рефреш
    }

    // Быстрое inline-обновление (только isOpen/openedAt/closedAt)
    const updated = {
      ...existing,
      isOpen: event.isOpen ?? existing.isOpen,
      openedAt: ...,
      closedAt: ...,
    }

    // Notification для директора при ОТКРЫТИИ appointment
    if (event.isOpen && !existing.isOpen) {
      addNotification({ type: 'info', title: 'Starting Appointment!', ... })
    }

    // Notification для директора при ЗАКРЫТИИ appointment
    if (!event.isOpen && existing.isOpen) {
      addNotification({ type: 'success', title: 'Appointment Finished!', ... })
      refreshReports()  // ← загрузить отчёт для директора
    }

    return {
      ...prev,
      appointments: prev.appointments.map(apt =>
        apt.id === event.appointmentID ? updated : apt
      ),
    }
  })
}
```

Три стратегии обновления:

1. **Не существует локально** → `refreshAppointments()` (новый для этого пользователя)
2. **workerIds/clientID изменился** → `refreshAppointments()` (смена состава)
3. **Только isOpen/openedAt/closedAt** → inline-обновление без сетевого запроса
   - При **открытии** (`isOpen: true`) — notification директору "Starting Appointment!"
   - При **закрытии** (`isOpen: false`) — notification директору "Appointment Finished!" + `refreshReports()`

---

### Шаг 7: Lightweight refresh функции

**Файл:** `contexts/SchedulingContext.tsx`

Каждая функция загружает **только свою коллекцию** через отдельный GET-эндпоинт, не трогая остальной UI-state.

```typescript
const refreshAppointments = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/appointments')
  const appointments = data.appointments.map(apt => ({
    ...apt,
    date: parseLocalDate(apt.date),
    startTime: apt.startTime ? new Date(apt.startTime) : apt.startTime,
    // ... конвертация дат
  }))
  setState(prev => ({ ...prev, appointments }))
}, [])

const refreshWorkers = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/workers')
  setState(prev => ({ ...prev, workers: data.workers || [] }))
}, [])

const refreshClients = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/clients')
  setState(prev => ({ ...prev, clients: data.clients || [] }))
}, [])

const refreshTeams = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/teams')
  setState(prev => ({ ...prev, teams: data.teams || [] }))
}, [])

const refreshGroups = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/groupes')
  setState(prev => ({ ...prev, groups: data.groupes || [] }))
}, [])

const refreshServices = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/services')
  setState(prev => ({ ...prev, services: data.services || [] }))
}, [])

const refreshReports = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/reports')
  setState(prev => ({ ...prev, reports: data.reports || [] }))
}, [])
```

В отличие от `loadLiveData()`, refresh-функции:

- Загружают **только одну коллекцию** (не все данные сразу)
- **Не сбрасывают** selectedWorker, selectedClient, selectedDate, selectedAppointment, isLoading

Все функции экспортируются через контекст и доступны любому компоненту:

```typescript
const { refreshWorkers, refreshClients, refreshTeams } = useScheduling()
```

---

### Шаг 8: GET-эндпоинты для коллекций

Каждый эндпоинт возвращает маппированные данные в том же формате, что и главный `GET /api/scheduling`.

**`GET /api/scheduling/workers`** — возвращает `{ workers }` с вложенным объектом `team`:

```typescript
const [workersRaw, teamsRaw] = await Promise.all([
  getWorkersByFirmaID(firmaID),
  getTeamsByFirmaID(firmaID),
])
const workers = workersRaw.map(w => {
  const team = w.teamId ? teams.find(t => t.id === w.teamId) : undefined
  return { id: w.workerID, ..., team }
})
```

**`GET /api/scheduling/clients`** — возвращает `{ clients }` с вложенным объектом `groupe`:

```typescript
const [clientsRaw, groupesRaw] = await Promise.all([...])
const clients = clientsRaw.map(c => {
  const groupe = c.groupeID ? groupes.find(g => g.id === c.groupeID) : undefined
  return { id: c.clientID, ..., groupe }
})
```

**`GET /api/scheduling/teams`** — возвращает `{ teams }`

**`GET /api/scheduling/groupes`** — возвращает `{ groupes }`

**`GET /api/scheduling/services`** — возвращает `{ services }`

**`GET /api/scheduling/reports`** — возвращает `{ reports }` с вложенным массивом `photos`:

```typescript
const reportsRaw = await getReportsByFirmaID(firmaID)
const reports = reportsRaw.map(r => ({
  id: r.reportID, firmaID: r.firmaID, workerId: r.workerId,
  appointmentId: r.appointmentId, notes: r.notes, date: r.date,
  openAt: r.openAt, closeAt: r.closeAt, ...,
  photos: (r.photos || []).map(p => ({ id: p.photoID, url: p.url, note: p.note }))
}))
```

Все эндпоинты используют `getAnySchedulingSession()` — доступны для всех ролей (директор, работник, клиент).

---

## Сценарии

### Директор создаёт нового работника

```
Директор: POST /api/scheduling/workers { name, teamId, ... }
  → createWorker() [lib/workers.ts]
    → INSERT INTO workers
    → notifyWorkerChange(firmaID, 'worker_created')
      → pg_notify('scheduling_{firmaID}', '{"type":"worker_created","firmaID":"..."}')

Все подключённые клиенты получают SSE:
  → handleSchedulingEvent: type === 'worker_created'
  → refreshWorkers()
    → GET /api/scheduling/workers
    → setState({ workers: [...новый список...] })
  → Таблица WorkersTable обновляется у всех ✓
```

### Директор переименовывает команду

```
Директор: PUT /api/scheduling/teams { id, teamName: 'New Name' }
  → updateTeam() [lib/teams.ts]
    → UPDATE teams SET "teamName" = 'New Name'
    → notifyTeamChange(firmaID, 'team_updated')

Все клиенты:
  → refreshTeams()
  → setState({ teams: [...] })
  → Фильтр по командам в WorkersTable обновляется ✓
  → У workers поле team.teamName тоже обновится при следующем refreshWorkers()
    (или через refreshData() для полной синхронизации)
```

### Создание appointment с двумя работниками

```
Директор: POST { workerIds: ['Worker_A', 'Worker_B'], clientID: 'Client_1', ... }
  → createAppointment() → INSERT + notifyAppointmentChange('appointment_created', {
      workerIds: ['Worker_A', 'Worker_B'], ...
    })

Worker_A: eventWorkerIds.includes('Worker_A') = true
  → refreshAppointments() → appointment ПОЯВЛЯЕТСЯ в dienstplan ✓

Worker_B: eventWorkerIds.includes('Worker_B') = true
  → refreshAppointments() → appointment ПОЯВЛЯЕТСЯ в dienstplan ✓
```

### Убрали Worker_A, добавили Worker_C

```
Директор: PUT { id, workerIds: ['Worker_B', 'Worker_C'] }
  → updateAppointment() → notifyAppointmentChange('appointment_updated', {
      workerIds: ['Worker_B', 'Worker_C'], ...
    })

Worker_A: includes('Worker_A') = false, НО existsLocally = true
  → workersChanged = true → refreshAppointments()
  → API не вернёт appointment → ИСЧЕЗАЕТ из dienstplan ✓

Worker_B: existsLocally = true, workersChanged = true
  → refreshAppointments() → ОБНОВЛЯЕТСЯ ✓

Worker_C: includes('Worker_C') = true, existsLocally = false
  → !existing → refreshAppointments() → ПОЯВЛЯЕТСЯ ✓
```

### Работник завершает встречу (Finish)

```
Worker: нажимает "Finish" в AppointmentReport.tsx
  → PATCH /api/reports/{reportId} { close: true }
    → closeAt = NOW() (серверное время)
  → closeAppointment(appointmentId)  [contexts/SchedulingContext.tsx]
    → PUT /api/scheduling/appointments { id, isOpen: false, closedAt }
      → updateAppointment() [lib/appointments.ts]
        → pg_notify('scheduling_{firmaID}', '{
            "type":"appointment_updated",
            "isOpen":false,
            "closedAt":"2026-02-27T...",
            "workerIds":["w1"],
            ...}')
        → sendPushToDirectors: "Appointment Finished" (push notification)

Директор получает SSE:
  → handleSchedulingEvent: type === 'appointment_updated'
  → isOpenChanged = true, !event.isOpen && existing.isOpen = true
  → inline update: isOpen=false, closedAt=...
  → addNotification: "Appointment Finished!" (in-app) ✓
  → refreshReports()
    → GET /api/scheduling/reports
    → setState({ reports: [...с новым отчётом...] })
  → Директор видит отчёт без перезагрузки ✓
```

---

## Файлы

### Ядро SSE-инфраструктуры (общее для всех событий)

| Файл                                 | Назначение                                                  |
| ------------------------------------ | ----------------------------------------------------------- |
| `lib/scheduling-events.ts`           | LISTEN Singleton — dedicated PG Client, подписки по firmaID |
| `app/api/scheduling/events/route.ts` | SSE Endpoint — ReadableStream + keepalive 30s               |
| `hooks/useSchedulingEvents.ts`       | EventSource hook — авто-переподключение, типы событий       |

### Appointments

| Файл                                       | Назначение                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `lib/appointments.ts`                      | CRUD + `notifyAppointmentChange()` с `workerIds[]` + `sendAppointmentPush()` (start/finish push) |
| `app/api/scheduling/appointments/route.ts` | GET (role-based фильтрация) + POST/PUT/DELETE                                                    |
| `app/api/scheduling/_helpers.ts`           | `mapAppointmentToFrontend()` — маппинг `workers_data[]` → `worker[]`                             |

### Workers / Clients / Teams / Groupes / Services / Reports

| Файл                                   | Назначение                                     |
| -------------------------------------- | ---------------------------------------------- |
| `lib/workers.ts`                       | CRUD + `notifyWorkerChange()`                  |
| `lib/clients.ts`                       | CRUD + `notifyClientChange()`                  |
| `lib/teams.ts`                         | CRUD + `notifyTeamChange()`                    |
| `lib/groupes.ts`                       | CRUD + `notifyGroupeChange()`                  |
| `lib/services.ts`                      | CRUD + `notifyServiceChange()`                 |
| `lib/reports.ts`                       | CRUD + `getReportsByFirmaID()`                 |
| `app/api/scheduling/workers/route.ts`  | GET (workers + teams join) + POST/PUT/DELETE   |
| `app/api/scheduling/clients/route.ts`  | GET (clients + groupes join) + POST/PUT/DELETE |
| `app/api/scheduling/teams/route.ts`    | GET + POST/PUT/DELETE                          |
| `app/api/scheduling/groupes/route.ts`  | GET + POST/PUT/DELETE                          |
| `app/api/scheduling/services/route.ts` | GET + POST/PUT/DELETE                          |
| `app/api/scheduling/reports/route.ts`  | GET (reports + photos) + POST                  |

### Context

| Файл                             | Назначение                                                               |
| -------------------------------- | ------------------------------------------------------------------------ |
| `contexts/SchedulingContext.tsx` | `refreshAppointments/Workers/Clients/Teams/Groups/Services/Reports()`    |
| `contexts/SchedulingContext.tsx` | `handleSchedulingEvent()` — маршрутизация + notifications (start/finish) |

---

## Тестирование

### DevTools → Network → EventStream

1. Открыть `/dienstplan` залогиненным пользователем
2. Network tab → фильтр `events` → запрос к `/api/scheduling/events`
3. EventStream tab должен показать `data: {"type":"connected"}`
4. При создании работника — `data: {"type":"worker_created","firmaID":"..."}`

### Через curl

```bash
# Создать работника
curl -X POST http://localhost:3000/api/scheduling/workers \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -d '{"id":"worker_1","name":"Hans","surname":"Mueller","teamId":"team_1"}'

# Создать appointment с двумя работниками
curl -X POST http://localhost:3000/api/scheduling/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -d '{"clientID":"c1","workerIds":["w1","w2"],"date":"2026-02-16","startTime":"2026-02-16T08:00:00Z","endTime":"2026-02-16T09:00:00Z","duration":60}'

# Изменить состав работников
curl -X PUT http://localhost:3000/api/scheduling/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -d '{"id":"APPOINTMENT_ID","workerIds":["w2","w3"]}'
```

### Проверка pg_notify в psql

```sql
-- Терминал 1: подписка
LISTEN "scheduling_your_firma_id";

-- Терминал 2: симуляция создания работника
SELECT pg_notify('scheduling_your_firma_id',
  '{"type":"worker_created","firmaID":"your_firma_id"}');

-- Терминал 2: симуляция создания appointment
SELECT pg_notify('scheduling_your_firma_id',
  '{"type":"appointment_created","appointmentID":"test","workerIds":["w1","w2"],"clientID":"c1","firmaID":"your_firma_id"}');
```

### Проверка junction-таблицы

```sql
-- Все работники appointment
SELECT * FROM appointment_workers WHERE "appointmentID" = 'xxx';

-- Все appointments работника
SELECT a.* FROM appointments a
JOIN appointment_workers aw ON a."appointmentID" = aw."appointmentID"
WHERE aw."workerID" = 'worker_id';
```

---

## Решение проблемы "Спящего фонового режима" (PWA Soft Reload)

### Проблема разорванного SSE

Когда PWA (или вкладка браузера) сворачивается на мобильном устройстве (например, iPad) или переходит в спящий режим для экономии батареи, операционная система принудительно разрывает все активные сетевые соединения, включая `EventSource` (SSE).

Пока устройство "спит", сервер продолжает отправлять `pg_notify` события об изменениях (например, когда кто-то другой создает новый _appointment_). Но спящий клиент их **не получает**.

Когда приложение возвращается в активный режим (foreground), `EventSource` переподключается и начинает слушать _новые_ события, но пропущенные старые события навсегда теряются. Кроме того, внутреннее состояние React компонентов (например, зафиксированная дата `new Date()`) может устареть, если во время сна наступили новые сутки.

### Решение: Глобальный реконнект и `useVisibilityRefresh`

Мы выяснили, что нативная функция авто-реконнекта у `EventSource` работает нестабильно на смартфонах/планшетах при выходе из долгого спящего режима. Браузер может просто не проснуться для фоновых задач.

Поэтому мы реализовали **двухуровневую глобальную защиту**:

#### 1. Мягкая перерисовка календаря

Компонент `DienstplanView` и другие используют хук `useVisibilityRefresh()`.
Этот хук слушает `visibilitychange` и при разблокировке экрана проверяет, не наступили ли новые сутки (чтобы сместить маркер "сегодня" на сетке без `location.reload()`).

#### 2. Глобальный Resync данных (Double-Check)

В базовом подключении SSE (`hooks/useSchedulingEvents`) мы завели свой `visibilitychange` лисенер.
Как только приложение возвращается из фона (`document.visibilityState === 'visible'`), хук **принудительно закрывает старое, потенциально мертвое соединение и переподключает SSE**.

После успешного переподключения (событие `connected`) хук дергает коллбек `onReconnect`. Этот коллбек ловится в глобальном провайдере `SchedulingContext.tsx`, который в фоне вызывает функцию `loadLiveData()`.

```tsx
// hooks/useSchedulingEvents.ts
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    connect() // Force new connection
  }
}

// ... внутри connect() ...
if (data.type === 'connected' && hasConnectedOnce && onReconnectRef.current) {
  onReconnectRef.current() // Trigger global data sync
}
```

```tsx
// contexts/SchedulingContext.tsx
useSchedulingEvents(isLiveMode, handleSchedulingEvent, loadLiveData)
```

Такой паттерн с разовым глобальным GET-запросом (`loadLiveData()`) после переподключения к сокету гарантирует, что **абсолютно все данные** (appointments, team members, workers, reports) во всем PWA синхронизируются мгновенно, даже если устройство проспало без интернета несколько дней. И всё это происходит незаметно для пользователя.
