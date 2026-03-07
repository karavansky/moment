# SQLite Bottlenecks - Quick Summary

## 🎯 Текущая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     WebSocket Message Flow                       │
└─────────────────────────────────────────────────────────────────┘

Client sends message
       ↓
WebSocket receives
       ↓
┌──────────────────────┐
│ User.query() ←───────┼──── 🔴 DB Query #1 (SELECT)
└──────────────────────┘
       ↓
┌──────────────────────┐
│ user.save() ←────────┼──── 🔴 DB Write #1 (UPDATE users)
└──────────────────────┘
       ↓
┌──────────────────────┐
│ statusHistory.save() ┼──── 🔴 DB Write #2 (INSERT status_history)
└──────────────────────┘
       ↓
┌──────────────────────┐
│ message.save() ←─────┼──── 🔴 DB Write #3 (INSERT messages)
└──────────────────────┘
       ↓
   Broadcast to clients
       ↓
     Done

⏱️  Total: 4 DB operations per message
⏱️  Latency: 50-200ms
🔥  Throughput limit: ~500-1000 msg/sec
```

---

## 🚀 Оптимизированная архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│             WebSocket Message Flow (Optimized)                   │
└─────────────────────────────────────────────────────────────────┘

Client sends message
       ↓
WebSocket receives
       ↓
┌──────────────────────┐
│ updateActivity() ←───┼──── ✅ Redis EXPIRE (non-blocking)
└──────────────────────┘
       ↓
┌──────────────────────┐
│ Redis ZADD message ←─┼──── ✅ Redis (optional, async)
└──────────────────────┘
       ↓
   Broadcast to clients ←──── ⚡ Immediate!
       ↓
     Done

⏱️  Total: 0 blocking DB operations
⏱️  Latency: <5ms
🔥  Throughput: 10,000+ msg/sec
```

---

## 📊 Сравнение операций

| Операция | Сейчас (SQLite) | После оптимизации (Redis) | Улучшение |
|----------|-----------------|---------------------------|-----------|
| **Message save** | 50-100ms | <1ms | **50-100x** |
| **User status update** | 10-50ms (2 ops) | <1ms | **10-50x** |
| **Session activity** | ~~5-20ms~~ ✅ | <1ms | ✅ Уже в Redis |
| **Status history** | 5-10ms | батчинг или удалить | **10-60x** |
| **Message history query** | 50-100ms | <1ms | **50-100x** |

---

## 🔴 Критические узкие места (топ-4)

### 1️⃣ Message.save() - САМОЕ КРИТИЧНОЕ
```
Частота: КАЖДОЕ СООБЩЕНИЕ
Операций: INSERT в messages table
Влияние: Блокирует broadcast
Latency: 50-200ms

➜ Решение: Redis Lists / Sorted Sets
➜ Выигрыш: 50-100x быстрее
```

### 2️⃣ User.update() для CPU status
```
Частота: Каждые 5-10 секунд на пользователя
Операций: SELECT + UPDATE в users table
Влияние: Lock contention, высокая нагрузка
Latency: 10-50ms × 2 = 20-100ms

➜ Решение: Redis Hash для user status
➜ Выигрыш: 20-100x быстрее, нет locks
```

### 3️⃣ UserStatusHistory.save()
```
Частота: При каждом изменении статуса
Операций: INSERT в user_status_history
Влияние: Таблица растет до миллионов записей
Latency: 5-10ms (растет со временем)

➜ Решение: Батчинг или удалить
➜ Выигрыш: 10-60x меньше операций
```

### 4️⃣ User.query() при каждом сообщении
```
Частота: КАЖДОЕ СООБЩЕНИЕ × 3 (!)
Операций: SELECT из users table
Влияние: Избыточные queries
Latency: 10-20ms × 3 = 30-60ms

➜ Решение: Убрать (WS уже знает что user online)
➜ Выигрыш: -3 queries на сообщение
```

---

## ⚡ Quick Wins (быстрые оптимизации)

### Win #1: Убрать избыточные User.query()
**Время: 15 минут**
```swift
// ❌ УДАЛИТЬ ЭТО:
User.query(on: req.db)
    .filter(\.$username == session.username)
    .first()
    .whenComplete { userResult in
        if !user.isOnline {  // Он УЖЕ online!
```

**Эффект:** -3 DB queries на сообщение

---

### Win #2: Async message save (не ждать)
**Время: 5 минут**
```swift
// ❌ До:
message.save(on: req.db).whenComplete { _ in
    broadcast()  // Ждем DB!
}

// ✅ После:
broadcast()  // Сразу!
_ = message.save(on: req.db)  // Async, не ждем
```

**Эффект:** Latency 50ms → 5ms

---

### Win #3: Удалить UserStatusHistory
**Время: 10 минут**
```swift
// Просто закомментировать все:
// let statusHistory = UserStatusHistory(...)
// _ = statusHistory.save(on: req.db)
```

**Эффект:** -1 DB write на событие

---

## 🎯 Roadmap оптимизации

```
Phase 1: Quick Wins (1 час)
├─ Убрать избыточные User.query()
├─ Async message save
└─ Удалить/отключить StatusHistory
   └─ Результат: 2-3x улучшение

Phase 2: Redis для сообщений (2-3 часа)
├─ Redis Sorted Set для message history
├─ Убрать message.save() в SQLite
└─ GET /messages из Redis
   └─ Результат: 5-10x улучшение

Phase 3: Redis для User status (2-3 часа)
├─ Redis Hash для user:status
├─ Убрать user.update() для status/isOnline
└─ WebSocket manager использует Redis
   └─ Результат: 10-20x улучшение

Phase 4: Мониторинг и fine-tuning (1-2 часа)
├─ Метрики производительности
├─ Load testing
└─ Оптимизация Redis настроек
   └─ Результат: Стабильность на высокой нагрузке
```

---

## 📈 Ожидаемые результаты

### Текущее состояние
```
Throughput:    500-1,000 msg/sec
Latency:       50-200ms
DB Operations: ~4 на сообщение + постоянные CPU updates
CPU Usage:     70-80% на DB I/O
```

### После Phase 1 (Quick Wins)
```
Throughput:    1,500-3,000 msg/sec    ⬆️ 2-3x
Latency:       20-50ms                ⬆️ 2-4x
DB Operations: ~1 на сообщение        ⬆️ 4x меньше
CPU Usage:     40-50% на DB I/O       ⬆️ 30-40% меньше
```

### После Phase 2+3 (Full Redis)
```
Throughput:    10,000+ msg/sec        ⬆️ 10-20x
Latency:       <5ms                   ⬆️ 10-40x
DB Operations: 0 на сообщение         ⬆️ ∞
CPU Usage:     <10% на DB I/O         ⬆️ 90% меньше
```

---

## 🛠️ Инструменты для проверки

### Найти все DB writes
```bash
grep -r "\.save(on:" Sources/Hello/
grep -r "\.update(on:" Sources/Hello/
grep -r "\.create(on:" Sources/Hello/
grep -r "\.delete(on:" Sources/Hello/
```

### Мониторинг SQLite
```bash
# Размер таблиц
sqlite3 db.sqlite "SELECT name, COUNT(*) cnt FROM
  (SELECT 'users' as name UNION ALL
   SELECT 'messages' UNION ALL
   SELECT 'user_status_history')
  LEFT JOIN sqlite_master USING(name)
  WHERE type='table';"

# Топ-10 самых больших таблиц
sqlite3 db.sqlite "SELECT name, COUNT(*) FROM
  sqlite_master WHERE type='table'
  GROUP BY name ORDER BY COUNT(*) DESC LIMIT 10;"
```

### Load Testing
```bash
# Установить k6
sudo apt install k6

# Запустить load test (если есть скрипт)
k6 run stress_test.js
```

---

## 📝 Checklist действий

- [ ] Прочитать [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md) полностью
- [ ] **Phase 1: Quick Wins**
  - [ ] Убрать User.query() в routes.swift (3 места)
  - [ ] Сделать message.save() async (не ждать)
  - [ ] Отключить UserStatusHistory
  - [ ] Load test → измерить улучшение
- [ ] **Phase 2: Redis Messages**
  - [ ] Реализовать Redis Sorted Set для сообщений
  - [ ] Изменить POST message handler
  - [ ] Изменить GET /messages endpoint
  - [ ] Load test → измерить улучшение
- [ ] **Phase 3: Redis User Status**
  - [ ] Создать UserStatusManager (Redis)
  - [ ] Перенести user.isOnline → Redis
  - [ ] Перенести user.status (CPU) → Redis
  - [ ] Load test → измерить улучшение
- [ ] **Phase 4: Мониторинг**
  - [ ] Добавить метрики (latency, throughput)
  - [ ] Dashboard в Grafana (опционально)
  - [ ] Алерты на высокую latency

---

## 🔗 См. также

- 📖 [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md) - Детальный анализ
- 📖 [REDIS_SESSION_GUIDE.md](REDIS_SESSION_GUIDE.md) - Redis best practices
- 📖 [LOAD_TEST_RESULTS.md](LOAD_TEST_RESULTS.md) - Результаты тестов
