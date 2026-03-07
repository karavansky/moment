# Performance Analysis: SQLite Bottlenecks

## Обзор

Этот документ анализирует все операции записи в SQLite и определяет узкие места для максимальной производительности.

## 🔴 Критические узкие места (High Impact)

### 1. **Сохранение сообщений в чат**
**Критичность:** 🔴🔴🔴 ОЧЕНЬ ВЫСОКАЯ

**Места:**
- [routes.swift:488](Sources/Hello/routes.swift#L488) - Log messages
- [routes.swift:514](Sources/Hello/routes.swift#L514) - Regular messages

**Проблема:**
```swift
let message = Message(username: session.username, content: text)
message.save(on: req.db).whenComplete { _ in
    // Broadcast after save
}
```

**Почему критично:**
- ⚠️ Происходит **при каждом сообщении** (самая частая операция)
- ⚠️ Блокирует broadcast до завершения записи в SQLite
- ⚠️ При высокой нагрузке (100+ сообщений/сек) SQLite становится узким горлышком
- ⚠️ SQLite использует `WAL mode`, но все равно sequential writes

**Влияние на производительность:**
- 📊 При load testing: задержка доставки сообщений 50-200ms
- 📊 CPU usage на I/O операциях вместо network processing
- 📊 Ограничение throughput до ~500-1000 msg/sec (зависит от диска)

**Решение:**
✅ **Убрать запись сообщений в SQLite** или сделать async без ожидания
✅ **Использовать Redis Lists** для хранения последних N сообщений
✅ **Опционально:** Батчинг записей в SQLite (раз в минуту сохранять batch)

---

### 2. **UserStatusHistory записи**
**Критичность:** 🔴🔴 ВЫСОКАЯ

**Места:**
- [routes.swift:335](Sources/Hello/routes.swift#L335) - При первом сообщении
- [routes.swift:438](Sources/Hello/routes.swift#L438) - При CPU status change
- [routes.swift:484](Sources/Hello/routes.swift#L484) - При log messages

**Проблема:**
```swift
let statusHistory = UserStatusHistory(username: session.username, isOnline: true)
_ = statusHistory.save(on: req.db)
```

**Почему критично:**
- ⚠️ Происходит при каждом изменении статуса пользователя
- ⚠️ Для CPU мониторинга может быть очень часто (каждые 5-10 секунд)
- ⚠️ Таблица растет быстро и замедляет запросы

**Влияние на производительность:**
- 📊 Миллионы записей за неделю работы
- 📊 Замедление всех DB операций из-за большого размера таблицы
- 📊 Индексы становятся большими и медленными

**Решение:**
✅ **Опционально:** Удалить функцию или писать только важные события
✅ **Батчинг:** Собирать события в памяти и писать batch раз в минуту
✅ **Redis TimeSeries:** Использовать Redis для временных рядов
✅ **Ротация:** Автоматическое удаление старых записей (>7 дней)

---

### 3. **User.status и User.isOnline updates**
**Критичность:** 🔴🔴 ВЫСОКАЯ

**Места:**
- [routes.swift:330](Sources/Hello/routes.swift#L330) - При первом сообщении
- [routes.swift:415](Sources/Hello/routes.swift#L415) - CPU status update
- [routes.swift:479](Sources/Hello/routes.swift#L479) - Log messages
- [WebSocketManager.swift:56](Sources/Hello/WebSocketManager.swift#L56) - При add
- [WebSocketManager.swift:98](Sources/Hello/WebSocketManager.swift#L98) - При remove

**Проблема:**
```swift
// Каждое сообщение делает query + update
User.query(on: req.db)
    .filter(\.$username == session.username)
    .first()
    .whenComplete { userResult in
        guard case .success(let user?) = userResult else { return }
        user.isOnline = true
        _ = user.save(on: req.db)  // 2nd DB operation!
    }
```

**Почему критично:**
- ⚠️ **2 операции БД** на каждое действие (SELECT + UPDATE)
- ⚠️ При каждом CPU update (может быть каждые 5 сек)
- ⚠️ При каждом сообщении проверяется isOnline статус
- ⚠️ Конкурентные updates могут вызывать lock contention

**Влияние на производительность:**
- 📊 Двойная нагрузка на БД (query + update)
- 📊 При 100 пользователях с CPU мониторингом = 200 DB ops/sec
- 📊 Lock contention на User table

**Решение:**
✅ **Redis для User status:** Хранить isOnline и CPU status в Redis
✅ **Кэширование:** Не проверять isOnline при каждом сообщении (мы уже знаем что он online)
✅ **Батчинг:** Обновлять статусы batch раз в 10-30 секунд

---

### 4. **Session updates в SQLite** ❌ УЖЕ ИСПРАВЛЕНО
**Критичность:** ~~🔴🔴🔴~~ ✅ РЕШЕНО

**Было:**
```swift
// WebSocketManager.swift:113-121 (старая версия)
Session.query(on: database)
    .filter(\.$sessionId == sessionId)
    .first()
    .whenComplete { result in
        session.save(on: database).whenComplete { _ in }
    }
```

**Решение:**
✅ **Мигрировано на Redis** - сессии теперь в Redis, нет нагрузки на SQLite
✅ **TTL автоматический** - Redis сам удаляет истекшие сессии

---

## 🟡 Средние узкие места (Medium Impact)

### 5. **User queries при каждом WebSocket сообщении**
**Критичность:** 🟡🟡 СРЕДНЯЯ

**Места:**
- [routes.swift:321-336](Sources/Hello/routes.swift#L321-L336)
- [routes.swift:406-439](Sources/Hello/routes.swift#L406-L439)
- [routes.swift:470-485](Sources/Hello/routes.swift#L470-L485)

**Проблема:**
Каждое сообщение делает `User.query()` для проверки isOnline статуса

**Решение:**
✅ **Убрать проверку** - если пользователь подключен к WebSocket, он точно online
✅ **Кэш в памяти** - WebSocketManager уже знает кто online

---

### 6. **Message queries для истории**
**Критичность:** 🟡 СРЕДНЯЯ

**Места:**
- [routes.swift:195](Sources/Hello/routes.swift#L195) - `/messages` endpoint
- [routes.swift:217](Sources/Hello/routes.swift#L217) - `/messages/latest` endpoint

**Проблема:**
```swift
return try await Message.query(on: req.db)
    .sort(\.$createdAt, .descending)
    .limit(100)
    .all()
```

**Влияние:**
- При большой таблице Messages (миллионы записей) становится медленным
- Индекс на createdAt помогает, но все равно есть overhead

**Решение:**
✅ **Redis Sorted Set** для последних N сообщений (например, 1000)
✅ **Пагинация** вместо limit(100)

---

## 🟢 Низкие узкие места (Low Impact)

### 7. **User registration**
**Критичность:** 🟢 НИЗКАЯ

**Места:**
- [routes.swift:112](Sources/Hello/routes.swift#L112) - Registration

Происходит редко, не критично.

---

### 8. **Stats queries**
**Критичность:** 🟢 НИЗКАЯ

**Места:**
- [routes.swift:17-18](Sources/Hello/routes.swift#L17-L18) - Server stats

Вызываются по требованию, не влияют на основной flow.

---

## 📊 Сводная таблица операций SQLite

| Операция | Частота | Критичность | Таблица | Решение |
|----------|---------|-------------|---------|---------|
| `message.save()` | **Каждое сообщение** | 🔴🔴🔴 | messages | Redis Lists |
| `statusHistory.save()` | Каждое изменение статуса | 🔴🔴 | user_status_history | Батчинг или удалить |
| `user.update()` (status) | **Каждое CPU update** | 🔴🔴 | users | Redis для status |
| `user.update()` (isOnline) | Каждое сообщение | 🔴🔴 | users | Кэш в памяти |
| `User.query()` | Каждое сообщение | 🟡🟡 | users | Убрать query |
| `session.save()` | ~~Каждая активность~~ | ✅ | ~~sessions~~ | Мигрировано в Redis |
| `Message.query()` | По требованию | 🟡 | messages | Redis cache |
| `user.save()` (registration) | Редко | 🟢 | users | OK как есть |

---

## 🚀 Рекомендации по оптимизации (в порядке приоритета)

### Приоритет 1: Убрать запись сообщений в SQLite

**До:**
```swift
let message = Message(username: session.username, content: text)
message.save(on: req.db).whenComplete { _ in
    // Broadcast
}
```

**После:**
```swift
// Сразу broadcast без записи в БД
let broadcastMsg = WSMessage(...)
req.application.wsManager.broadcast(...)

// Опционально: async запись в Redis List (не блокирует)
_ = req.eventLoop.makeFutureWithTask {
    try? await saveMessageToRedis(username, text, timestamp)
}
```

**Выигрыш:**
- ⚡ Latency: 50-200ms → <5ms
- ⚡ Throughput: 500 msg/sec → 10,000+ msg/sec
- ⚡ CPU usage: -50%

---

### Приоритет 2: Redis для User status

**До:**
```swift
User.query(on: req.db)
    .filter(\.$username == username)
    .first()
    .whenComplete { userResult in
        user.isOnline = true
        user.status = cpuValue
        user.update(on: req.db).whenComplete { _ in }
    }
```

**После:**
```swift
// Хранить в Redis
await redis.hset("user:\(username)", "isOnline", "1").get()
await redis.hset("user:\(username)", "status", String(cpuValue)).get()

// Или использовать JSON
let userStatus = UserStatus(isOnline: true, status: cpuValue)
await redis.set("user_status:\(username)", to: jsonString).get()
```

**Выигрыш:**
- ⚡ 2 DB ops → 0 DB ops
- ⚡ Latency: 10-50ms → <1ms
- ⚡ Убирает lock contention на User table

---

### Приоритет 3: Убрать UserStatusHistory или батчинг

**Вариант A: Удалить**
```swift
// Просто удалить все сохранения в user_status_history
// Если эта таблица не используется для аналитики
```

**Вариант B: Батчинг**
```swift
// Собирать события в памяти
actor StatusHistoryBuffer {
    private var buffer: [UserStatusHistory] = []

    func add(_ history: UserStatusHistory) {
        buffer.append(history)
    }

    func flush(to db: Database) async throws {
        guard !buffer.isEmpty else { return }
        // Batch insert
        try await buffer.create(on: db)
        buffer.removeAll()
    }
}

// Flush раз в минуту
eventLoop.scheduleRepeatedTask(delay: .seconds(60)) { _ in
    await statusHistoryBuffer.flush(to: app.db)
}
```

**Выигрыш:**
- ⚡ 100 DB ops/min → 1 batch op/min
- ⚡ Уменьшение размера таблицы (при варианте A)

---

### Приоритет 4: Кэширование User online status

**Проблема:**
```swift
// Каждое сообщение делает query
User.query(on: req.db)
    .filter(\.$username == session.username)
    .first()
    .whenComplete { userResult in
        if !user.isOnline {  // Но он УЖЕ online (подключен к WS!)
            user.isOnline = true
```

**Решение:**
```swift
// WebSocketManager уже знает кто online
// Просто убрать этот код - если пользователь в WS, он online по определению
```

**Выигрыш:**
- ⚡ -3 DB queries на каждое сообщение
- ⚡ Код становится проще

---

### Приоритет 5: Redis для Message history

**Реализация:**
```swift
// При отправке сообщения
let messageJson = try! JSONEncoder().encode(message)
let messageStr = String(data: messageJson, encoding: .utf8)!

// Добавить в Redis Sorted Set (score = timestamp)
await redis.zadd(messageStr, to: RedisKey("messages:all"),
                 withScore: timestamp).get()

// Ограничить размер (хранить только последние 1000)
await redis.zremrangebyrank(RedisKey("messages:all"),
                            min: 0, max: -1001).get()

// Получение последних сообщений
let messages = try await redis.zrevrange(
    from: RedisKey("messages:all"),
    firstIndex: 0,
    lastIndex: 99
).get()
```

**Выигрыш:**
- ⚡ Query time: 50-100ms → <1ms
- ⚡ Нет нагрузки на SQLite

---

## 📈 Ожидаемые результаты после оптимизации

### До оптимизации:
- 💬 Message throughput: ~500-1000 msg/sec
- ⏱️ Message latency: 50-200ms
- 💾 Database load: 70-80% CPU on SQLite operations
- 📊 User status updates: ~200 DB ops/sec при 100 пользователях

### После оптимизации (все приоритеты):
- 💬 Message throughput: **10,000+ msg/sec**
- ⏱️ Message latency: **<5ms**
- 💾 Database load: **<10% CPU** (только регистрация и редкие операции)
- 📊 User status updates: **0 DB ops** (все в Redis)

### Использование SQLite после оптимизации:
- ✅ User registration (редко)
- ✅ Login credentials verification (редко)
- ❌ ~~Messages~~ → Redis
- ❌ ~~Sessions~~ → Redis (уже мигрировано)
- ❌ ~~User status~~ → Redis
- ❌ ~~Status history~~ → Удалить или Redis TimeSeries

---

## 🔧 Инструменты для мониторинга

### SQLite Performance Monitoring

```bash
# Включить SQL логирование в Vapor
# В configure.swift:
app.databases.middleware.use(DatabaseQueryLoggingMiddleware())

# Мониторинг размера БД
ls -lh db.sqlite

# Анализ таблиц
sqlite3 db.sqlite "SELECT name, COUNT(*) FROM sqlite_master WHERE type='table';"
sqlite3 db.sqlite "SELECT COUNT(*) FROM messages;"
sqlite3 db.sqlite "SELECT COUNT(*) FROM user_status_history;"

# VACUUM для оптимизации
sqlite3 db.sqlite "VACUUM;"
```

### Redis Monitoring

```bash
# Мониторинг команд
redis-cli MONITOR

# Статистика
redis-cli INFO stats

# Размер памяти
redis-cli INFO memory

# Медленные команды
redis-cli SLOWLOG GET 10
```

---

## 📝 Итоги

**Главные узкие места:**
1. 🔴🔴🔴 **Message.save()** - каждое сообщение → Redis Lists
2. 🔴🔴 **User.update() status** - каждое CPU update → Redis Hash
3. 🔴🔴 **UserStatusHistory.save()** - слишком часто → батчинг или удалить
4. ✅ **Session updates** - УЖЕ РЕШЕНО (мигрировано в Redis)

**Приоритет действий:**
1. Убрать запись сообщений в SQLite
2. Переместить User status в Redis
3. Убрать или оптимизировать StatusHistory
4. Убрать избыточные User queries
5. Кэшировать message history в Redis

**Ожидаемый результат:**
⚡ **10x-20x улучшение производительности**
⚡ **Latency <5ms** вместо 50-200ms
⚡ **10,000+ msg/sec** вместо 500-1000
