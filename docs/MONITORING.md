# Мониторинг системы реального времени

Эндпоинт `/api/admin/sse-stats` (только для `isAdmin`) возвращает три блока метрик:
SSE/LISTEN, пул соединений PostgreSQL и здоровье Node.js процесса.

---

## Архитектура сбора метрик

```
lib/scheduling-events.ts          app/api/admin/sse-stats/route.ts
────────────────────────          ────────────────────────────────
subscriptions.size          ───►  sse.activeChannels
Σ callbacks                 ───►  sse.totalSubscribers
eventTimestamps[]           ───►  sse.eventsPerMinute   (rolling 60s)
latencySamples[]            ───►  sse.avgLatencyMs      (last 100)
totalEventsProcessed        ───►  sse.totalEventsProcessed
reconnectCount              ───►  sse.reconnectCount
pgClient !== null           ───►  sse.pgConnected
setImmediate lag            ───►  sse.eventLoopLagMs

pool.totalCount             ───►  pool.total
pool.idleCount              ───►  pool.idle
pool.waitingCount           ───►  pool.waiting

process.memoryUsage()       ───►  process.heapUsedMb / heapTotalMb / rssMb / externalMb
process.uptime()            ───►  process.uptimeSeconds
```

---

## Блок 1 — SSE · LISTEN/NOTIFY

Данные читаются из глобального состояния синглтона `lib/scheduling-events.ts`.
Синглтон живёт в памяти Node.js процесса с момента первого подключения пользователя.

| Метрика                | Описание (Что это)                                                    | Влияние (На что влияет)                                                                              | Расчет (Как считается)                                                                |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pgConnected`          | Статус подключения dedicated-клиента к PostgreSQL для LISTEN          | Если `false`, уведомления не приходят, клиенты не видят изменений в реальном времени                 | Проверка `pgClient !== null` в синглтоне                                              |
| `activeChannels`       | Количество активных организаций (`firmaID`) с подключенными клиентами | Показывает бизнес-активность. Влияет на потребление памяти (количество ключей в Map)                 | `subscriptions.size` (размер Map подписок)                                            |
| `totalSubscribers`     | Общее количество открытых SSE-соединений (вкладок браузера)           | Нагрузка на сервер (держать открытые сокеты). Влияет на память и лимиты файловых дескрипторов        | Сумма размеров всех `Set` в `subscriptions`                                           |
| `eventsPerMinute`      | Частота событий `pg_notify` (создание/изменение данных)               | Индикатор активности записи в БД. Высокое значение может создавать нагрузку на CPU и сеть            | Количество меток времени в массиве `eventTimestamps` за последние 60 сек              |
| `avgLatencyMs`         | Средняя задержка от события в БД до отправки в SSE                    | Качество UX. Высокая задержка = "лаги" у пользователей                                               | Среднее значение по массиву `latencySamples` (последние 100 событий)                  |
| `totalEventsProcessed` | Счетчик всех обработанных событий с момента старта                    | Общая статистика работы процесса                                                                     | Инкремент счетчика при каждом входящем `notification`                                 |
| `reconnectCount`       | Количество переподключений к PostgreSQL                               | Индикатор стабильности сети/БД. Рост значения сигнализирует о проблемах инфраструктуры               | Инкремент при событиях `error` или `end` клиента PG                                   |
| `eventLoopLagMs`       | Задержка Event Loop Node.js                                           | Отзывчивость сервера. Высокое значение (>50мс) означает, что CPU заблокирован синхронными операциями | Разница времени между `setImmediate` и моментом исполнения (измеряется раз в секунду) |

### Как измеряется event loop lag

```typescript
function measureEventLoopLag() {
  const start = Date.now()
  setImmediate(() => {
    eventLoopLagMs = Date.now() - start // разница = сколько event loop был занят
    setTimeout(measureEventLoopLag, 1000)
  })
}
```

`setImmediate` должен выполниться немедленно после текущего тика. Если задержка
растёт — значит event loop перегружен долгими синхронными операциями (тяжёлый
`JSON.parse`, блокирующие циклы и т.д.).

### Пороги тревоги

| Метрика           | Жёлтый (warn) | Красный (error) |
| ----------------- | ------------- | --------------- |
| `eventsPerMinute` | > 500         | —               |
| `avgLatencyMs`    | > 100 ms      | —               |
| `reconnectCount`  | > 0           | —               |
| `eventLoopLagMs`  | > 50 ms       | > 100 ms        |

---

## Блок 2 — PostgreSQL pool

Данные читаются напрямую из объекта `pool` (`lib/db.ts`, `pg.Pool`).

| Метрика        | Описание (Что это)                                   | Влияние (На что влияет)                                                      | Расчет (Как считается)                 |
| -------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| `pool.total`   | Общее количество открытых соединений с БД            | Потребление ресурсов БД. Лимитировано конфигурацией (обычно 10-20)           | `pool.totalCount` из библиотеки `pg`   |
| `pool.idle`    | Количество свободных соединений, готовых к запросу   | Резерв производительности. Если близко к 0, возможны задержки новых запросов | `pool.idleCount` из библиотеки `pg`    |
| `pool.waiting` | Количество запросов, ожидающих свободного соединения | **Критическая метрика**. Если > 0, значит пул исчерпан, приложение тормозит  | `pool.waitingCount` из библиотеки `pg` |

`pool.waiting > 0` — сигнал перегрузки. Все 20 соединений заняты, новые запросы ждут.
Нормальное состояние: `total` невысокий, `idle` ≈ `total`, `waiting` = 0.

> Dedicated LISTEN-клиент (`lib/scheduling-events.ts`) использует отдельное
> соединение `pg.Client`, **не входит** в этот пул и не учитывается в этих цифрах.

---

## Блок 3 — Node.js process

Данные читаются в момент запроса через встроенные API Node.js — никакого фонового
сбора не требуется (кроме `eventLoopLagMs`, который берётся из блока 1).

| Метрика          | Описание (Что это)                    | Влияние (На что влияет)                                                       | Расчет (Как считается)                    |
| ---------------- | ------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| `heapUsedMb`     | Память, занятая JS-объектами          | Нагрузка на Garbage Collector. Если растет постоянно — утечка памяти          | `process.memoryUsage().heapUsed` / 1024²  |
| `heapTotalMb`    | Память, выделенная V8 под кучу        | Резерв памяти процесса                                                        | `process.memoryUsage().heapTotal` / 1024² |
| `rssMb`          | Resident Set Size (физическая память) | Общее потребление RAM контейнером. Риск OOM Kill если превышает лимиты Docker | `process.memoryUsage().rss` / 1024²       |
| `externalMb`     | Память под C++ объекты (Buffers)      | Память вне V8 Heap (например, при работе с файлами или сетью)                 | `process.memoryUsage().external` / 1024²  |
| `uptimeSeconds`  | Время работы процесса                 | Стабильность. Частые сбросы указывают на падения приложения                   | `process.uptime()`                        |
| `eventLoopLagMs` | Задержка Event Loop                   | Продублирован из Блока 1 для удобства мониторинга процесса                    | См. Блок 1                                |

### Что означают цифры

```
RSS = heapTotal + external + stack + native code
           ↑
    то что реально занято в RAM

heapUsed / heapTotal > 85% → V8 будет делать agressive GC, могут быть паузы
RSS > 512 MB           → пора смотреть на утечки памяти
```

### Пороги тревоги

| Метрика                | Жёлтый (warn) |
| ---------------------- | ------------- |
| `heapUsed / heapTotal` | > 85%         |
| `rssMb`                | > 512 MB      |
| `eventLoopLagMs`       | > 50 ms       |

---

## Файлы

| Файл                                 | Роль                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `lib/scheduling-events.ts`           | Синглтон с счётчиками, `measureEventLoopLag()`, `getStats()`                  |
| `lib/db.ts`                          | `pg.Pool`, экспортирует `pool` для чтения `totalCount/idleCount/waitingCount` |
| `app/api/admin/sse-stats/route.ts`   | GET-эндпоинт, только `isAdmin`, возвращает `{ sse, pool, process }`           |
| `app/[lang]/admin/Statistic.tsx`     | UI-компонент, auto-refresh 10s, три секции карточек                           |
| `app/[lang]/admin/DashboardView.tsx` | Хост, таб "Statistics" первый по умолчанию                                    |

---

## Формат ответа API

```typescript
GET /api/admin/sse-stats

{
  sse: {
    pgConnected: boolean
    activeChannels: number       // фирмы онлайн
    totalSubscribers: number     // открытых вкладок
    eventsPerMinute: number      // pg_notify за 60s
    avgLatencyMs: number         // notify → SSE, последние 100
    totalEventsProcessed: number
    reconnectCount: number
    eventLoopLagMs: number
  },
  pool: {
    total: number    // открытых соединений
    idle: number     // свободных
    waiting: number  // в очереди
  },
  process: {
    heapUsedMb: number
    heapTotalMb: number
    rssMb: number
    externalMb: number
    uptimeSeconds: number
    eventLoopLagMs: number
  },
  timestamp: string  // ISO 8601
}
```

---

## Сброс счётчиков

Счётчики `totalEventsProcessed` и `reconnectCount` сбрасываются только при
рестарте Node.js процесса (деплой, перезапуск контейнера). Они не персистятся
в БД — это инструмент оперативной диагностики, не исторической аналитики.

`eventsPerMinute` и `avgLatencyMs` — скользящие окна, отражают актуальную нагрузку
последней минуты / последних 100 событий соответственно.
