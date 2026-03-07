# Redis Session Management Guide

## Обзор

Проект использует **Redis** для хранения сессий пользователей с автоматическим управлением TTL (Time To Live).

## Архитектура

### Формат Session ID

- **Длина:** 22 символа
- **Формат:** base62 (0-9, A-Z, a-z)
- **Пример:** `R8IexwH6OJ1aF9H4UXtG2R`
- **Безопасность:** Криптографически стойкий генератор
- **Реализация:** [SessionManager.swift:198-208](Sources/Hello/SessionManager.swift#L198-L208)

### Структура данных в Redis

#### Session Keys
```
session:{sessionId} → JSON string
```

**Пример:**
```json
{
  "username": "admin",
  "created_at": "1700000000.0",
  "expires_at": "1700086400.0",
  "last_activity": "1700000000.0"
}
```

#### User Sessions Set
```
username:{username} → Set[sessionId1, sessionId2, ...]
```

Позволяет получить все активные сессии конкретного пользователя.

## Жизненный цикл сессии

### 1. Создание сессии

**Когда:** При регистрации (`/register`) или логине (`/login`)

**Действия:**
- Генерируется 22-символьный sessionId
- Создается JSON с данными сессии
- Устанавливается в Redis с TTL = 86400 секунд (24 часа)
- SessionId добавляется в set `username:{username}`

**Код:** [SessionManager.swift:22-48](Sources/Hello/SessionManager.swift#L22-L48)

```swift
func createSession(username: String, expiresIn: TimeInterval = 86400) async throws -> String {
    let sessionId = generateSessionId()
    let sessionKey = RedisKey(sessionPrefix + sessionId)

    // Store session data
    try await redis.set(sessionKey, to: jsonString).get()

    // Set TTL (expires after 24 hours)
    _ = try await redis.expire(sessionKey, after: .seconds(Int64(expiresIn))).get()

    return sessionId
}
```

### 2. Валидация сессии

**Когда:**
- WebSocket подключение (`/chat?sessionId=xxx`)
- Logout (`/logout`)

**Действия:**
- Получение данных из Redis по ключу `session:{sessionId}`
- Проверка наличия сессии
- Проверка срока действия (expires_at)
- Автоматическое удаление просроченных сессий

**Код:** [SessionManager.swift:51-86](Sources/Hello/SessionManager.swift#L51-L86)

### 3. Продление сессии (Sliding Expiration)

**Когда:**
- **При подключении WebSocket** ([routes.swift:267](Sources/Hello/routes.swift#L267))
- **При отправке сообщения в чат** ([routes.swift:326](Sources/Hello/routes.swift#L326))

**Поведение:**
- ✅ **Активный пользователь:** сессия продлевается на полные 24 часа при каждом действии
- ⏱️ **Неактивный пользователь:** сессия истекает через 24 часа после последней активности
- 🔄 **Автоматическое продление:** TTL в Redis обновляется при каждом вызове `updateActivity()`

**Код:** [SessionManager.swift:89-113](Sources/Hello/SessionManager.swift#L89-L113)

```swift
func updateActivity(sessionId: String, expiresIn: TimeInterval = 86400) async throws {
    let sessionKey = RedisKey(sessionPrefix + sessionId)

    // Update last_activity and expires_at in JSON
    data["last_activity"] = String(now)
    data["expires_at"] = String(expiresAt)

    // Save updated JSON
    try await redis.set(sessionKey, to: newJsonString).get()

    // ВАЖНО: Продлить TTL в Redis (sliding expiration)
    _ = try await redis.expire(sessionKey, after: .seconds(Int64(expiresIn))).get()
}
```

### 4. Удаление сессии

**Когда:**
- Logout (`/logout`)
- Автоматическое удаление просроченных сессий (Redis TTL)
- Удаление всех сессий пользователя (`deleteUserSessions()`)

**Действия:**
- Удаление ключа `session:{sessionId}` из Redis
- Удаление sessionId из set `username:{username}`
- Закрытие WebSocket соединений

**Код:** [SessionManager.swift:116-131](Sources/Hello/SessionManager.swift#L116-L131)

## Примеры использования

### Проверка TTL сессии

```bash
# Получить sessionId при регистрации
curl -X POST http://localhost:3003/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"test","password":"test123"}' | jq .

# Проверить TTL (должно быть ~86400)
redis-cli TTL session:YOUR_SESSION_ID

# Отправить сообщение в чат (через WebSocket или test.html)

# Проверить TTL снова - должно обновиться до ~86400
redis-cli TTL session:YOUR_SESSION_ID
```

### Просмотр всех сессий пользователя

```bash
# Получить список sessionId для пользователя "admin"
redis-cli SMEMBERS username:admin

# Посмотреть данные конкретной сессии
redis-cli GET session:R8IexwH6OJ1aF9H4UXtG2R
```

### Удаление сессии вручную

```bash
# Удалить сессию из Redis
redis-cli DEL session:YOUR_SESSION_ID

# Удалить из set пользователя
redis-cli SREM username:admin YOUR_SESSION_ID
```

## Преимущества Redis-подхода

### ✅ Автоматическое управление TTL
- Redis автоматически удаляет ключи после истечения TTL
- Нет необходимости в периодических задачах очистки (cleanup jobs)
- Экономия памяти - просроченные сессии удаляются мгновенно

### ✅ Высокая производительность
- In-memory storage - быстрое чтение/запись
- O(1) операции для get/set/expire
- Поддержка миллионов сессий

### ✅ Sliding Expiration
- Активные пользователи остаются в системе неограниченно долго
- Неактивные сессии автоматически очищаются
- Настраиваемое время жизни (по умолчанию 24 часа)

### ✅ Поддержка множественных сессий
- Пользователь может иметь несколько активных сессий (разные устройства/браузеры)
- Set `username:{username}` хранит все sessionId пользователя
- Удобное управление всеми сессиями пользователя

## Конфигурация

### Redis Connection

**Файл:** [configure.swift:42-48](Sources/Hello/configure.swift#L42-L48)

```swift
// Configure Redis
app.redis.configuration = try RedisConfiguration(hostname: "localhost", port: 6379)

// Initialize SessionManager
let sessionManager = SessionManager(app: app)
app.sessionManager = sessionManager

print("✅ Redis connected at localhost:6379")
```

### Настройка TTL

По умолчанию: **86400 секунд (24 часа)**

Изменить можно передав параметр `expiresIn`:

```swift
// Создать сессию на 1 час
let sessionId = try await req.sessionManager.createSession(
    username: "admin",
    expiresIn: 3600
)

// Продлить на 12 часов
try await req.sessionManager.updateActivity(
    sessionId: sessionId,
    expiresIn: 43200
)
```

## Мониторинг

### Server Statistics

```bash
curl http://localhost:3003/server-stats
```

Показывает:
- Активные WebSocket соединения
- Количество пользователей онлайн
- Количество сессий в Redis
- Performance метрики

### Redis Commands

```bash
# Количество ключей в Redis
redis-cli DBSIZE

# Поиск всех session ключей (ОСТОРОЖНО: блокирующая операция!)
redis-cli KEYS "session:*"

# Поиск всех username sets
redis-cli KEYS "username:*"

# Информация о памяти
redis-cli INFO memory

# Мониторинг команд в реальном времени
redis-cli MONITOR
```

## Troubleshooting

### Сессия не продлевается

**Проблема:** TTL в Redis не обновляется при активности пользователя

**Решение:** Убедитесь, что `updateActivity()` вызывается в нужных местах:
- При подключении WebSocket
- При отправке сообщений

**Проверка:**
```bash
# До отправки сообщения
redis-cli TTL session:YOUR_SESSION_ID
# Вывод: 85000

# Отправить сообщение в чат

# После отправки сообщения
redis-cli TTL session:YOUR_SESSION_ID
# Вывод: 86400 (обновился!)
```

### Сессия удаляется сразу после создания

**Проблема:** Redis ключ удаляется немедленно

**Причина:** Скорее всего `expires_at` в JSON установлен в прошлом

**Решение:** Проверить timestamp:
```bash
redis-cli GET session:YOUR_SESSION_ID | jq .
# Проверить, что expires_at > текущий timestamp
date +%s  # Текущий Unix timestamp
```

### Redis недоступен

**Проблема:** `Error: Connection refused`

**Решение:**
```bash
# Проверить запущен ли Redis
redis-cli PING
# Должно вернуть: PONG

# Если не запущен:
sudo systemctl start redis-server

# Проверить порт
sudo netstat -tulpn | grep 6379
```

## API Reference

### SessionManager Methods

| Метод | Описание |
|-------|----------|
| `createSession(username:expiresIn:)` | Создать новую сессию |
| `getSession(sessionId:)` | Получить данные сессии |
| `updateActivity(sessionId:expiresIn:)` | Обновить активность + продлить TTL |
| `deleteSession(sessionId:)` | Удалить сессию |
| `getUserSessions(username:)` | Получить все sessionId пользователя |
| `deleteUserSessions(username:)` | Удалить все сессии пользователя |
| `refreshSession(sessionId:expiresIn:)` | Принудительно обновить expires_at и TTL |

### SessionData Structure

```swift
struct SessionData: Content {
    let sessionId: String
    let username: String
    let createdAt: Double       // Unix timestamp
    let expiresAt: Double       // Unix timestamp
    let lastActivity: Double    // Unix timestamp

    var isExpired: Bool {
        return Date().timeIntervalSince1970 > expiresAt
    }
}
```

## См. также

- [API.md](API.md) - Документация API endpoints
- [DEVELOPMENT.md](DEVELOPMENT.md) - Руководство разработчика
- [SessionManager.swift](Sources/Hello/SessionManager.swift) - Исходный код
