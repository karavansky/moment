# Load Test Troubleshooting Guide

## Проблема: Messages Received не увеличивается

### Диагностика

#### Шаг 1: Включить Debug Mode

1. Откройте `test_load.html` в браузере
2. Включите чекбокс **"Debug mode (log all messages)"**
3. Откройте Developer Console (F12)
4. Запустите тест с 1-2 подключениями
5. Включите **"Auto-send messages"**

#### Шаг 2: Проверить консоль браузера

Вы должны увидеть:
```javascript
[Session 0] Received: {type: "system", content: "Welcome, loadtest! Host: ...", ...}
[Session 0] Received: {type: "subscribed", content: "all_messages", ...}
[Session 0] Received: {type: "message", content: "{\"type\":\"log\",\"content\":\"...\"}", ...}
```

### Возможные причины

#### 1️⃣ Сообщения не broadcast'ятся с сервера

**Симптом:** В консоли только `system` и `subscribed`, но нет `message`

**Проверка на сервере:**
```bash
# Смотреть логи сервера
sudo journalctl -u vapor-chat.service -f

# Должно быть:
# "Detected log message, saving to DB and broadcasting"
# "Broadcast to subscribers..."
```

**Причина:** Сообщения типа `log` обрабатываются в async callback

**Решение:** Сделать broadcast немедленным (Phase 1 оптимизации)

---

#### 2️⃣ Подписка на сообщения не работает

**Симптом:** Отправляем сообщения, но не получаем их обратно

**Проверка:**
```javascript
// В консоли браузера
sessions[0].ws.send(JSON.stringify({type: "subscribe", messageType: "all_messages"}));
```

**Причина:** WebSocketManager.subscribe() может не работать корректно

**Решение:** Проверить [WebSocketManager.swift](Sources/Hello/WebSocketManager.swift)

---

#### 3️⃣ Broadcast идет не на тех подписчиков

**Симптом:** Сервер логирует broadcast, но клиенты не получают

**Проверка на сервере:**
```bash
# В логах должно быть:
grep "broadcastToSubscribers" /var/log/vapor-chat.log
```

**Причина:** Несоответствие `messageType` в subscribe и broadcast

**Код проверки:**
```swift
// routes.swift:389
ws.send(JSON.stringify({ type: "subscribe", messageType: "all_messages" }));

// routes.swift:498-500
req.application.wsManager.broadcastToSubscribers(
    message: ...,
    messageType: "all_messages"  // Должно совпадать!
)
```

---

#### 4️⃣ JSON парсинг ошибается

**Симптом:** В консоли ошибки парсинга

**Проверка:**
```javascript
// Смотреть в console.error
// "Error parsing message: ..."
```

**Причина:** Неверный формат JSON от сервера

**Решение:** Проверить формат WSMessage в routes.swift

---

## Текущая диагностика (после исправления)

### ✅ Что исправлено в test_load.html

**До:**
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "ping") {
    ws.send(JSON.stringify({ type: "pong" }));
    return;
  }
  // Считали ВСЕ сообщения, включая system, join, leave
  session.messageCount++;
  stats.messagesReceived++;
};
```

**После:**
```javascript
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    // Считаем ТОЛЬКО реальные сообщения
    if (data.type === "message" || data.type === "log") {
      session.messageCount++;
      stats.messagesReceived++;
      updateStats();
    }

    // Debug logging
    if (debugMode) {
      console.log(`[Session ${session.id}] Received:`, data);
    }
  } catch (error) {
    console.error(`[Session ${session.id}] Error parsing message:`, error);
    stats.errors++;
  }
};
```

### Новые функции

1. **Debug Mode** - логирование всех сообщений
2. **Фильтрация типов** - считаем только `message` и `log`
3. **Error handling** - catch парсинг ошибок
4. **Error counter** - подсчет ошибок

---

## Тестирование после исправления

### Тест 1: Базовая функциональность

```bash
1. Открыть test_load.html
2. Username: loadtest, Password: test123, Connections: 1
3. ✅ Debug mode
4. Start Load Test
5. ✅ Auto-send messages
```

**Ожидаемый результат:**
- Connected: 1
- Messages Sent: увеличивается (1, 2, 3, ...)
- **Messages Received: увеличивается** ✅

**В консоли:**
```javascript
[Session 0] Received: {type: "system", content: "Welcome...", ...}
[Session 0] Received: {type: "subscribed", content: "all_messages"}
[Session 0] Received: {type: "message", content: "{\"type\":\"log\",\"content\":\"Привет я сессия 0 сообщение 1\"}", ...}
[Session 0] Message received: {"type":"log","content":"Привет я сессия 0 сообщение...
```

---

### Тест 2: Множественные подключения

```bash
1. Connections: 10
2. ✅ Auto-send messages
3. Start Load Test
```

**Ожидаемый результат:**
- Connected: 10
- Messages Sent: ~10/sec (10 сессий × 1 msg/sec)
- Messages Received: ~100/sec (каждая сессия получает 10 сообщений)

**Формула:**
```
Messages Received Rate = Messages Sent × Number of Sessions
                       = 10 msg/sec × 10 sessions
                       = 100 msg/sec
```

---

### Тест 3: Нагрузка (100 подключений)

```bash
1. Connections: 100
2. ✅ Auto-send messages
3. Start Load Test
4. Смотреть Server Monitor
```

**Ожидаемый результат:**
- Connected: 100
- Messages Sent: ~100/sec
- Messages Received: ~10,000/sec (100 × 100)
- **Проверка узких мест SQLite**

---

## Известные проблемы

### 🔴 Проблема 1: Broadcast задержка при DB save

**Симптом:** Latency 50-200ms между отправкой и получением

**Причина:**
```swift
// routes.swift:488
message.save(on: req.db).whenComplete { _ in
    // Broadcast ПОСЛЕ сохранения в БД
    req.application.wsManager.broadcastToSubscribers(...)
}
```

**Решение:** Phase 1 - Quick Wins
```swift
// Broadcast сразу
req.application.wsManager.broadcastToSubscribers(...)

// Сохранить async (не ждать)
_ = message.save(on: req.db)
```

---

### 🔴 Проблема 2: Избыточные User.query()

**Симптом:** High DB load, CPU на SQLite

**Причина:** При каждом сообщении делаем User.query() (3 раза!)

**Решение:** Убрать query - если пользователь подключен к WS, он уже online

---

## Команды для мониторинга

### Проверить подключения на сервере

```bash
# Статистика сервера
curl http://localhost:3003/server-stats

# WebSocket соединения
netstat -an | grep :3003 | grep ESTABLISHED | wc -l

# Логи broadcast
sudo journalctl -u vapor-chat.service | grep "broadcastToSubscribers"

# Количество сообщений в БД
sqlite3 db.sqlite "SELECT COUNT(*) FROM messages"
```

### Мониторинг Redis

```bash
# Активные сессии
redis-cli KEYS "session:*" | wc -l

# Мониторинг команд
redis-cli MONITOR
```

### Мониторинг производительности

```bash
# CPU/Memory
top -b -n 1 | grep WebSocketServer

# Disk I/O
iostat -x 1

# Network
iftop -i eth0
```

---

## Чеклист перед началом Variant A

- [x] test_load.html исправлен
- [x] Debug mode добавлен
- [x] Фильтрация типов сообщений
- [x] Error handling
- [ ] **Протестировать:** 1 подключение, auto-send, Messages Received растет
- [ ] **Протестировать:** 10 подключений, проверить latency
- [ ] **Протестировать:** 100 подключений, найти узкое место
- [ ] **Измерить:** Throughput (msg/sec)
- [ ] **Измерить:** Latency (время от send до receive)
- [ ] **Готов к Phase 1:** Quick Wins

---

## Следующие шаги

После успешного тестирования:

1. ✅ Убедиться что Messages Received работает
2. 📊 Измерить baseline производительности
3. 🚀 Начать Phase 1: Quick Wins
4. 📈 Измерить улучшение
5. 🔄 Variant A: Hybrid Redis + SQLite
