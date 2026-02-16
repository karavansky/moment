# Real-time: SSE + PostgreSQL LISTEN/NOTIFY

## Обзор

Система реального времени для синхронизации appointments между всеми пользователями.
Каждый appointment может иметь **несколько работников** (many-to-many через `appointment_workers`).
Когда директор создаёт, редактирует, удаляет или переназначает appointment — все назначенные работники (и клиент) видят изменения мгновенно, без перезагрузки страницы.

Поддерживаемые события:
- **appointment_created** — создание нового appointment
- **appointment_updated** — изменение любого поля (включая open/close, смену состава работников)
- **appointment_deleted** — удаление appointment

---

## Архитектура (полная цепочка)

```
Директор (браузер)
  │
  │  POST/PUT/DELETE /api/scheduling/appointments
  │
  ▼
API Route ──────────────────────────────────────────────────────┐
  │                                                             │
  │  createAppointment() / updateAppointment() /                │
  │  deleteAppointment()                                        │
  ▼                                                             │
PostgreSQL                                                      │
  │                                                             │
  │  INSERT/UPDATE/DELETE appointments                          │
  │  INSERT/DELETE appointment_workers (many-to-many)           │
  │  +                                                          │
  │  pg_notify('scheduling_{firmaID}', '{ workerIds: [...] }') │
  │                                                             │
  ▼                                                             │
LISTEN Singleton (lib/scheduling-events.ts)                     │
  │                                                             │
  │  Dedicated PG Client → on('notification')                   │
  │  → callbacks по firmaID                                     │
  │                                                             │
  ▼                                                             │
SSE Endpoint (app/api/scheduling/events/route.ts)               │
  │                                                             │
  │  ReadableStream → `data: {...}\n\n`                         │
  │                                                             │
  ├──────────────────┬──────────────────┐                       │
  ▼                  ▼                  ▼                       │
Worker A           Worker B          Director                   │
EventSource        EventSource       EventSource                │
  │                  │                  │                        │
  ▼                  ▼                  ▼                        │
handleSchedulingEvent()                                         │
  │                                                             │
  │  Проверка релевантности:                                    │
  │  workerIds.includes(myWorkerID) || existsLocally            │
  │  → refreshAppointments()                                    │
  │    GET /api/scheduling/appointments  ◄──────────────────────┘
  │    (role-based фильтрация: workerIds.includes())
  │
  ▼
setState({ appointments }) → Dienstplan обновлён
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

Директор вызывает POST/PUT/DELETE через UI.

**Файл:** `app/api/scheduling/appointments/route.ts`

POST (создание, строки 51–68):
```typescript
export async function POST(request: Request) {
  const session = await getSchedulingSession() // только директор
  const body = await request.json()
  // body содержит workerIds: string[] — массив ID работников
  const appointment = await createAppointment(session.user.firmaID!, {
    ...body,
    userID: session.user.id,
  })
  return NextResponse.json(appointment)
}
```

PUT (обновление, строки 70–120):
```typescript
export async function PUT(request: Request) {
  const session = await getAnySchedulingSession() // все роли
  // Worker (status=1): только isOpen/openedAt/closedAt для своих appointments
  // Director (status=0/null): полный доступ, включая workerIds[]
  const appointment = await updateAppointment(id, firmaID, data)
  return NextResponse.json(appointment)
}
```

DELETE (удаление, строки 122–140):
```typescript
export async function DELETE(request: Request) {
  const session = await getSchedulingSession() // только директор
  const deleted = await deleteAppointment(id, session.user.firmaID!)
  return NextResponse.json({ success: true })
}
```

---

### Шаг 2: PostgreSQL + appointment_workers + pg_notify

Каждая CRUD-операция записывает в БД, обновляет junction-таблицу и вызывает `pg_notify`.

**Файл:** `lib/appointments.ts`

Общая функция уведомления (строки 8–27):
```typescript
function notifyAppointmentChange(
  firmaID: string,
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted',
  data: {
    appointmentID: string;
    workerIds: string[];    // ← массив всех работников appointment
    clientID: string;
    isOpen?: boolean;
    openedAt?: Date | null;
    closedAt?: Date | null;
  }
) {
  const channel = getChannel(firmaID)
  pool.query(`SELECT pg_notify($1, $2)`, [
    channel,
    JSON.stringify({
      type,
      appointmentID: data.appointmentID,
      workerIds: data.workerIds,   // массив, не один ID
      clientID: data.clientID,
      isOpen: data.isOpen,
      openedAt: data.openedAt,
      closedAt: data.closedAt,
      firmaID,
    }),
  ])
}
```

**createAppointment** (строки 90–121):
```typescript
// Вставляем в junction-таблицу appointment_workers
if (data.workerIds.length > 0) {
  await client.query(
    `INSERT INTO appointment_workers ("appointmentID", "workerID") VALUES ...`,
    [appointmentID, ...data.workerIds]
  )
}
await client.query('COMMIT')

notifyAppointmentChange(firmaID, 'appointment_created', {
  appointmentID: created.appointmentID,
  workerIds: data.workerIds,     // все назначенные работники
  clientID: created.clientID,
})
```

**updateAppointment** (строки 262–274):
```typescript
// Пересоздаём связи в appointment_workers
if (data.workerIds !== undefined) {
  await dbClient.query(
    `DELETE FROM appointment_workers WHERE "appointmentID" = $1`, [appointmentID]
  )
  if (data.workerIds.length > 0) {
    await dbClient.query(
      `INSERT INTO appointment_workers ("appointmentID", "workerID") VALUES ...`,
      [appointmentID, ...data.workerIds]
    )
  }
}
await dbClient.query('COMMIT')

// Получаем актуальный список workerIds ПОСЛЕ обновления
const workerIdsResult = await pool.query(
  `SELECT "workerID" FROM appointment_workers WHERE "appointmentID" = $1`, [appointmentID]
)
notifyAppointmentChange(firmaID, 'appointment_updated', {
  appointmentID, workerIds, clientID, isOpen, openedAt, closedAt,
})
```

**deleteAppointment** (строки 291–318):
```typescript
// Получаем workerIds ДО удаления (для notification)
const existing = await pool.query(
  `SELECT a."appointmentID", a."clientID",
          COALESCE(array_agg(aw."workerID"), ARRAY[]::VARCHAR[]) AS "workerIds"
   FROM appointments a
   LEFT JOIN appointment_workers aw ON a."appointmentID" = aw."appointmentID"
   WHERE a."appointmentID" = $1 AND a."firmaID" = $2
   GROUP BY a."appointmentID"`,
  [appointmentID, firmaID]
)
await pool.query(`DELETE FROM appointments WHERE ...`)

notifyAppointmentChange(firmaID, 'appointment_deleted', {
  appointmentID, workerIds: row.workerIds.filter(Boolean), clientID,
})
```

---

### Шаг 3: SQL-запрос: получение appointments с массивом workers

**Файл:** `lib/appointments.ts`, функция `getAppointmentsByFirmaID` (строки 132–178)

```sql
SELECT
  a.*,
  -- Клиент (JSON-объект)
  json_build_object('id', c."clientID", ...) AS client,
  -- Все работники appointment (JSON-массив через subquery)
  COALESCE(
    (SELECT json_agg(json_build_object('id', w2."workerID", 'name', w2."name", ...))
     FROM appointment_workers aw2
     JOIN workers w2 ON aw2."workerID" = w2."workerID"
     WHERE aw2."appointmentID" = a."appointmentID"),
    '[]'
  ) AS workers_data,
  -- Массив workerID (для фильтрации на сервере)
  COALESCE(
    (SELECT array_agg(aw3."workerID")
     FROM appointment_workers aw3
     WHERE aw3."appointmentID" = a."appointmentID"),
    ARRAY[]::VARCHAR[]
  ) AS "workerIds",
  -- Услуги
  COALESCE(json_agg(...) FILTER (WHERE s."serviceID" IS NOT NULL), '[]') AS services
FROM appointments a
JOIN clients c ON a."clientID" = c."clientID"
LEFT JOIN appointment_services aps ON a."appointmentID" = aps."appointmentID"
LEFT JOIN services s ON aps."serviceID" = s."serviceID"
WHERE a."firmaID" = $1
GROUP BY a."appointmentID", c."clientID"
```

Ключевое: `workers_data` — JSON-массив с полными данными работников, `workerIds` — массив ID для серверной фильтрации.

---

### Шаг 4: Маппинг DB → Frontend

**Файл:** `app/api/scheduling/_helpers.ts`

```typescript
export function mapAppointmentToFrontend(a: any) {
  return {
    id: a.appointmentID,
    workerId: a.workerId,          // legacy (первый работник)
    workerIds: a.workerIds || [],  // массив всех ID
    worker: (a.workers_data || []).map((w: any) => ({
      id: w.id, name: w.name, surname: w.surname, ...
    })),
    client: a.client ? { ... } : undefined,
    services: (a.services || []).map(...),
    // ... остальные поля
  }
}
```

Используется в обоих GET-эндпоинтах: `/api/scheduling` и `/api/scheduling/appointments`.

---

### Шаг 5: LISTEN Singleton принимает уведомление

Один dedicated PostgreSQL Client (не из pool) слушает каналы и рассылает callbacks.

**Файл:** `lib/scheduling-events.ts`

Обработка notification (строки 59–81):
```typescript
client.on('notification', (msg) => {
  if (!msg.payload) return
  const payload = JSON.parse(msg.payload)
  const firmaID = payload.firmaID

  if (firmaID) {
    const callbacks = subscriptions.get(firmaID)
    if (callbacks) {
      for (const cb of callbacks) {
        cb(payload)  // → вызывает все SSE-стримы подписанные на этот firmaID
      }
    }
  }
})
```

**Зачем отдельный Client, а не pool?**
- `LISTEN` требует постоянного открытого соединения
- Pool возвращает connection после запроса — `LISTEN` прервётся
- Один Client на все каналы — минимум ресурсов

**Reconnect:** при потере соединения через 5 секунд повторное подключение + `LISTEN` на все активные каналы (строки 87–92).

---

### Шаг 6: SSE Endpoint отправляет событие в браузер

**Файл:** `app/api/scheduling/events/route.ts`

```typescript
export async function GET(request: Request) {
  const session = await getAnySchedulingSession()  // все аутентифицированные роли
  const firmaID = session.user.firmaID!

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

      // Keepalive каждые 30 секунд
      const keepalive = setInterval(() => {
        controller.enqueue(`: keepalive\n\n`)
      }, 30000)

      // Каждое pg_notify событие → SSE стрим
      const unsubscribe = await subscribe(firmaID, (payload) => {
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

### Шаг 7: EventSource в браузере принимает событие

**Файл:** `hooks/useSchedulingEvents.ts`

```typescript
export function useSchedulingEvents(
  isLiveMode: boolean,
  onEvent: (event: SchedulingEvent) => void
) {
  useEffect(() => {
    if (!isLiveMode) return

    const eventSource = new EventSource('/api/scheduling/events')
    eventSource.onmessage = (e) => {
      const data: SchedulingEvent = JSON.parse(e.data)
      if (data.type === 'connected') return
      onEventRef.current(data)  // → handleSchedulingEvent
    }
    return () => eventSource.close()
  }, [isLiveMode])
}
```

Формат события (строки 5–14):
```typescript
export interface SchedulingEvent {
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'connected'
  appointmentID?: string
  workerIds?: string[]     // ← массив ID работников
  clientID?: string
  isOpen?: boolean
  openedAt?: string | null
  closedAt?: string | null
  firmaID?: string
}
```

---

### Шаг 8: SchedulingContext обрабатывает событие

**Файл:** `contexts/SchedulingContext.tsx`

#### 8.1. Проверка релевантности (строки 312–319)

```typescript
const user = stateRef.current?.user
const existsLocally = stateRef.current?.appointments.some(
  apt => apt.id === event.appointmentID
)
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

#### 8.2. appointment_created / appointment_deleted (строки 321–324)

```typescript
if (event.type === 'appointment_created' || event.type === 'appointment_deleted') {
  refreshAppointments()
  return
}
```

#### 8.3. appointment_updated (строки 327–390)

```typescript
if (event.type === 'appointment_updated') {
  setState(prev => {
    const existing = prev.appointments.find(apt => apt.id === event.appointmentID)

    if (!existing) {
      // Не в локальном state — назначен на этого работника
      refreshAppointments()
      return prev
    }

    // Сравниваем состав работников
    const existingWorkerIds = existing.worker?.map(w => w.id).sort() || []
    const newWorkerIds = [...eventWorkerIds].sort()
    const workersChanged = existingWorkerIds.length !== newWorkerIds.length ||
      existingWorkerIds.some((id, i) => id !== newWorkerIds[i])

    if (workersChanged || (event.clientID && event.clientID !== existing.clientID)) {
      // Состав работников или клиент изменился → полный рефреш
      refreshAppointments()
      return prev
    }

    // Быстрое inline-обновление (isOpen/openedAt/closedAt)
    const updated = {
      ...existing,
      isOpen: event.isOpen ?? existing.isOpen,
      openedAt: event.openedAt ? new Date(event.openedAt) : existing.openedAt,
      closedAt: event.closedAt ? new Date(event.closedAt) : existing.closedAt,
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

#### 8.4. refreshAppointments — лёгкий рефреш (строки 278–295)

```typescript
const refreshAppointments = useCallback(async () => {
  const data = await apiFetch('/api/scheduling/appointments')
  const appointments = (data.appointments || []).map((apt) => ({
    ...apt,
    date: new Date(apt.date),
    startTime: apt.startTime ? new Date(apt.startTime) : apt.startTime,
    endTime: apt.endTime ? new Date(apt.endTime) : apt.endTime,
    openedAt: apt.openedAt ? new Date(apt.openedAt) : apt.openedAt,
    closedAt: apt.closedAt ? new Date(apt.closedAt) : apt.closedAt,
  }))
  setState(prev => ({ ...prev, appointments }))  // НЕ сбрасывает UI-state
}, [])
```

В отличие от `loadLiveData()`, `refreshAppointments()`:
- Загружает **только** appointments через `GET /api/scheduling/appointments`
- **Не сбрасывает** selectedWorker, selectedClient, selectedDate, selectedAppointment

---

### Шаг 9: GET /api/scheduling/appointments — серверная фильтрация

**Файл:** `app/api/scheduling/appointments/route.ts` (строки 12–46)

```typescript
const appointmentsRaw = await getAppointmentsByFirmaID(firmaID)

let filtered = appointmentsRaw
if (userStatus === 1) {
  // Worker: appointment где он в массиве workerIds
  const myWorker = await getWorkerByUserID(userId, firmaID)
  filtered = myWorker
    ? appointmentsRaw.filter(a => (a.workerIds || []).includes(myWorker.workerID))
    : []
} else if (userStatus === 2) {
  // Client: appointment где он клиент
  const myClient = await getClientByUserID(userId, firmaID)
  filtered = myClient
    ? appointmentsRaw.filter(a => a.clientID === myClient.clientID)
    : []
}
// Director/Manager: все appointments без фильтрации

const appointments = filtered.map(mapAppointmentToFrontend)
```

---

## Сценарии

### Создание appointment с двумя работниками

```
Директор: POST { workerIds: ['Worker_A', 'Worker_B'], clientID: 'Client_1', ... }
  → createAppointment()              [lib/appointments.ts:65]
    → INSERT INTO appointments        [строка 79]
    → INSERT INTO appointment_workers [строка 97] ← Worker_A и Worker_B
    → COMMIT                          [строка 113]
    → notifyAppointmentChange('appointment_created', {
        workerIds: ['Worker_A', 'Worker_B'], ...
      })                              [строка 116]
  → pg_notify → LISTEN singleton → SSE stream

Worker_A получает SSE:
  → eventWorkerIds.includes('Worker_A') = true  [строка 318]
  → type === 'appointment_created'               [строка 321]
  → refreshAppointments()                        [строка 322]
  → API вернёт этот appointment (workerIds includes Worker_A)
  → appointment ПОЯВЛЯЕТСЯ в dienstplan

Worker_B получает SSE:
  → eventWorkerIds.includes('Worker_B') = true   [строка 318]
  → та же цепочка → appointment ПОЯВЛЯЕТСЯ в dienstplan
```

### Убрали Worker_A, добавили Worker_C

```
Директор: PUT { id, workerIds: ['Worker_B', 'Worker_C'] }
  → updateAppointment()
    → DELETE FROM appointment_workers WHERE appointmentID = ...  [строка 264]
    → INSERT INTO appointment_workers Worker_B, Worker_C          [строка 272]
    → COMMIT
    → notifyAppointmentChange('appointment_updated', {
        workerIds: ['Worker_B', 'Worker_C'], ...
      })

Worker_A получает SSE:
  → eventWorkerIds = ['Worker_B', 'Worker_C']
  → includes('Worker_A') = false                  [строка 318]
  → НО existsLocally = true (appointment был у Worker_A)  [строка 316]
  → проходит фильтр
  → appointment_updated → workersChanged = true   [строки 340-343]
  → refreshAppointments()                         [строка 346]
  → API НЕ вернёт (workerIds не включает Worker_A)
  → appointment ИСЧЕЗАЕТ из dienstplan Worker_A ✓

Worker_B получает SSE:
  → includes('Worker_B') = true → existsLocally = true
  → workersChanged = true (был [A,B], стал [B,C])
  → refreshAppointments()
  → API вернёт обновлённый appointment с Worker_B и Worker_C
  → appointment ОБНОВЛЯЕТСЯ в dienstplan Worker_B ✓

Worker_C получает SSE:
  → includes('Worker_C') = true → existsLocally = false
  → проходит фильтр (includes = true)
  → appointment_updated → !existing              [строка 333]
  → refreshAppointments()                         [строка 335]
  → API ВЕРНЁТ appointment (workerIds includes Worker_C)
  → appointment ПОЯВЛЯЕТСЯ в dienstplan Worker_C ✓
```

### Удаление appointment

```
Директор: DELETE { id }
  → deleteAppointment()              [lib/appointments.ts:291]
    → SELECT workerIds ДО удаления    [строка 294]
    → DELETE FROM appointments         [строка 303]
      (cascade → appointment_workers тоже удалится)
    → notifyAppointmentChange('appointment_deleted', {
        workerIds: ['Worker_A', 'Worker_B'], ...
      })

Worker_A и Worker_B получают SSE:
  → includes(myWorkerID) = true
  → type === 'appointment_deleted'
  → refreshAppointments()
  → API НЕ вернёт удалённый appointment
  → appointment ИСЧЕЗАЕТ из dienstplan ✓
```

### Работник открывает appointment

```
Worker_A: PUT { id, isOpen: true, openedAt: '2026-02-16T08:00:00Z' }
  → updateAppointment() (workerIds не передаётся → junction-таблица не трогается)
    → UPDATE appointments SET "isOpen" = true, "openedAt" = '...'
    → notifyAppointmentChange('appointment_updated', {
        workerIds: ['Worker_A', 'Worker_B'], ...  ← текущий состав
      })

Director получает SSE:
  → workersChanged = false, clientID не изменился
  → inline-обновление: isOpen=true, openedAt    [строки 350-356]
  → Notification: 'Worker_A, Worker_B started an appointment with ...'  [строка 361]
  → Карта показывает ElapsedTimer

Worker_B получает SSE:
  → includes('Worker_B') = true, existsLocally = true
  → workersChanged = false
  → inline-обновление isOpen/openedAt           [строки 350-356]
```

---

## Файлы

| Файл | Строки | Назначение |
|------|--------|------------|
| `scripts/add-appointment-workers.sql` | — | SQL-миграция: создание junction-таблицы, перенос данных |
| `lib/appointments.ts` | 8–27 | `notifyAppointmentChange()` — pg_notify с `workerIds[]` |
| `lib/appointments.ts` | 90–100 | CREATE: INSERT INTO `appointment_workers` |
| `lib/appointments.ts` | 113–121 | CREATE: notify с `workerIds` |
| `lib/appointments.ts` | 262–274 | UPDATE: DELETE + INSERT `appointment_workers` |
| `lib/appointments.ts` | 132–178 | GET: SQL-запрос с subquery для `workers_data` и `workerIds` |
| `lib/appointments.ts` | 291–318 | DELETE: SELECT workerIds до удаления, notify |
| `lib/scheduling-events.ts` | 59–81 | LISTEN singleton — приём pg notification, рассылка callbacks |
| `lib/scheduling-events.ts` | 122–163 | `subscribe()` / `unsubscribe()` — управление подписками |
| `app/api/scheduling/_helpers.ts` | 1–59 | `mapAppointmentToFrontend()` — маппинг `workers_data[]` → `worker[]` |
| `app/api/scheduling/events/route.ts` | 6–64 | SSE endpoint — ReadableStream + keepalive |
| `app/api/scheduling/appointments/route.ts` | 12–46 | GET: фильтрация `workerIds.includes(myWorkerID)` |
| `hooks/useSchedulingEvents.ts` | 5–14 | `SchedulingEvent` с `workerIds: string[]` |
| `hooks/useSchedulingEvents.ts` | 20–63 | EventSource hook — авто-переподключение |
| `contexts/SchedulingContext.tsx` | 278–295 | `refreshAppointments()` — лёгкий рефреш |
| `contexts/SchedulingContext.tsx` | 309–393 | `handleSchedulingEvent()` — routing по типу события |
| `contexts/SchedulingContext.tsx` | 312–319 | Фильтр релевантности: `workerIds.includes()` ∨ `existsLocally` |
| `contexts/SchedulingContext.tsx` | 340–343 | Сравнение составов работников (sorted arrays) |

---

## Тестирование

### DevTools → Network → EventStream

1. Открыть `/dienstplan` залогиненным работником
2. Network tab → фильтр `events` → запрос к `/api/scheduling/events`
3. EventStream tab должен показать `data: {"type":"connected"}`
4. При создании appointment директором — `data: {"type":"appointment_created","workerIds":["..."],...}`

### Через curl

```bash
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

# Удалить
curl -X DELETE http://localhost:3000/api/scheduling/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -d '{"id":"APPOINTMENT_ID"}'
```

### Проверка pg_notify в psql

```sql
-- Терминал 1: подписка
LISTEN "scheduling_your_firma_id";

-- Терминал 2: ручная отправка
SELECT pg_notify('scheduling_your_firma_id',
  '{"type":"appointment_created","appointmentID":"test","workerIds":["w1","w2"],"clientID":"c1","firmaID":"xxx"}');
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
