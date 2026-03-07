# Backend Task: Session-Based Authentication for WebSocket Chat Server

## Цель

Заменить текущую схему аутентификации (JWT token в URL) на session-based подход для улучшения безопасности и поддержки множественных соединений одного пользователя.

## Текущее состояние

- Vapor 4 WebSocket chat server на Swift 6.2
- SQLite база данных (db.sqlite)
- Аутентификация: JWT token передается в WebSocket URL (`ws://host/chat?token=xxx`)
- Token используется для HTTP API запросов в заголовке `Authorization: Bearer xxx`

## Требуемые изменения

### 1. Создать таблицу `sessions` в SQLite

**Схема таблицы:**

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    created_at REAL NOT NULL,      -- Unix timestamp
    expires_at REAL NOT NULL,      -- Unix timestamp
    last_activity REAL NOT NULL,   -- Unix timestamp для автоочистки
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_username ON sessions(username);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Fluent Migration (Swift):**

```swift
struct CreateSession: Migration {
    func prepare(on database: Database) -> EventLoopFuture<Void> {
        database.schema("sessions")
            .id()
            .field("session_id", .string, .required)
            .field("username", .string, .required)
            .field("created_at", .double, .required)
            .field("expires_at", .double, .required)
            .field("last_activity", .double, .required)
            .unique(on: "session_id")
            .foreignKey("username", references: "users", "username", onDelete: .cascade)
            .create()
    }

    func revert(on database: Database) -> EventLoopFuture<Void> {
        database.schema("sessions").delete()
    }
}
```

### 2. Создать Fluent Model для Session

**Файл: `Sources/App/Models/Session.swift`**

```swift
import Fluent
import Vapor

final class Session: Model, Content {
    static let schema = "sessions"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "session_id")
    var sessionId: String

    @Field(key: "username")
    var username: String

    @Field(key: "created_at")
    var createdAt: Double

    @Field(key: "expires_at")
    var expiresAt: Double

    @Field(key: "last_activity")
    var lastActivity: Double

    init() {}

    init(id: UUID? = nil, sessionId: String, username: String, expiresIn: TimeInterval = 3600) {
        self.id = id
        self.sessionId = sessionId
        self.username = username
        let now = Date().timeIntervalSince1970
        self.createdAt = now
        self.expiresAt = now + expiresIn
        self.lastActivity = now
    }
}
```

### 3. Изменить endpoint `/login` и `/register`

**Текущий response:**

```json
{
  "token": "JWT_TOKEN_STRING",
  "username": "admin"
}
```

**Новый response:**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin"
}
```

**Реализация:**

```swift
// В routes.swift или AuthController.swift
app.post("login") { req -> EventLoopFuture<LoginResponse> in
    let credentials = try req.content.decode(LoginRequest.self)

    return User.query(on: req.db)
        .filter(\.$username == credentials.username)
        .first()
        .unwrap(or: Abort(.unauthorized, reason: "Invalid credentials"))
        .flatMapThrowing { user in
            guard try user.verify(password: credentials.password) else {
                throw Abort(.unauthorized, reason: "Invalid credentials")
            }
            return user
        }
        .flatMap { user in
            // Генерируем sessionId
            let sessionId = UUID().uuidString
            let session = Session(
                sessionId: sessionId,
                username: user.username,
                expiresIn: 3600 // 1 час
            )

            return session.save(on: req.db).map {
                LoginResponse(sessionId: sessionId, username: user.username)
            }
        }
}

struct LoginRequest: Content {
    let username: String
    let password: String
}

struct LoginResponse: Content {
    let sessionId: String
    let username: String
}
```

### 4. Создать Middleware для валидации sessionId

**Файл: `Sources/App/Middleware/SessionAuthMiddleware.swift`**

```swift
import Vapor

struct SessionAuthMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        // Получаем sessionId из header или query
        guard let sessionId = request.headers["X-Session-ID"].first ?? request.query[String.self, at: "sessionId"] else {
            throw Abort(.unauthorized, reason: "Missing session ID")
        }

        // Проверяем сессию в БД
        guard let session = try await Session.query(on: request.db)
            .filter(\.$sessionId == sessionId)
            .first() else {
            throw Abort(.unauthorized, reason: "Invalid session ID")
        }

        // Проверяем, не истекла ли сессия
        let now = Date().timeIntervalSince1970
        guard session.expiresAt > now else {
            try await session.delete(on: request.db)
            throw Abort(.unauthorized, reason: "Session expired")
        }

        // Обновляем last_activity
        session.lastActivity = now
        try await session.save(on: request.db)

        // Сохраняем username в request для использования в routes
        request.auth.login(SessionUser(username: session.username))

        return try await next.respond(to: request)
    }
}

// Helper для доступа к username в routes
struct SessionUser: Authenticatable {
    let username: String
}
```

### 5. Применить middleware к HTTP API routes

```swift
// В configure.swift или routes.swift
let sessionProtected = app.grouped(SessionAuthMiddleware())

sessionProtected.get("users") { req -> EventLoopFuture<[UserResponse]> in
    let user = try req.auth.require(SessionUser.self)
    // ... текущая логика
}

sessionProtected.get("user") { req -> EventLoopFuture<[Message]> in
    let user = try req.auth.require(SessionUser.self)
    // ... текущая логика
}
```

### 6. Изменить WebSocket handler для использования sessionId

**Текущий код (примерно):**

```swift
app.webSocket("chat") { req, ws in
    guard let token = req.query[String.self, at: "token"] else {
        try await ws.close(code: .policyViolation)
        return
    }
    // Валидация JWT token...
}
```

**Новый код:**

```swift
app.webSocket("chat") { req, ws async in
    guard let sessionId = req.query[String.self, at: "sessionId"] else {
        try await ws.close(code: .policyViolation)
        return
    }

    // Проверяем сессию
    guard let session = try await Session.query(on: req.db)
        .filter(\.$sessionId == sessionId)
        .first() else {
        try await ws.close(code: .policyViolation)
        return
    }

    // Проверяем, не истекла ли сессия
    let now = Date().timeIntervalSince1970
    guard session.expiresAt > now else {
        try await session.delete(on: req.db)
        try await ws.close(code: .policyViolation)
        return
    }

    let username = session.username

    // Обновляем last_activity
    session.lastActivity = now
    try await session.save(on: req.db)

    // Продолжить с валидным username
    await handleWebSocketConnection(ws: ws, username: username, sessionId: sessionId, eventLoop: req.eventLoop)
}
```

### 7. Добавить поддержку множественных WebSocket соединений

**Создать SessionManager (Actor для thread-safety):**

**Файл: `Sources/App/Services/WebSocketSessionManager.swift`**

```swift
import Vapor

struct WebSocketSession {
    let ws: WebSocket
    let sessionId: String
    let eventLoop: EventLoop
    let username: String
}

extension WebSocketSession: Hashable, Equatable {
    static func == (lhs: WebSocketSession, rhs: WebSocketSession) -> Bool {
        return lhs.sessionId == rhs.sessionId
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(sessionId)
    }
}

actor WebSocketSessionManager {
    // username -> Set of WebSocket sessions
    private var sessions: [String: Set<WebSocketSession>] = [:]

    func addSession(username: String, session: WebSocketSession) {
        if sessions[username] == nil {
            sessions[username] = []
        }
        sessions[username]?.insert(session)
        print("Added WS session \(session.sessionId) for user \(username). Total: \(sessions[username]?.count ?? 0)")
    }

    func removeSession(username: String, sessionId: String) {
        sessions[username]?.removeAll(where: { $0.sessionId == sessionId })
        if sessions[username]?.isEmpty == true {
            sessions[username] = nil
        }
        print("Removed WS session \(sessionId) for user \(username)")
    }

    func getSessions(for username: String) -> Set<WebSocketSession> {
        return sessions[username] ?? []
    }

    func getAllSessions() -> [WebSocketSession] {
        return sessions.values.flatMap { $0 }
    }

    func getUsernames() -> [String] {
        return Array(sessions.keys)
    }
}

// Singleton instance
extension Application {
    struct WebSocketSessionManagerKey: StorageKey {
        typealias Value = WebSocketSessionManager
    }

    var webSocketSessions: WebSocketSessionManager {
        get {
            if let existing = storage[WebSocketSessionManagerKey.self] {
                return existing
            }
            let new = WebSocketSessionManager()
            storage[WebSocketSessionManagerKey.self] = new
            return new
        }
        set {
            storage[WebSocketSessionManagerKey.self] = newValue
        }
    }
}
```

### 8. Обновить broadcast функции для поддержки множественных сессий

```swift
func broadcastToUser(username: String, message: [String: Any], app: Application) async {
    let sessions = await app.webSocketSessions.getSessions(for: username)

    guard let jsonData = try? JSONSerialization.data(withJSONObject: message),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
        return
    }

    // Отправляем на все WebSocket сессии этого пользователя
    for session in sessions {
        // КРИТИЧНО для NIO: выполняем на EventLoop этого WebSocket
        session.eventLoop.execute {
            session.ws.send(jsonString)
        }
    }
}

func broadcastToAll(message: [String: Any], app: Application) async {
    let allSessions = await app.webSocketSessions.getAllSessions()

    guard let jsonData = try? JSONSerialization.data(withJSONObject: message),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
        return
    }

    for session in allSessions {
        session.eventLoop.execute {
            session.ws.send(jsonString)
        }
    }
}
```

### 9. Добавить автоматическую очистку истекших сессий

**Файл: `Sources/App/Jobs/SessionCleanupJob.swift`**

```swift
import Vapor
import Queues

struct SessionCleanupJob: AsyncScheduledJob {
    func run(context: QueueContext) async throws {
        let now = Date().timeIntervalSince1970

        // Удаляем истекшие сессии
        try await Session.query(on: context.application.db)
            .filter(\.$expiresAt < now)
            .delete()

        context.logger.info("Cleaned up expired sessions")
    }
}

// В configure.swift
app.queues.schedule(SessionCleanupJob())
    .minutely()
    .at(0) // Каждую минуту
```

Или без Queues (простой таймер):

```swift
// В configure.swift
func startSessionCleanup(app: Application) {
    app.eventLoopGroup.next().scheduleRepeatedTask(initialDelay: .minutes(1), delay: .minutes(5)) { task in
        let now = Date().timeIntervalSince1970

        _ = Session.query(on: app.db)
            .filter(\.$expiresAt < now)
            .delete()
            .map { _ in
                app.logger.info("Cleaned up expired sessions")
            }
    }
}

// Вызвать в configure(_:)
startSessionCleanup(app: app)
```

### 10. Добавить endpoint для logout (опционально)

```swift
app.post("logout") { req -> EventLoopFuture<HTTPStatus> in
    guard let sessionId = req.headers["X-Session-ID"].first else {
        throw Abort(.badRequest, reason: "Missing session ID")
    }

    return Session.query(on: req.db)
        .filter(\.$sessionId == sessionId)
        .delete()
        .map { .noContent }
}
```

## Checklist выполнения

- [ ] Создать модель `Session` с полями: session_id, username, created_at, expires_at, last_activity
- [ ] Создать миграцию для таблицы `sessions`
- [ ] Применить миграцию: `swift run App migrate`
- [ ] Изменить `/login` и `/register` для возврата `sessionId` вместо `token`
- [ ] Создать `SessionAuthMiddleware` для валидации sessionId
- [ ] Применить middleware к HTTP routes (`/users`, `/user`, `/user/status-history`)
- [ ] Изменить WebSocket handler `/chat` для использования `sessionId` из query параметра
- [ ] Создать `WebSocketSessionManager` (Actor) для хранения множественных WS соединений
- [ ] Обновить `handleWebSocketConnection` для регистрации сессии в SessionManager
- [ ] Обновить `broadcastToUser` и `broadcastToAll` для отправки на все сессии пользователя
- [ ] Добавить очистку истекших сессий (scheduled job или timer)
- [ ] Удалить старый JWT token код (если он больше не нужен)
- [ ] Тестирование: множественные вкладки, разные браузеры, истечение сессии

## Ожидаемый результат

**До:**

```
POST /login → {token: "JWT...", username: "admin"}
WebSocket: ws://host/chat?token=JWT...
HTTP API: Authorization: Bearer JWT...
```

**После:**

```
POST /login → {sessionId: "uuid-here", username: "admin"}
WebSocket: ws://host/chat?sessionId=uuid-here
HTTP API: X-Session-ID: uuid-here (или ?sessionId=uuid-here)
```

**Преимущества:**

- ✅ Токен не попадает в URL/логи
- ✅ Поддержка множественных соединений одного пользователя
- ✅ Проще отзывать доступ (удалить сессию)
- ✅ Единая схема аутентификации для HTTP и WebSocket

## Примечания для реализации

1. **NIO EventLoop constraint**: Все операции с WebSocket должны выполняться на его родном EventLoop через `eventLoop.execute {}`
2. **Thread safety**: Используйте `actor` для WebSocketSessionManager, чтобы избежать race conditions
3. **Cleanup**: Не забудьте удалять WebSocket сессии из SessionManager при disconnect
4. **Expiration**: Рекомендуется TTL сессии 1-24 часа в зависимости от требований безопасности
5. **Testing**: Проверьте работу с несколькими вкладками одного браузера и разными браузерами
