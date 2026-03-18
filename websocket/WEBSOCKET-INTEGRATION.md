# WebSocket Integration — Документация

> **Real-time трекинг для Moment LBS** (аналог Uber)
> WebSocket сервер на Swift Vapor для передачи координат водителей в режиме реального времени

---

## Оглавление

- [Цель и задачи](#цель-и-задачи)
- [Архитектура](#архитектура)
- [Инфраструктура](#инфраструктура)
- [Аутентификация](#аутентификация)
- [Модель данных](#модель-данных)
- [Docker и развёртывание](#docker-и-развёртывание)
- [Nginx конфигурация](#nginx-конфигурация)
- [Интеграция с Moment](#интеграция-с-moment)
- [План реализации](#план-реализации)

---

## Цель и задачи

### Основная задача
**Real-time трекинг водителей** для функционала "Uber" в Moment:
- Водитель отправляет GPS-координаты → WebSocket сервер
- Сервер сохраняет в БД / отправляет диспетчеру
- Диспетчер видит движение водителя на карте в реальном времени

### Второстепенные задачи (будущее)
- Чат между персоналом
- Push-уведомления о статусе заказов
- Мониторинг активности пользователей (для админ-панели)

### Что НЕ является задачей
- Тестовый frontend (`/websocket/frontend/`) — **будет удалён**
- Мониторинг CPU / статус пользователей — это была отладка, не продакшн

---

## Архитектура

### Текущая инфраструктура (до WebSocket)

```
┌──────────────┐
│   Браузер    │
└──────┬───────┘
       │ HTTPS
       ▼
┌────────────────────────────────────────┐
│              Nginx (443)               │
│                                        │
│  /api/auth/*     → Next.js (3002)     │
│  /api/*          → Vapor (8080)       │
│  /               → Next.js (3002)     │
│  /pgadmin/       → pgAdmin (5050)     │
└────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌───────────────┐
│  Next.js     │   │  Vapor API    │
│  (3002)      │   │  (8080)       │
│  Frontend    │   │  Backend      │
│  SSR + Auth  │   │  REST API     │
└──────┬───────┘   └───────┬───────┘
       │                    │
       └──────────┬─────────┘
                  ▼
       ┌──────────────────────┐
       │    PostgreSQL        │
       │    (5432)            │
       │  - БД: moment        │
       │  - Таблицы: users,   │
       │    sessions, orders, │
       │    vehicles, routes  │
       └──────────────────────┘
```

### После интеграции WebSocket

```
┌──────────────┐
│   Браузер    │
└──────┬───────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx (443)                                │
│                                                         │
│  https://moment-lbs.app/api/auth/*   → Next.js (3002)  │
│  https://moment-lbs.app/api/*        → Vapor (8080)    │
│  https://moment-lbs.app/             → Next.js (3002)  │
│  wss://ws.moment-lbs.app/            → WebSocket (3003)│ ← NEW!
└─────────────────────────────────────────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐   ┌───────────────┐   ┌─────────────────┐
│  Next.js     │   │  Vapor API    │   │  WebSocket      │ ← NEW!
│  (3002)      │   │  (8080)       │   │  Server (3003)  │
│  Frontend    │   │  REST API     │   │  Swift Vapor    │
│  SSR + Auth  │   │  CRUD         │   │  Real-time      │
└──────┬───────┘   └───────┬───────┘   └────────┬────────┘
       │                    │                     │
       └──────────┬─────────┴─────────────────────┘
                  ▼
       ┌──────────────────────────────────────────┐
       │    PostgreSQL (5432) + Redis (6379)      │
       │                                          │
       │  PostgreSQL:                             │
       │  - БД: moment                            │
       │  - Таблицы: users, sessions, orders,     │
       │    vehicles, routes, driver_locations    │
       │                                          │
       │  Redis:                                  │
       │  - WebSocket сессии                      │
       │  - Кэш последних координат водителей     │
       └──────────────────────────────────────────┘
```

---

## Инфраструктура

### Расположение проектов

```bash
/home/hronop/
├── mailserver/                         # Главный docker-compose
│   ├── docker-compose.yml              # ← ВСЕ сервисы здесь!
│   ├── .env                            # Переменные окружения
│   └── docker-data/                    # Persistent data
│
├── node/
│   ├── moment/                         # Next.js + Vapor API
│   │   ├── app/                        # Next.js frontend
│   │   ├── vapor-api/                  # Vapor backend (REST)
│   │   │   ├── Dockerfile
│   │   │   └── Sources/App/
│   │   │       ├── Middleware/
│   │   │       │   └── JWTAuthMiddleware.swift  # ← JWT auth
│   │   │       └── Models/
│   │   │           ├── User.swift
│   │   │           └── DBSession.swift
│   │   │
│   │   └── websocket/                  # WebSocket server (NEW!)
│   │       ├── Dockerfile              # ← Создать
│   │       ├── README.md
│   │       ├── Sources/
│   │       │   └── Hello/
│   │       │       ├── routes.swift
│   │       │       ├── configure.swift
│   │       │       ├── Models/Models.swift
│   │       │       └── WebSocketManager.swift
│   │       └── frontend/               # ← УДАЛИТЬ (тестовый UI)
│   │
│   └── blog/                           # Другой проект
│       └── ...
```

### Ключевые принципы

1. **Единый docker-compose** в `/home/hronop/mailserver/docker-compose.yml`
   - Все сервисы (blog, moment, vapor-api, websocket, postgres, redis, seaweedfs)
   - Общая сеть, shared volumes

2. **Одна PostgreSQL БД**: `moment`
   - Используется Next.js, Vapor API и WebSocket
   - Разные схемы для разных сервисов (опционально)

3. **Redis** для WebSocket сессий
   - Хранение активных соединений
   - Кэш последних координат водителей

4. **Nginx** как единая точка входа
   - HTTP/HTTPS → Next.js
   - REST API → Vapor API
   - WebSocket → WebSocket server (wss://ws.moment-lbs.app)

---

## Аутентификация

### Существующая система (Next.js + Vapor API)

**NextAuth v5** (в Next.js) генерирует JWT токены:
- Формат: **JWE** (JSON Web Encryption)
- Алгоритм: `dir` + `A256CBC-HS512`
- Секрет: `AUTH_SECRET` (из `.env`)
- Хранение: HTTP-only cookie `authjs.session-token`

**Vapor API** валидирует токены:
- Middleware: `JWTAuthMiddleware.swift`
- Расшифровка JWE → получение `userId`, `sessionId`, `firmaID`
- Проверка сессии в PostgreSQL таблице `sessions`

### Интеграция WebSocket

**Вариант 1: Повторное использование JWTAuthMiddleware** ✅ (рекомендуемый)

```swift
// В websocket/Sources/Hello/routes.swift

app.webSocket("chat") { req, ws in
    // 1. Проверка JWT из query или cookie
    let authMiddleware = JWTAuthMiddleware()
    guard let user = try await authMiddleware.authenticate(req) else {
        _ = ws.close(code: .policyViolation)
        return
    }

    // 2. Добавить соединение в WebSocketManager
    wsManager.add(userId: user.userId, socket: ws)

    // 3. Обработка сообщений
    ws.onText { ws, text in
        handleDriverLocation(userId: user.userId, data: text)
    }
}
```

**Вариант 2: Создать отдельную Redis-сессию для WebSocket**

Если нужна независимость от NextAuth:
- При логине в Next.js → создать параллельную сессию в Redis
- WebSocket получает `sessionId` из query-параметра
- Валидация: проверка `sessionId` в Redis

### Схема работы

```
1. Водитель авторизуется в Moment:
   → NextAuth генерирует JWT → сохраняет в cookie

2. Водитель открывает WebSocket:
   → wss://ws.moment-lbs.app/driver?token=JWT_TOKEN

3. WebSocket сервер:
   → Извлекает JWT из query/cookie
   → Вызывает JWTAuthMiddleware.authenticate()
   → Получает userId, firmaID
   → Сохраняет соединение в памяти

4. Водитель отправляет координаты:
   → { "type": "location", "lat": 52.5200, "lng": 13.4050 }

5. Сервер обрабатывает:
   → Сохраняет в PostgreSQL (driver_locations)
   → Отправляет диспетчерам через WebSocket
```

---

## Модель данных

### ⚠️ ВАЖНО: Таблица `track_points` УЖЕ СОЗДАНА!

Согласно [TRANSPORT_PROGRESS.md](../docs/TRANSPORT_PROGRESS.md), таблица для GPS координат **уже существует**:

```sql
-- ✅ Таблица создана в Phase 1 (см. scripts/add-transport-system.sql)
track_points (
    id BIGSERIAL PRIMARY KEY,
    orderID UUID REFERENCES orders(orderID) ON DELETE CASCADE,
    vehicleID UUID REFERENCES vehicles(vehicleID) ON DELETE SET NULL,
    driverID UUID REFERENCES workers(id) ON DELETE CASCADE,

    -- PostGIS geometry (POINT)
    location GEOMETRY(Point, 4326) NOT NULL,

    speed DECIMAL(6, 2),              -- Скорость (км/ч)
    heading DECIMAL(5, 2),            -- Направление (0-360°)
    accuracy DECIMAL(6, 2),           -- Точность GPS (метры)

    recordedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    createdAt TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (recordedAt);

-- Партиции по месяцам (авто-удаление через 2 месяца)
-- track_points_2026_03, track_points_2026_04, ...
```

**Ключевые отличия**:
- ✅ Использует **PostGIS GEOMETRY** вместо lat/lng колонок
- ✅ Связана с `orderID` (трекинг для конкретного заказа)
- ✅ Связана с `vehicleID` (какая машина)
- ✅ **Партиционирована по месяцам** (производительность + авто-очистка)
- ✅ Уже есть функции в `/lib/track-points.ts`

**Вывод**: Используем существующую `track_points` таблицу, создавать новую НЕ нужно!

### Модель в Swift (TrackPoint)

```swift
// websocket/Sources/Hello/Models/TrackPoint.swift

import Fluent
import Vapor

final class TrackPoint: Model, Content {
    static let schema = "track_points"

    @ID(custom: "id", generatedBy: .database)
    var id: Int?

    @OptionalField(key: "orderID")
    var orderID: UUID?

    @OptionalField(key: "vehicleID")
    var vehicleID: UUID?

    @Field(key: "driverID")
    var driverID: UUID

    // PostGIS GEOMETRY - храним как WKT строка "POINT(lng lat)"
    @Field(key: "location")
    var location: String

    @OptionalField(key: "speed")
    var speed: Double?

    @OptionalField(key: "heading")
    var heading: Double?

    @OptionalField(key: "accuracy")
    var accuracy: Double?

    @Timestamp(key: "recordedAt", on: .none)
    var recordedAt: Date?

    @Timestamp(key: "createdAt", on: .create)
    var createdAt: Date?

    init() {}

    init(driverID: UUID, lat: Double, lng: Double, orderID: UUID? = nil, vehicleID: UUID? = nil) {
        self.driverID = driverID
        self.orderID = orderID
        self.vehicleID = vehicleID
        // PostGIS WKT format: POINT(longitude latitude)
        self.location = "POINT(\(lng) \(lat))"
        self.recordedAt = Date()
    }

    // Helper для получения координат из PostGIS POINT
    func getCoordinates() -> (lat: Double, lng: Double)? {
        // Parse "POINT(13.4050 52.5200)" → (52.5200, 13.4050)
        let pattern = #"POINT\(([0-9.-]+)\s+([0-9.-]+)\)"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: location, range: NSRange(location.startIndex..., in: location)),
              match.numberOfRanges == 3 else {
            return nil
        }

        if let lngRange = Range(match.range(at: 1), in: location),
           let latRange = Range(match.range(at: 2), in: location),
           let lng = Double(location[lngRange]),
           let lat = Double(location[latRange]) {
            return (lat, lng)
        }
        return nil
    }
}
```

**Важно**:
- PostGIS хранит `GEOMETRY(Point, 4326)` - нужен специальный формат WKT
- Вместо прямого SQL `ST_MakePoint()` используем строку `"POINT(lng lat)"`
- При вставке PostgreSQL автоматически преобразует в GEOMETRY
- При чтении получаем WKT строку обратно
```

### Типы WebSocket сообщений

```typescript
// Клиент → Сервер (водитель отправляет)
type ClientMessage =
  | { type: "location", lat: number, lng: number, accuracy?: number, speed?: number }
  | { type: "ping" }
  | { type: "status", status: "available" | "busy" | "offline" }

// Сервер → Клиент (диспетчер получает)
type ServerMessage =
  | { type: "driver_location", userId: string, lat: number, lng: number, timestamp: number }
  | { type: "driver_status", userId: string, status: string }
  | { type: "pong" }
  | { type: "error", message: string }
```

---

## Docker и развёртывание

### Создать Dockerfile для WebSocket

```dockerfile
# websocket/Dockerfile

# ========================================
# Stage 1: Build Swift binary
# ========================================
FROM swift:6.0-jammy AS build

WORKDIR /build

# Copy package manifest
COPY Package.swift .

# Fetch dependencies
RUN swift package resolve

# Copy source code
COPY Sources ./Sources

# Build optimized binary
RUN swift build -c release --static-swift-stdlib

# ========================================
# Stage 2: Runtime image
# ========================================
FROM ubuntu:24.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash websocket

WORKDIR /app

# Copy binary from build stage
COPY --from=build /build/.build/release/WebSocketServer /app/

# Set ownership
RUN chown -R websocket:websocket /app

USER websocket

EXPOSE 3003

CMD ["./WebSocketServer"]
```

### Добавить в docker-compose.yml

```yaml
# /home/hronop/mailserver/docker-compose.yml

services:
  # ... existing services (blog, moment, vapor-api, postgres, redis, etc.)

  websocket:
    image: websocket:latest
    container_name: websocket
    restart: unless-stopped
    ports:
      - "127.0.0.1:3003:3003"
    environment:
      - DATABASE_URL=postgres://hronop:Sk02081978@postgres:5432/moment
      - AUTH_SECRET=${AUTH_SECRET}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - LOG_LEVEL=info
    depends_on:
      - postgres
      - redis
    mem_limit: 512m
    cpus: 1.0
    networks:
      - default

networks:
  default:
    name: moment-network
```

### Переменные окружения (`.env`)

```bash
# /home/hronop/mailserver/.env

# NextAuth JWT secret (shared between Next.js, Vapor API, WebSocket)
AUTH_SECRET=your-secret-key-here

# PostgreSQL
POSTGRES_USER=hronop
POSTGRES_PASSWORD=Sk02081978
POSTGRES_DB=moment

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### Команды для сборки и запуска

```bash
# 1. Перейти в директорию с docker-compose
cd /home/hronop/mailserver

# 2. Собрать образ WebSocket сервера
docker build -t websocket:latest /home/hronop/node/moment/websocket

# 3. Запустить все сервисы
docker compose up -d websocket

# 4. Проверить логи
docker compose logs -f websocket

# 5. Проверить статус
docker compose ps websocket

# 6. Перезапустить после изменений
docker compose restart websocket
```

---

## Nginx конфигурация

### Добавить WebSocket в `/etc/nginx/sites-available/default`

```nginx
# ===== WEBSOCKET SERVER =====
# Уже ЕСТЬ в конфиге (строки 748-779)
server {
    server_name ws.moment-lbs.app;
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    ssl_certificate /etc/letsencrypt/live/moment-lbs.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moment-lbs.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Block indexing
    location = /robots.txt {
        return 200 "User-agent: *\nDisallow: /\n";
        add_header Content-Type text/plain;
    }

    location / {
        limit_conn addr 1000;                      # Макс. 1000 одновременных подключений с одного IP
        proxy_pass http://localhost:3003/;         # → WebSocket container
        proxy_read_timeout 3600s;                  # 1 час для долгих соединений
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
        proxy_http_version 1.1;

        # WebSocket upgrade headers (КРИТИЧНО!)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Стандартные proxy headers
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP redirect для ws.moment-lbs.app (уже есть на строках 782-806)
server {
    if ($host = ws.moment-lbs.app) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    listen [::]:80;
    server_name ws.moment-lbs.app;
    return 404;
}
```

**✅ Конфиг УЖЕ ГОТОВ!** (проверено в `/etc/nginx/sites-available/default`, строки 748-779)

**Текущий статус:**
- ✅ Порт 3003 свободен (WebSocket сервер ещё не запущен)
- ✅ Nginx конфиг валиден
- ✅ SSL сертификаты для ws.moment-lbs.app настроены
- ✅ HTTP → HTTPS редирект работает (строка 786 в nginx)

**Что делать:**
1. Запустить WebSocket сервер в Docker → nginx автоматически начнёт проксировать
2. Проверить: `curl http://localhost:3003/health` (должен ответить после запуска)
3. Nginx перезагружать НЕ нужно (конфиг уже активен)

---

## Интеграция с Moment

### Удалить тестовый frontend

```bash
# Удалить /websocket/frontend/ (это был тестовый UI для отладки)
rm -rf /home/hronop/node/moment/websocket/frontend
```

### Адаптировать WebSocket сервер

#### 0. Обновить Package.swift (добавить crypto библиотеки)

```swift
// websocket/Package.swift

dependencies: [
    .package(url: "https://github.com/vapor/vapor.git", from: "4.115.0"),
    .package(url: "https://github.com/vapor/fluent.git", from: "4.8.0"),
    .package(url: "https://github.com/vapor/fluent-postgres-driver.git", from: "2.0.0"),
    .package(url: "https://github.com/vapor/redis.git", from: "4.0.0"),

    // 🔐 Crypto для JWE расшифровки (как в vapor-api)
    .package(url: "https://github.com/apple/swift-crypto.git", "1.0.0"..<"4.0.0"),
    .package(url: "https://github.com/krzyzanowskim/CryptoSwift.git", from: "1.8.0"),
],
targets: [
    .executableTarget(
        name: "WebSocketServer",
        dependencies: [
            .product(name: "Vapor", package: "vapor"),
            .product(name: "Fluent", package: "fluent"),
            .product(name: "FluentPostgresDriver", package: "fluent-postgres-driver"),
            .product(name: "Redis", package: "redis"),

            // Crypto для JWTAuthMiddleware
            .product(name: "Crypto", package: "swift-crypto"),
            .product(name: "CryptoSwift", package: "CryptoSwift"),
        ]
    )
]
```

**Важно**: Те же зависимости, что и в vapor-api (см. `vapor-api/MIGRATION-CONTEXT.md`).

#### 1. Скопировать JWTAuthMiddleware из vapor-api

```bash
# Создать директорию Middleware
mkdir -p /home/hronop/node/moment/websocket/Sources/Hello/Middleware

# Скопировать JWTAuthMiddleware (✅ РАБОТАЮЩАЯ версия с JWE A256CBC-HS512)
cp /home/hronop/node/moment/vapor-api/Sources/App/Middleware/JWTAuthMiddleware.swift \
   /home/hronop/node/moment/websocket/Sources/Hello/Middleware/

# Скопировать модели (нужны для middleware)
cp /home/hronop/node/moment/vapor-api/Sources/App/Models/DBSession.swift \
   /home/hronop/node/moment/websocket/Sources/Hello/Models/
cp /home/hronop/node/moment/vapor-api/Sources/App/Models/AuthenticatedUser.swift \
   /home/hronop/node/moment/websocket/Sources/Hello/Models/
```

**Примечание**: JWTAuthMiddleware из vapor-api уже полностью протестирован и работает с NextAuth v5 JWE токенами. См. `/home/hronop/node/moment/vapor-api/MIGRATION-CONTEXT.md` для деталей реализации.

#### 2. Обновить `configure.swift`

```swift
// websocket/Sources/Hello/configure.swift

import Fluent
import FluentPostgresDriver
import Vapor
import Redis

public func configure(_ app: Application) async throws {
    // Port
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = 3003

    // CORS
    let corsConfiguration = CORSMiddleware.Configuration(
        allowedOrigin: .all,
        allowedMethods: [.GET, .POST, .PUT, .OPTIONS, .DELETE, .PATCH],
        allowedHeaders: [
            .accept, .authorization, .contentType, .origin, .xRequestedWith, .userAgent,
            .accessControlAllowOrigin, .init("X-Session-ID"),
        ]
    )
    app.middleware.use(CORSMiddleware(configuration: corsConfiguration))

    // PostgreSQL (БД moment - SHARED с Next.js и Vapor API)
    // ⚠️ ВАЖНО: Используем БД "moment", НЕ "hronop"! (см. vapor-api/MIGRATION-CONTEXT.md)
    guard let databaseURL = Environment.get("DATABASE_URL") else {
        fatalError("DATABASE_URL not set")
    }

    try app.databases.use(.postgres(url: databaseURL), as: .psql)

    // Redis (для WebSocket сессий)
    let redisHost = Environment.get("REDIS_HOST") ?? "localhost"
    let redisPort = Int(Environment.get("REDIS_PORT") ?? "6379") ?? 6379

    app.redis.configuration = try RedisConfiguration(
        hostname: redisHost,
        port: redisPort,
        pool: RedisConfiguration.PoolOptions(
            maximumConnectionCount: .maximumActiveConnections(64),
            minimumConnectionCount: 4,
            connectionRetryTimeout: .seconds(30)
        )
    )

    // WebSocket Manager
    let wsManager = WebSocketManager()
    app.storage[WebSocketManagerKey.self] = wsManager

    // Routes
    try routes(app)
}

extension Application {
    var wsManager: WebSocketManager {
        guard let manager = storage[WebSocketManagerKey.self] else {
            fatalError("WebSocketManager not configured")
        }
        return manager
    }
}

struct WebSocketManagerKey: StorageKey {
    typealias Value = WebSocketManager
}
```

#### 3. Обновить `routes.swift` для driver tracking

```swift
// websocket/Sources/Hello/routes.swift

import Fluent
import Vapor

func routes(_ app: Application) throws {
    // Health check
    app.get("health") { req in
        return ["status": "ok", "service": "websocket"]
    }

    // WebSocket для водителей: wss://ws.moment-lbs.app/driver?token=JWT
    app.webSocket("driver") { req, ws in
        let clientIP = req.remoteAddress?.description ?? "unknown"

        // 1. Извлечь JWT из query или cookie
        guard let token = req.query[String.self, at: "token"]
            ?? extractTokenFromCookie(req) else {
            req.logger.warning("❌ WebSocket rejected: No token. IP: \(clientIP)")
            _ = ws.close(code: .policyViolation)
            return
        }

        // 2. Валидация через JWTAuthMiddleware
        let authMiddleware = JWTAuthMiddleware()
        guard let authUser = try await authMiddleware.validateToken(token, req: req) else {
            req.logger.warning("❌ WebSocket rejected: Invalid token. IP: \(clientIP)")
            _ = ws.close(code: .policyViolation)
            return
        }

        req.logger.info("✅ Driver connected: userId=\(authUser.userId), IP: \(clientIP)")

        // 3. Добавить в WebSocketManager
        req.application.wsManager.add(userId: authUser.userId, socket: ws)

        // 4. Отправить welcome сообщение
        let welcome = ServerMessage(
            type: "welcome",
            message: "Connected to Moment WebSocket. userId: \(authUser.userId)"
        )
        ws.send(try! JSONEncoder().encode(welcome))

        // 5. Обработка входящих сообщений
        ws.onText { ws, text in
            guard let data = text.data(using: .utf8),
                  let message = try? JSONDecoder().decode(ClientMessage.self, from: data) else {
                req.logger.warning("Failed to decode message: \(text)")
                return
            }

            switch message.type {
            case "location":
                // Сохранить координаты в БД
                let location = DriverLocation(
                    userId: authUser.userId,
                    lat: message.lat!,
                    lng: message.lng!
                )
                location.accuracy = message.accuracy
                location.speed = message.speed

                location.save(on: req.db).whenComplete { result in
                    switch result {
                    case .success:
                        // Отправить диспетчерам
                        let broadcast = ServerMessage(
                            type: "driver_location",
                            userId: authUser.userId,
                            lat: message.lat!,
                            lng: message.lng!,
                            timestamp: Date().timeIntervalSince1970
                        )
                        req.application.wsManager.broadcastToDispatchers(
                            message: try! JSONEncoder().encode(broadcast)
                        )
                    case .failure(let error):
                        req.logger.error("Failed to save location: \(error)")
                    }
                }

            case "ping":
                ws.send("pong")

            case "status":
                // Обновить статус водителя
                req.logger.info("Driver status: \(message.status ?? "unknown")")
            }
        }

        // 6. Обработка отключения
        ws.onClose.whenComplete { _ in
            req.logger.info("🔌 Driver disconnected: userId=\(authUser.userId)")
            req.application.wsManager.remove(userId: authUser.userId)
        }
    }

    // WebSocket для диспетчеров: wss://ws.moment-lbs.app/dispatcher?token=JWT
    app.webSocket("dispatcher") { req, ws in
        // Аналогично, но без отправки координат, только получение
        // ...
    }
}

func extractTokenFromCookie(_ req: Request) -> String? {
    let cookieNames = [
        "__Secure-authjs.session-token",
        "authjs.session-token"
    ]

    for name in cookieNames {
        if let token = req.cookies[name]?.string {
            return token
        }
    }
    return nil
}

struct ClientMessage: Codable {
    let type: String
    let lat: Double?
    let lng: Double?
    let accuracy: Double?
    let speed: Double?
    let status: String?
}

struct ServerMessage: Codable, Sendable {
    let type: String
    let message: String?
    let userId: String?
    let lat: Double?
    let lng: Double?
    let timestamp: Double?
}
```

### Интеграция в Next.js (клиент)

```typescript
// /home/hronop/node/moment/lib/websocket-client.ts

export class DriverWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private token: string) {}

  connect() {
    const wsUrl = `wss://ws.moment-lbs.app/driver?token=${encodeURIComponent(this.token)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WS] Connected to Moment WebSocket');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'welcome':
          console.log('[WS] Welcome:', data.message);
          break;
        case 'driver_location':
          // Обновить карту с координатами другого водителя
          this.handleDriverLocation(data);
          break;
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting in 5s...');
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    };
  }

  sendLocation(lat: number, lng: number, accuracy?: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'location',
        lat,
        lng,
        accuracy,
        speed: 0 // TODO: получить из Geolocation API
      }));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
  }

  private handleDriverLocation(data: any) {
    // Emit custom event для обновления карты
    window.dispatchEvent(new CustomEvent('driver-location-update', {
      detail: {
        userId: data.userId,
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp
      }
    }));
  }
}
```

---

## План реализации

### Этап 1: Подготовка WebSocket сервера ✅

- [x] Изучить существующий WebSocket код
- [x] Изучить vapor-api аутентификацию
- [x] Изучить nginx конфигурацию
- [ ] Удалить `/websocket/frontend/`
- [ ] Скопировать `JWTAuthMiddleware.swift` из vapor-api
- [ ] Обновить `configure.swift` (PostgreSQL + Redis)
- [ ] Создать модель `DriverLocation.swift`
- [ ] Создать Dockerfile

### Этап 2: Docker интеграция

- [ ] Добавить `websocket` сервис в `/home/hronop/mailserver/docker-compose.yml`
- [ ] Собрать образ: `docker build -t websocket:latest`
- [ ] Запустить: `docker compose up -d websocket`
- [ ] Проверить логи: `docker compose logs -f websocket`

### Этап 3: База данных

- [ ] Создать таблицу `driver_locations` в PostgreSQL
- [ ] Создать миграцию в Fluent (опционально)
- [ ] Протестировать сохранение координат

### Этап 4: Nginx (уже готов!)

- [x] Конфиг для `ws.moment-lbs.app` уже есть
- [ ] Проверить SSL сертификаты
- [ ] Перезагрузить Nginx: `sudo nginx -t && sudo nginx -s reload`

### Этап 5: Клиент (Next.js)

- [ ] Создать `lib/websocket-client.ts`
- [ ] Интегрировать в страницу водителя
- [ ] Отправлять GPS координаты каждые 5 секунд
- [ ] Отображать других водителей на карте диспетчера

### Этап 6: Тестирование

- [ ] Проверить аутентификацию (валидный/невалидный JWT)
- [ ] Проверить отправку координат
- [ ] Проверить получение координат диспетчером
- [ ] Нагрузочное тестирование (100+ водителей)

---

## Важные команды

### Docker

```bash
# Сборка
cd /home/hronop/mailserver
docker build -t websocket:latest /home/hronop/node/moment/websocket

# Запуск
docker compose up -d websocket

# Логи
docker compose logs -f websocket

# Перезапуск
docker compose restart websocket

# Остановка
docker compose stop websocket

# Удаление
docker compose rm -f websocket
```

### Nginx

```bash
# Проверить конфиг
sudo nginx -t

# Перезагрузить
sudo nginx -s reload

# Посмотреть логи
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### PostgreSQL

```bash
# Подключиться к БД
docker compose exec postgres psql -U hronop -d moment

# Создать таблицу
\i /path/to/create_driver_locations.sql

# Проверить данные
SELECT * FROM driver_locations ORDER BY timestamp DESC LIMIT 10;
```

### Redis

```bash
# Подключиться к Redis
docker compose exec redis redis-cli

# Посмотреть активные сессии
KEYS "ws:*"

# Получить данные сессии
GET "ws:session:12345"
```

---

## Troubleshooting

### WebSocket не подключается

1. Проверить порт:
   ```bash
   sudo lsof -i :3003
   docker compose ps websocket
   ```

2. Проверить Nginx:
   ```bash
   sudo nginx -t
   curl -I https://ws.moment-lbs.app/health
   ```

3. Проверить SSL:
   ```bash
   openssl s_client -connect ws.moment-lbs.app:443 -servername ws.moment-lbs.app
   ```

### JWT токен не валидируется

1. Проверить `AUTH_SECRET` в `.env`:
   ```bash
   docker compose exec websocket printenv AUTH_SECRET
   ```

2. Проверить логи:
   ```bash
   docker compose logs -f websocket | grep "JWE"
   ```

3. Сравнить с vapor-api:
   ```bash
   docker compose exec vapor-api printenv AUTH_SECRET
   ```

### Координаты не сохраняются

1. Проверить таблицу:
   ```sql
   \d driver_locations
   ```

2. Проверить права:
   ```sql
   SELECT * FROM pg_tables WHERE tablename = 'driver_locations';
   ```

3. Проверить логи:
   ```bash
   docker compose logs -f websocket | grep "Failed to save"
   ```

---

---

## 🔗 Интеграция с существующей транспортной системой

### Связь с TRANSPORT_PROGRESS.md

WebSocket сервер **заменяет** REST API подход для GPS трекинга:

| Функционал | Было (REST API) | Стало (WebSocket) |
|------------|-----------------|-------------------|
| **Отправка координат** | POST `/api/transport/location` каждые 30 сек | WebSocket stream реал-тайм (5-10 сек) |
| **Получение обновлений** | SSE `vehicle_location_update` | WebSocket broadcast |
| **Таблица** | `track_points` | ✅ Та же `track_points` |
| **Offline sync** | IndexedDB → bulk POST | IndexedDB → bulk WebSocket |

### Взаимодействие с /lib/track-points.ts

WebSocket сервер **НЕ дублирует** функционал из `/lib/track-points.ts`, а **дополняет**:

**Next.js** (`/lib/track-points.ts`):
- `insertTrackPoint()` - используется для REST API fallback
- `getTrackPointsByOrderID()` - читает историю для диспетчера
- `getOrderTrackGeoJSON()` - генерирует линию маршрута
- `calculateOrderDistance()` - геопространственные вычисления

**WebSocket сервер**:
- Принимает real-time координаты от водителя
- Сохраняет в `track_points` **напрямую** (Swift → PostgreSQL)
- Транслирует диспетчерам через WebSocket (без SSE)

### Схема работы

```
1. Водитель подключается к wss://ws.moment-lbs.app/driver?token=JWT

2. Водитель отправляет координаты:
   → { "type": "location", "lat": 52.52, "lng": 13.40, "orderID": "...", "vehicleID": "..." }

3. WebSocket сервер:
   → Сохраняет в track_points (TrackPoint.swift)
   → Отправляет диспетчерам через /dispatcher соединение

4. Диспетчер получает:
   → { "type": "driver_location", "driverID": "...", "lat": 52.52, "lng": 13.40 }
   → Обновляет маркер на карте в реальном времени

5. Для истории (линия маршрута):
   → Next.js использует getOrderTrackGeoJSON() из /lib/track-points.ts
   → Читает все точки для orderID из PostgreSQL
```

### Миграционная стратегия

**Phase 1** (текущий этап):
- ✅ Таблица `track_points` создана
- ⏳ REST API `/api/transport/location` для тестирования
- ⏳ SSE для диспетчеров

**Phase 2** (после WebSocket):
- ✅ WebSocket real-time трекинг
- ✅ REST API остаётся как fallback (если WebSocket недоступен)
- ✅ SSE остаётся для других событий (order_assigned, driver_online)

**Вывод**: WebSocket и REST API **дополняют** друг друга, не заменяют полностью!

---

## 🎯 Рекомендации по масштабированию

### Расчет нагрузки для 20,000 водителей

#### HTTP REST + Batching (текущий подход)

**За 2 минуты работы**:
```
20,000 водителей × 12 батчей (каждые 10 сек) = 240,000 HTTP запросов

Bandwidth:
  Upload:   240,000 × 3 KB = 720 MB
  Download: 240,000 × 1 KB = 240 MB
  ИТОГО: 960 MB за 2 минуты = 480 MB/мин = 64 Mbps 🔥

TCP соединения:
  240,000 handshakes за 2 минуты = 2,000 новых соединений/сек 💥

DB операции:
  240,000 UPDATE за 2 минуты = 2,000 UPDATE/сек 💥💥

OSRM вызовы (с кэшем 50% hit rate):
  120,000 вызовов = 1,000 вызовов/сек
```

**Проблемы**:
- ❌ **2,000 req/sec** → nginx/vapor задыхаются
- ❌ **64 Mbps bandwidth** → дорого!
- ❌ **2,000 UPDATE/sec** → PostgreSQL под большой нагрузкой
- ❌ Латенси для диспетчера: **до 10 секунд**

---

#### WebSocket + Server-side Batching (рекомендуемый)

**За 2 минуты работы**:
```
20,000 постоянных WebSocket соединений
1,200,000 GPS точек (20k × 60 точек)

Bandwidth:
  Upload:   1,200,000 × 100 bytes = 120 MB
  Download: 1,200,000 × 50 bytes = 60 MB
  ИТОГО: 180 MB за 2 минуты = 90 MB/мин = 12 Mbps ✅

  ЭКОНОМИЯ: -81% bandwidth!

TCP соединения:
  20,000 постоянных (весь день!)
  0 новых handshakes

  ЭКОНОМИЯ: -99.9% TCP overhead!

DB операции (с батчингом на сервере):
  240,000 UPDATE за 2 минуты = 2,000 UPDATE/сек
  ИЛИ с агрегацией: 20,000 UPDATE/мин = 333 UPDATE/сек ✅

  ЭКОНОМИЯ: до -83% DB операций!

RAM на сервере:
  20,000 соединений × 50 KB = 1 GB RAM
  (Нужно horizontal scaling)
```

**Преимущества**:
- ✅ **-81% bandwidth** (12 Mbps vs 64 Mbps)
- ✅ **-99.9% TCP handshakes**
- ✅ **-83% DB операций** (с агрегацией)
- ✅ **<100ms латенси** для диспетчера (vs 10 сек)
- ✅ Двунаправленная связь (сервер → водитель)

---

### Критические оптимизации для масштаба 20k+

#### 1. WebSocket Clustering (ОБЯЗАТЕЛЬНО!)

Один сервер не выдержит 20,000 соединений. Нужно:

```
                    ┌─── WebSocket Server 1 (5k водителей)
                    │
Nginx Load Balancer ├─── WebSocket Server 2 (5k водителей)
                    │
                    ├─── WebSocket Server 3 (5k водителей)
                    │
                    └─── WebSocket Server 4 (5k водителей)
                          ↓
                      Redis Pub/Sub (координация между серверами)
                          ↓
                      PostgreSQL
```

**Docker Compose**:
```yaml
services:
  websocket-1:
    image: websocket:latest
    environment:
      - INSTANCE_ID=1
      - REDIS_CHANNEL=driver_updates

  websocket-2:
    image: websocket:latest
    environment:
      - INSTANCE_ID=2
      - REDIS_CHANNEL=driver_updates

  # ... websocket-3, websocket-4

  redis:
    image: redis:7-alpine
    # Для координации между WebSocket серверами
```

---

#### 2. PostgreSQL Connection Pooling

```swift
// configure.swift
app.databases.use(.postgres(
    configuration: SQLPostgresConfiguration(
        hostname: "postgres",
        port: 5432,
        username: "hronop",
        password: "...",
        database: "moment",
        tls: .disable
    ),
    maxConnectionsPerEventLoop: 4,  // ← Критично!
    connectionPoolTimeout: .seconds(30)
), as: .psql)
```

**Расчет**:
- 4 WebSocket сервера
- По 4 event loops каждый
- 4 connections per loop
- = 64 одновременных DB соединений
- При 2,000 UPDATE/sec → каждое соединение обрабатывает ~31 UPDATE/sec

---

#### 3. Server-side GPS Batching

```swift
// WebSocketManager.swift

class WebSocketManager {
    // Накапливаем точки в памяти
    private var gpsBatches: [UUID: [GPSPoint]] = [:]
    private let batchSize = 10
    private let batchInterval: TimeInterval = 30  // 30 секунд

    func handleGPSPoint(driverID: UUID, point: GPSPoint) {
        gpsBatches[driverID, default: []].append(point)

        let batch = gpsBatches[driverID]!

        // Сохраняем в БД только когда накопилось 10 точек ИЛИ прошло 30 сек
        if batch.count >= batchSize || timeSinceLastSave(driverID) > batchInterval {
            // Сохраняем только ПОСЛЕДНЮЮ точку в БД
            let latest = batch.last!
            try await TrackPoint(driverID: driverID, lat: latest.lat, lng: latest.lng)
                .save(on: db)

            // Но broadcast диспетчерам ВСЕ точки (для плавной линии на карте)
            for point in batch {
                broadcastToDispatchers(driverID: driverID, point: point)
            }

            gpsBatches[driverID] = []
        } else {
            // Только broadcast диспетчерам, БД не трогаем
            broadcastToDispatchers(driverID: driverID, point: point)
        }
    }
}
```

**Эффект**:
- БД операции: 2,000/sec → **66/sec** (-97%!) 🎉
- Диспетчер видит ВСЕ точки в real-time
- История маршрута содержит только ключевые точки

---

#### 4. Redis Pub/Sub для broadcast

```swift
// Когда водитель на WebSocket Server 1 отправляет координаты,
// диспетчеры могут быть подключены к Server 2, 3, 4

// WebSocket Server 1
func handleGPSUpdate(point: GPSPoint) async throws {
    // 1. Broadcast локальным диспетчерам
    localDispatchers.forEach { $0.send(point) }

    // 2. Publish в Redis для других серверов
    let message = try JSONEncoder().encode(point)
    try await redis.publish(message, to: "driver_updates")
}

// WebSocket Server 2, 3, 4
func subscribeToRedis() {
    redis.subscribe(to: "driver_updates") { message in
        // Получили координаты от Server 1
        // Отправляем СВОИМ диспетчерам
        localDispatchers.forEach { $0.send(message) }
    }
}
```

---

#### 5. OSRM Caching (УЖЕ ЕСТЬ! ✅)

```swift
// VehicleLocationController.swift (уже реализовано)
private static let cacheLock = NSLock()
private nonisolated(unsafe) static var osrmCache: [String: (lat, lng, timestamp)] = [:]
private static let cacheGridSize: Double = 0.0001 // ~11 meters

// Эффект: Cache hit rate 50-80%
// 2,000 OSRM req/sec → 400-1,000 req/sec
```

**Для масштаба 20k нужно**:
- ✅ Увеличить cache size до 10,000 entries
- ✅ Добавить Redis для shared cache между серверами
- ✅ TTL увеличить до 5 минут (маршруты не меняются быстро)

---

#### 6. Horizontal Scaling: Nginx Load Balancer

```nginx
# /etc/nginx/sites-available/default

upstream websocket_backend {
    # IP hash = sticky sessions (водитель всегда на том же сервере)
    ip_hash;

    server 127.0.0.1:3003;  # WebSocket Server 1
    server 127.0.0.1:3004;  # WebSocket Server 2
    server 127.0.0.1:3005;  # WebSocket Server 3
    server 127.0.0.1:3006;  # WebSocket Server 4
}

server {
    server_name ws.moment-lbs.app;

    location / {
        proxy_pass http://websocket_backend;

        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

### Итоговая архитектура для 20k водителей

```
                                  ┌─── Redis Pub/Sub ────┐
                                  │   (coordination)     │
                                  └──────────────────────┘
                                            ↑
┌──────────┐                               │
│ 20k      │         ┌─────────────────────┼────────────────────────┐
│ Drivers  │ WSS     │                     │                        │
│          ├────────►│ Nginx LB            │                        │
└──────────┘         │   (ip_hash)         │                        │
                     │                     │                        │
                     └─────┬───────┬───────┼─────┬──────────────────┘
                           │       │       │     │
                     ┌─────▼──┐ ┌──▼────┐ ┌▼─────▼┐ ┌────────┐
                     │ WS-1   │ │ WS-2  │ │ WS-3 │ │ WS-4   │
                     │ 5k     │ │ 5k    │ │ 5k   │ │ 5k     │
                     └────┬───┘ └───┬───┘ └──┬───┘ └────┬───┘
                          │         │        │          │
                          └─────────┴────────┴──────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  PostgreSQL       │
                          │  (connection pool)│
                          │  64 connections   │
                          └───────────────────┘
```

**Capacity**:
- **Bandwidth**: 12 Mbps (vs 64 Mbps HTTP)
- **TCP**: 20,000 постоянных (vs 2,000/sec новых)
- **DB**: 66 UPDATE/sec (vs 2,000/sec)
- **Latency**: <100ms (vs 10 sec)
- **Horizontal scaling**: до 100k+ водителей

---

### Миграционный план (20k водителей)

#### Phase 1: HTTP Batching (1-100 водителей) ✅ ТЕКУЩИЙ
- ✅ HTTP REST с клиентским батчингом
- ✅ OSRM кэш
- ✅ DB оптимизация (UPDATE...RETURNING)
- **Ограничение**: до 100 водителей

#### Phase 2: Single WebSocket (100-1,000 водителей)
- 🎯 Запустить 1 WebSocket сервер
- 🎯 Гибридный режим (WebSocket + HTTP fallback)
- 🎯 Server-side batching для БД
- **Ограничение**: до 1,000 водителей

#### Phase 3: Clustered WebSocket (1,000-10,000 водителей)
- 🎯 4 WebSocket сервера за Nginx LB
- 🎯 Redis Pub/Sub для координации
- 🎯 Shared OSRM cache в Redis
- **Ограничение**: до 10,000 водителей

#### Phase 4: Production Scale (10,000-100,000 водителей)
- 🎯 Auto-scaling WebSocket pods (Kubernetes)
- 🎯 PostgreSQL read replicas
- 🎯 Dedicated OSRM cluster
- 🎯 CDN для static assets
- **Capacity**: до 100,000 водителей

---

### Monitoring для масштаба

**Критичные метрики**:
```bash
# WebSocket connections
watch 'docker stats websocket-1 websocket-2 websocket-3 websocket-4'

# Database load
docker exec postgres psql -U hronop -d moment -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# OSRM cache hit rate
docker logs websocket-1 | grep "Cache hit" | wc -l

# Redis Pub/Sub throughput
docker exec redis redis-cli INFO stats | grep pubsub

# Bandwidth
iftop -i eth0
```

**Alerts**:
- WebSocket connections > 5,000 на сервер → Add server
- DB connections > 50 → Scale PostgreSQL
- OSRM cache hit rate < 50% → Increase cache size
- Bandwidth > 80% capacity → Add WebSocket servers

---

### Cost Optimization (20k водителей)

**HTTP REST + Batching**:
```
Bandwidth: 64 Mbps × 24h × 30 days × $0.10/GB ≈ $2,074/month 💸
Server CPU: High load → need scaling
DB load: High → expensive tier
```

**WebSocket + Clustering**:
```
Bandwidth: 12 Mbps × 24h × 30 days × $0.10/GB ≈ $389/month ✅
Server RAM: 4 servers × 2GB = 8GB ≈ $80/month
Redis: 4GB cache ≈ $40/month
TOTAL: ~$509/month

SAVINGS: $2,074 - $509 = $1,565/month 🎉
```

**ROI**: WebSocket окупается даже при 1,000 водителей!

---

### Резюме: WebSocket критически необходим для 20k

| Метрика | HTTP Batch | WebSocket | Улучшение |
|---------|------------|-----------|-----------|
| **Bandwidth** | 64 Mbps | 12 Mbps | **-81%** 🎉 |
| **TCP/sec** | 2,000 | 0 | **-100%** 🎉 |
| **DB ops/sec** | 2,000 | 66 | **-97%** 🎉 |
| **Latency** | 10 sec | <100ms | **-99%** 🎉 |
| **Cost/month** | $2,074 | $509 | **-75%** 🎉 |
| **Scalability** | Limited | Horizontal | **∞** 🎉 |

**ВЫВОД**: При масштабе 20,000 водителей WebSocket не просто желателен - он **КРИТИЧЕСКИ НЕОБХОДИМ** для:
1. Снижения bandwidth на 81%
2. Снижения DB нагрузки на 97%
3. Снижения costs на 75%
4. Real-time UX для диспетчеров

**Рекомендация**: Начать с Phase 2 (Single WebSocket) для тестирования, затем масштабировать до Phase 3-4.

---

## 🛡️ Server-Side Validation для WebSocket (20k водителей)

### Проблема: Валидация только на клиенте - угроза безопасности

В текущей реализации (HTTP REST `/api/transport/location`) все GPS валидации и расчеты уже **ПРАВИЛЬНО** выполняются на сервере:

**✅ Что УЖЕ защищено** ([VehicleLocationController.swift:152-218](../vapor-api/Sources/App/Controllers/VehicleLocationController.swift#L152-L218)):

```swift
// SERVER-SIDE VALIDATION (текущая HTTP реализация)

// 1. Получаем последнюю известную позицию из DB
let lastPosition = try await sql.raw("""
    SELECT "currentLat", "currentLng", "lastLocationUpdate"
    FROM vehicles
    WHERE "vehicleID" = \(bind: body.vehicleID)
      AND "firmaID" = \(bind: firmaID)
    """).first()

// 2. Проверка реалистичности перемещения
let dist = Self.distanceStatic(lat1: lastLat, lng1: lastLng,
                              lat2: body.latitude, lng2: body.longitude)
let timeDelta = Date().timeIntervalSince(lastUpdate)

// SERVER-SIDE BUSINESS RULE: Maximum realistic distance based on time
// At 130 km/h (highway speed), in 1 second you travel ~36 meters
// We allow up to 150 km/h as absolute maximum (42m/sec)
let maxDistancePerSecond = 42.0 // meters (150 km/h)
let maxRealisticDist = maxDistancePerSecond * max(timeDelta, 1.0)

if dist > maxRealisticDist {
    req.logger.warning("[GPS] 🚫 Suspicious GPS jump detected")
    throw Abort(.badRequest, reason: "Invalid GPS point: unrealistic movement")
}

// 3. Server-calculated bearing (hidden from client - business logic)
if dist > 3.0 {
    bearing = calculateBearing(lat1: lastLat, lng1: lastLng,
                              lat2: body.latitude, lng2: body.longitude)
}

// 4. Server-calculated speed (hidden from client - business logic)
if timeDelta > 0 {
    speed = (dist / 1000.0) / (timeDelta / 3600.0) // km/h
}
```

**Почему это критично?**
- ❌ Клиентский код (JavaScript/TypeScript) легко деобфусцируется
- ❌ DevTools позволяют модифицировать любые переменные
- ❌ Service Worker может подменять fetch() запросы
- ✅ **Вся бизнес-логика ДОЛЖНА быть на сервере!**

---

### WebSocket реализация с валидацией (идентично HTTP)

При переходе на WebSocket **ОБЯЗАТЕЛЬНО** сохранить все серверные валидации:

```swift
// websocket/Sources/Hello/routes.swift

app.webSocket("driver") { req, ws in
    // 1. Аутентификация (см. выше)
    guard let authUser = try await authMiddleware.validateToken(token, req: req) else {
        _ = ws.close(code: .policyViolation)
        return
    }

    // 2. Обработка GPS точек
    ws.onText { ws, text in
        guard let data = text.data(using: .utf8),
              let message = try? JSONDecoder().decode(ClientMessage.self, from: data) else {
            return
        }

        switch message.type {
        case "location":
            // 🛡️ SERVER-SIDE VALIDATION (КРИТИЧНО!)
            try await validateAndSaveGPSPoint(
                userId: authUser.userId,
                firmaID: authUser.firmaID,
                vehicleID: message.vehicleID,
                lat: message.lat,
                lng: message.lng,
                req: req
            )
        }
    }
}
```

**Функция валидации (идентична HTTP версии)**:

```swift
// websocket/Sources/Hello/Controllers/GPSValidator.swift

import Vapor
import Fluent

struct GPSValidator {
    /// Validate and save GPS point with server-side business rules
    static func validateAndSaveGPSPoint(
        userId: String,
        firmaID: String,
        vehicleID: String,
        lat: Double,
        lng: Double,
        req: Request
    ) async throws -> GPSValidationResult {

        guard let sql = req.db as? SQLDatabase else {
            throw Abort(.internalServerError)
        }

        // 1. GET LAST KNOWN POSITION FROM DB (SERVER SOURCE OF TRUTH)
        let lastPosition = try await sql.raw("""
            SELECT "currentLat", "currentLng", "lastLocationUpdate"
            FROM vehicles
            WHERE "vehicleID" = \(bind: vehicleID)
              AND "firmaID" = \(bind: firmaID)
            """).first()

        guard let lastRow = lastPosition else {
            req.logger.warning("[GPS] Vehicle not found: \(vehicleID)")
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        var bearing: Double? = nil
        var speed: Double? = nil

        if let lastLat = try? lastRow.decode(column: "currentLat", as: Double.self),
           let lastLng = try? lastRow.decode(column: "currentLng", as: Double.self),
           let lastUpdate = try? lastRow.decode(column: "lastLocationUpdate", as: Date.self) {

            // 2. CALCULATE DISTANCE AND TIME (SERVER-SIDE)
            let dist = VehicleLocationController.distanceStatic(
                lat1: lastLat, lng1: lastLng,
                lat2: lat, lng2: lng
            )
            let timeDelta = Date().timeIntervalSince(lastUpdate)

            // 3. BUSINESS RULE: MAXIMUM SPEED VALIDATION (SERVER-SIDE)
            // At 130 km/h (highway speed), in 1 second you travel ~36 meters
            // We allow up to 150 km/h as absolute maximum (42m/sec)
            let maxDistancePerSecond = 42.0 // meters (150 km/h)
            let maxRealisticDist = maxDistancePerSecond * max(timeDelta, 1.0)

            if dist > maxRealisticDist {
                req.logger.warning("""
                    [GPS] 🚫 Suspicious GPS jump detected: \
                    \(String(format: "%.1f", dist))m in \(String(format: "%.1f", timeDelta))s \
                    (max: \(String(format: "%.1f", maxRealisticDist))m)
                    """)

                throw Abort(.badRequest, reason: "Invalid GPS point: unrealistic movement")
            }

            // 4. CALCULATE BEARING (SERVER-SIDE, HIDDEN FROM CLIENT)
            if dist > 3.0 {
                bearing = VehicleLocationController.calculateBearing(
                    lat1: lastLat, lng1: lastLng,
                    lat2: lat, lng2: lng
                )
            }

            // 5. CALCULATE SPEED (SERVER-SIDE, HIDDEN FROM CLIENT)
            if timeDelta > 0 {
                speed = (dist / 1000.0) / (timeDelta / 3600.0) // km/h
            }

            req.logger.debug("""
                [GPS] ✅ Validated: dist=\(String(format: "%.1f", dist))m, \
                time=\(String(format: "%.1f", timeDelta))s, \
                speed=\(String(format: "%.1f", speed ?? 0))km/h, \
                bearing=\(String(format: "%.1f", bearing ?? 0))°
                """)
        }

        // 6. SNAP TO ROAD (SERVER-SIDE, OSRM)
        let osrmURL = Environment.get("OSRM_URL") ?? "http://osrm:5000"
        var finalLat = lat
        var finalLng = lng
        var wasSnapped = false

        if let snapped = try await VehicleLocationController.snapToRoadStatic(
            lat: lat, lng: lng, osrmURL: osrmURL, req: req
        ) {
            finalLat = snapped.lat
            finalLng = snapped.lng
            wasSnapped = true
        }

        // 7. UPDATE DATABASE (SERVER-SIDE, ATOMIC)
        let timestamp = Date()

        _ = try await sql.raw("""
            UPDATE vehicles
            SET "currentLat" = \(bind: finalLat),
                "currentLng" = \(bind: finalLng),
                "lastLocationUpdate" = \(bind: timestamp)
            WHERE "vehicleID" = \(bind: vehicleID)
              AND "firmaID" = \(bind: firmaID)
            RETURNING "vehicleID", "plateNumber"
            """).first()

        req.logger.debug("[GPS] Updated vehicle: \(vehicleID), snapped=\(wasSnapped)")

        // 8. RETURN SERVER-CALCULATED VALUES
        return GPSValidationResult(
            success: true,
            vehicleID: vehicleID,
            currentLat: finalLat,
            currentLng: finalLng,
            lastLocationUpdate: timestamp,
            wasSnapped: wasSnapped,
            bearing: bearing,  // Server-calculated (hidden business logic)
            speed: speed       // Server-calculated (hidden business logic)
        )
    }
}

struct GPSValidationResult: Content {
    var success: Bool
    var vehicleID: String
    var currentLat: Double
    var currentLng: Double
    var lastLocationUpdate: Date
    var wasSnapped: Bool
    var bearing: Double?  // Server-calculated (NOT from client!)
    var speed: Double?    // Server-calculated (NOT from client!)
}
```

---

### Сравнение: HTTP vs WebSocket валидация

| Aspect | HTTP REST | WebSocket | Difference |
|--------|-----------|-----------|------------|
| **Аутентификация** | JWT в header | JWT в query/cookie | ✅ Идентично |
| **GPS validation** | Server-side | Server-side | ✅ Идентично |
| **Max speed check** | 150 km/h (42m/s) | 150 km/h (42m/s) | ✅ Идентично |
| **Bearing calc** | Server-side | Server-side | ✅ Идентично |
| **Speed calc** | Server-side | Server-side | ✅ Идентично |
| **OSRM snap** | Server-side cache | Server-side cache | ✅ Идентично |
| **DB update** | UPDATE...RETURNING | UPDATE...RETURNING | ✅ Идентично |
| **Response** | JSON DTO | JSON через WebSocket | ✅ Идентично |

**ВЫВОД**: WebSocket НЕ меняет security model! Все валидации остаются на сервере.

---

### Архитектура валидации для 20k водителей

```
┌──────────────────┐
│  20k Drivers     │
│  (Browser/PWA)   │
└────────┬─────────┘
         │ wss://ws.moment-lbs.app/driver?token=JWT
         │
         ▼
┌────────────────────────────────────────┐
│    Nginx Load Balancer (ip_hash)      │
│                                        │
│  🛡️ SECURITY LAYER 1:                 │
│    - Rate limiting (1000 conn/IP)     │
│    - SSL/TLS termination              │
│    - DDoS protection                  │
└────────┬───────────────────────────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ WS-1   │ │ WS-2   │ │ WS-3   │ │ WS-4   │
│ (5k)   │ │ (5k)   │ │ (5k)   │ │ (5k)   │
│        │ │        │ │        │ │        │
│ 🛡️ SEC │ │ 🛡️ SEC │ │ 🛡️ SEC │ │ 🛡️ SEC │
│ LAY 2: │ │ LAY 2: │ │ LAY 2: │ │ LAY 2: │
│        │ │        │ │        │ │        │
│ - JWT  │ │ - JWT  │ │ - JWT  │ │ - JWT  │
│ - Sess │ │ - Sess │ │ - Sess │ │ - Sess │
│   val  │ │   val  │ │   val  │ │   val  │
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │          │          │
     └──────────┴──────────┴──────────┘
                │
                ▼
     ┌──────────────────────┐
     │  GPSValidator.swift  │
     │                      │
     │  🛡️ SECURITY LAYER 3:│
     │                      │
     │  1. Get last pos     │
     │     from DB          │
     │                      │
     │  2. Validate dist    │
     │     (max 42m/sec)    │
     │                      │
     │  3. Calculate        │
     │     bearing (server) │
     │                      │
     │  4. Calculate        │
     │     speed (server)   │
     │                      │
     │  5. OSRM snap        │
     │     (server cache)   │
     │                      │
     │  6. DB UPDATE        │
     │     (atomic)         │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │    PostgreSQL        │
     │  (Connection Pool)   │
     │                      │
     │  64 connections      │
     │  66 UPDATE/sec       │
     │  (batched)           │
     └──────────────────────┘
```

**3 уровня защиты**:

1. **Nginx Layer**: DDoS, rate limiting, SSL
2. **WebSocket Layer**: JWT auth, session validation
3. **Business Logic Layer**: GPS validation, server-side calculations

---

### Что НЕ ДОЛЖНО быть на клиенте

**❌ НИКОГДА не доверяйте клиенту**:

```typescript
// ❌ WRONG - клиент отправляет bearing и speed (легко подделать!)
const message = {
  type: "location",
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  bearing: calculatedBearing,  // ❌ Клиент может врать!
  speed: position.coords.speed, // ❌ Может быть подделано!
}
ws.send(JSON.stringify(message))
```

**✅ ПРАВИЛЬНО - клиент отправляет ТОЛЬКО координаты**:

```typescript
// ✅ CORRECT - клиент отправляет только raw GPS данные
const message = {
  type: "location",
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  vehicleID: localVehicle.id,  // Для идентификации (validated against JWT)

  // Опционально (для logs, НЕ для business logic):
  accuracy: position.coords.accuracy,  // Browser-reported accuracy
  timestamp: Date.now(),               // Client timestamp (NOT used for speed calc!)
}
ws.send(JSON.stringify(message))
```

**Сервер рассчитывает всё остальное**:
- ✅ Bearing (направление движения)
- ✅ Speed (реальная скорость на основе DB timestamps)
- ✅ Snap-to-road (OSRM)
- ✅ Validation (max 150 km/h)

---

### Rate Limiting для WebSocket (защита от спама)

```swift
// websocket/Sources/Hello/Middleware/RateLimitMiddleware.swift

import Vapor
import Redis

class GPSRateLimiter {
    private let redis: RedisClient

    /// Rate limit: max 1 GPS point per second per vehicle
    /// (Prevents spam attacks where malicious client sends 1000 points/sec)
    func checkRateLimit(vehicleID: String) async throws -> Bool {
        let key = "gps:ratelimit:\(vehicleID)"

        // Increment counter (expires in 1 second)
        let count = try await redis.incr(key).get()

        if count == 1 {
            // First request in this second - set TTL
            try await redis.expire(key, after: .seconds(1)).get()
        }

        // Allow max 2 points per second (tolerance for network jitter)
        if count > 2 {
            return false  // Rate limit exceeded
        }

        return true  // OK
    }
}

// Usage в routes.swift:
ws.onText { ws, text in
    let message = try JSONDecoder().decode(ClientMessage.self, from: data)

    // Rate limit check (BEFORE validation!)
    let rateLimiter = GPSRateLimiter(redis: req.redis)
    guard try await rateLimiter.checkRateLimit(vehicleID: message.vehicleID) else {
        req.logger.warning("[GPS] 🚫 Rate limit exceeded for vehicle: \(message.vehicleID)")
        ws.send("""
            {"type":"error","message":"Too many GPS updates. Max 1 point/second."}
            """)
        return
    }

    // Proceed with validation...
}
```

**Защита от атак**:
- ✅ Max 1-2 GPS points/sec per vehicle
- ✅ Prevents client from spamming 1000 points/sec
- ✅ Redis TTL auto-cleanup (no manual cleanup needed)
- ✅ При 20k водителей: 40k writes/sec in Redis (легко!)

---

### Monitoring для security (20k водителей)

**Критичные метрики для безопасности**:

```bash
# 1. Suspicious GPS jumps (validation failures)
docker logs websocket-1 | grep "Suspicious GPS jump" | wc -l

# Если > 100/hour → возможно malicious client или GPS spoofing

# 2. Rate limit hits
docker logs websocket-1 | grep "Rate limit exceeded" | wc -l

# Если > 500/hour → DDoS attack или buggy client

# 3. Invalid tokens (failed auth)
docker logs websocket-1 | grep "Invalid token" | wc -l

# Если > 1000/hour → brute force attack

# 4. OSRM failures (snap-to-road errors)
docker logs websocket-1 | grep "OSRM Request failed" | wc -l

# Если > 50/hour → OSRM сервер проблемы

# 5. Database errors
docker logs websocket-1 | grep "Failed to save location" | wc -l

# Если > 10/hour → DB connection pool exhausted
```

**Alerts в production**:

```typescript
// /lib/monitoring/gps-security-alerts.ts

export const securityMetrics = {
  suspiciousJumps: {
    threshold: 100,  // per hour
    action: "Block vehicle + notify admin",
  },
  rateLimitHits: {
    threshold: 500,  // per hour
    action: "Temporarily ban IP for 15 minutes",
  },
  authFailures: {
    threshold: 1000,  // per hour
    action: "Block IP permanently",
  },
  osrmFailures: {
    threshold: 50,  // per hour
    action: "Fallback to raw GPS (no snap-to-road)",
  },
}
```

---

### Performance vs Security trade-offs

**Проблема**: Каждая GPS точка требует 2 DB запроса:
1. SELECT (get last position)
2. UPDATE (save new position)

**Масштаб 20k водителей**:
- 20,000 водителей × 1 точка/2 сек = 10,000 точек/сек
- 10,000 × 2 queries = **20,000 DB queries/sec** 💥

**Решения**:

#### Option 1: In-Memory Cache (Redis)

```swift
// Cache last position in Redis (TTL 60 seconds)
func getLastPosition(vehicleID: String) async throws -> Position? {
    let cacheKey = "gps:last:\(vehicleID)"

    // Try cache first
    if let cached = try await redis.get(cacheKey, asJSON: Position.self).get() {
        return cached
    }

    // Cache miss - query DB
    let dbPosition = try await sql.raw("""
        SELECT "currentLat", "currentLng", "lastLocationUpdate"
        FROM vehicles WHERE "vehicleID" = \(bind: vehicleID)
        """).first()

    if let pos = dbPosition {
        // Store in cache for 60 seconds
        try await redis.setex(cacheKey, toJSON: pos, expirationInSeconds: 60).get()
    }

    return dbPosition
}
```

**Эффект**:
- Cache hit rate 90% (водитель отправляет точки каждые 2 сек)
- DB reads: 20,000/sec → **2,000/sec** (-90%)
- Латенси валидации: 50ms (DB) → **5ms** (Redis)

#### Option 2: Server-Side Batching (агрегация)

```swift
// Validate EVERY point (security), but UPDATE DB only every 30 seconds
func handleGPSPoint(point: GPSPoint) async throws {
    // 1. ALWAYS validate (use cached last position)
    let lastPos = try await getLastPosition(vehicleID: point.vehicleID)
    let isValid = validateMovement(from: lastPos, to: point)

    guard isValid else {
        throw Abort(.badRequest, reason: "Invalid GPS point")
    }

    // 2. Calculate bearing/speed (server-side)
    let bearing = calculateBearing(from: lastPos, to: point)
    let speed = calculateSpeed(from: lastPos, to: point)

    // 3. Update in-memory cache (IMMEDIATELY for next validation)
    try await updateLastPositionCache(vehicleID: point.vehicleID, position: point)

    // 4. Broadcast to dispatchers (IMMEDIATELY for real-time UX)
    broadcastToDispatchers(point)

    // 5. UPDATE DB only every 30 seconds (BATCHED)
    if shouldFlushToDatabase(vehicleID: point.vehicleID) {
        try await saveToDatabase(point)
    }
}
```

**Эффект**:
- Валидация: КАЖДАЯ точка (security preserved!)
- DB writes: 10,000/sec → **333/sec** (-97%)
- Real-time UX: Диспетчер видит каждую точку
- History: DB содержит только ключевые точки (экономия storage)

---

### Резюме: Security для WebSocket GPS Tracking

| Принцип | HTTP REST | WebSocket | Status |
|---------|-----------|-----------|--------|
| **Server-side auth** | ✅ JWT | ✅ JWT | ✅ Идентично |
| **Server-side GPS validation** | ✅ Max 150km/h | ✅ Max 150km/h | ✅ Идентично |
| **Server-side bearing calc** | ✅ Hidden | ✅ Hidden | ✅ Идентично |
| **Server-side speed calc** | ✅ Hidden | ✅ Hidden | ✅ Идентично |
| **OSRM snap-to-road** | ✅ Server cache | ✅ Server cache | ✅ Идентично |
| **Rate limiting** | ❌ Нет | ✅ Redis (1 pt/sec) | ✅ Улучшение! |
| **Last position cache** | ❌ Нет | ✅ Redis (TTL 60s) | ✅ Улучшение! |
| **DB batching** | ❌ Нет | ✅ Агрегация 30s | ✅ Улучшение! |
| **Monitoring** | ❌ Нет | ✅ Security alerts | ✅ Улучшение! |

**КРИТИЧНО**:
1. ✅ **ВСЯ бизнес-логика на сервере** (bearing, speed, validation)
2. ✅ **Клиент отправляет ТОЛЬКО raw GPS** (lat, lng)
3. ✅ **Rate limiting** (защита от спама)
4. ✅ **Redis cache** (снижение DB нагрузки на 90%)
5. ✅ **Monitoring** (alerts для suspicious activity)

**Для 20k водителей**:
- WebSocket **НЕ СНИЖАЕТ** security (все валидации сохранены!)
- WebSocket **УЛУЧШАЕТ** performance (кэш, батчинг)
- WebSocket **ДОБАВЛЯЕТ** rate limiting (защита от DDoS)
- WebSocket **СНИЖАЕТ** DB нагрузку на 90-97%

---

## Контакты и документация

### 📁 Основные файлы проекта

- **Основной проект**: `/home/hronop/node/moment/`
- **Docker Compose**: `/home/hronop/mailserver/docker-compose.yml`
- **Nginx Config**: `/etc/nginx/sites-available/default`

### 📚 WebSocket документация (этот репозиторий)

- **[WEBSOCKET-INTEGRATION.md](WEBSOCKET-INTEGRATION.md)** ← ВЫ ЗДЕСЬ
  - Общая архитектура WebSocket интеграции
  - Docker и развёртывание
  - Nginx конфигурация
  - Интеграция с Moment

- **[GPS_TRACKING_ARCHITECTURE.md](GPS_TRACKING_ARCHITECTURE.md)** ← **КРИТИЧНО!**
  - **Кто отслеживает GPS**: React Component, НЕ Service Worker
  - Алгоритм отправки координат (только при изменении > 10м)
  - Screen Wake Lock для фонового трекинга
  - Существующая реализация `useGeolocation.ts`

- **[OFFLINE_SYNC_ARCHITECTURE.md](OFFLINE_SYNC_ARCHITECTURE.md)** ← **КРИТИЧНО!**
  - IndexedDB для offline storage
  - Background Sync API (Service Worker)
  - WebSocket + HTTP retry logic
  - Гибридный подход (3 уровня)

### 🔗 Связанная документация

- **Vapor API**:
  - [VAPOR-API.md](../vapor-api/VAPOR-API.md) - REST API архитектура
  - [MIGRATION-CONTEXT.md](../vapor-api/MIGRATION-CONTEXT.md) - JWTAuthMiddleware (NextAuth v5 JWE)

- **Transport System**:
  - [TRANSPORT_PROGRESS.md](../docs/TRANSPORT_PROGRESS.md) ← **КРИТИЧНО!**
    - Таблица `track_points` (PostGIS)
    - `/lib/track-points.ts` функции
    - SSE real-time архитектура
  - [TRANSPORT_REQUIREMENTS.md](../docs/TRANSPORT_REQUIREMENTS.md) - Требования (Uber-style)

- **Существующий код**:
  - [hooks/useGeolocation.ts](../hooks/useGeolocation.ts) - GPS tracking для appointments
  - [components/GeolocationTracker.tsx](../components/GeolocationTracker.tsx) - React компонент
  - [public/sw.js](../public/sw.js) - Service Worker (push notifications)

---

## 🎯 Для новых сессий

**Обязательно прочитать в таком порядке:**

1. **[WEBSOCKET-INTEGRATION.md](WEBSOCKET-INTEGRATION.md)** - общая картина
2. **[GPS_TRACKING_ARCHITECTURE.md](GPS_TRACKING_ARCHITECTURE.md)** - как работает GPS
3. **[OFFLINE_SYNC_ARCHITECTURE.md](OFFLINE_SYNC_ARCHITECTURE.md)** - offline режим
4. **[TRANSPORT_PROGRESS.md](../docs/TRANSPORT_PROGRESS.md)** - существующая транспортная система
5. **[MIGRATION-CONTEXT.md](../vapor-api/MIGRATION-CONTEXT.md)** - аутентификация

**Ключевые моменты**:
- ✅ Nginx конфиг УЖЕ готов (`ws.moment-lbs.app` → порт 3003)
- ✅ Таблица `track_points` УЖЕ создана (PostGIS GEOMETRY)
- ✅ JWTAuthMiddleware работает (копировать из vapor-api)
- ✅ Package.swift обновлён (crypto библиотеки добавлены)
- ⏳ WebSocket сервер НЕ запущен (порт 3003 свободен)

---

**Last updated:** 2026-03-15
**Maintainer:** См. git log для истории изменений
**Questions?** Читайте связанные документы выше! 📚
