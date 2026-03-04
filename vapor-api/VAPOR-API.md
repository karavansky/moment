# Vapor API — Документация

> Swift Vapor бэкенд для критических API-эндпоинтов проекта Moment LBS.  
> Работает параллельно с Next.js, получая трафик через Nginx reverse proxy.

---

## Оглавление

- [Архитектура](#архитектура)
- [Как работает роутинг (Nginx-трюк)](#как-работает-роутинг)
- [Переключение между бэкендами](#переключение-между-бэкендами)
- [Структура проекта](#структура-проекта)
- [Модели (Fluent)](#модели)
- [Аутентификация (JWT)](#аутентификация)
- [Контроллеры](#контроллеры)
- [Docker](#docker)
- [Деплой](#деплой)
- [Файлы и SeaweedFS](#файлы-и-seaweedfs)
- [Troubleshooting](#troubleshooting)

---

## Архитектура

```
┌──────────────┐
│   Браузер    │
└──────┬───────┘
       │ HTTPS (443)
       ▼
┌──────────────────────────────────────────────────────┐
│                    Nginx                              │
│                                                       │
│  location ^~ /api/  ──→  127.0.0.1:8080  (Vapor)     │
│  location /         ──→  localhost:3002   (Next.js)   │
│  location ^~ /private-seaweed/  ──→  SeaweedFS        │
│                          (internal, X-Accel-Redirect) │
└──────────────────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌───────────────┐
│  Swift Vapor │   │   Next.js     │
│  (порт 8080) │   │  (порт 3002)  │
│              │   │               │
│  /api/files  │   │  SSR страницы │
│  /api/health │   │  /_next/*     │
│  /api/seaweed│   │  статика      │
└──────┬───────┘   └───────────────┘
       │
       ▼
┌──────────────┐   ┌───────────────┐
│  PostgreSQL  │   │  SeaweedFS    │
│  (порт 5432) │   │  (порт 8888)  │
└──────────────┘   └───────────────┘
```

### Ключевые принципы

1. **Next.js ничего не знает о Vapor** — Nginx перехватывает `/api/*` до того, как запрос дойдёт до Next.js
2. **Общая БД** — Vapor читает те же таблицы PostgreSQL, что и Next.js (без Fluent-миграций)
3. **Общая авторизация** — Vapor верифицирует те же JWT-токены NextAuth (HMAC SHA-256, один `AUTH_SECRET`)
4. **Мгновенный откат** — одна строка в Nginx + `reload`

---

## Как работает роутинг

### Принцип работы `location ^~ /api/`

Nginx обрабатывает `location` блоки в определённом приоритете:

| Приоритет  | Синтаксис  | Пример          | Описание                    |
| ---------- | ---------- | --------------- | --------------------------- | ------------------------------------ |
| 1 (высший) | `=`        | `= /api/health` | Точное совпадение           |
| 2          | `^~`       | `^~ /api/`      | Префикс, без проверки regex |
| 3          | `~` / `~*` | `~\* \.(jpg     | css)$`                      | Regex (case-sensitive / insensitive) |
| 4 (низший) | нет        | `/`             | Обычный префикс             |

**Наш `location ^~ /api/`** имеет приоритет 2 — он «побеждает» любые regex-location и обычный `location /`.

### Полный путь запроса

```
1. Браузер отправляет:
   GET https://moment-lbs.app/api/files/buckets/reports/photo.jpg
   Cookie: authjs.session-token=eyJhbGciOi...

2. Nginx получает запрос на порт 443:
   - SSL termination (расшифровка HTTPS)
   - Проверяет server_name: moment-lbs.app ✓
   - Ищет подходящий location:
     → location ^~ /api/ ✓ (приоритет 2, совпадает!)
     → НЕ доходит до location / (Next.js)

3. Nginx проксирует в Vapor:
   → proxy_pass http://127.0.0.1:8080
   → Добавляет заголовки:
     X-Real-IP: 85.120.45.67 (IP клиента)
     X-Forwarded-For: 85.120.45.67
     X-Forwarded-Proto: https

4. Vapor получает запрос:
   a) JWTAuthMiddleware → извлекает JWT из cookie
   b) Верифицирует подпись (AUTH_SECRET)
   c) Проверяет сессию в БД (sessions таблица)
   d) FileController → формирует ответ:
      X-Accel-Redirect: /private-seaweed/buckets/reports/photo.jpg

5. Nginx перехватывает X-Accel-Redirect:
   → location ^~ /private-seaweed/ (internal!)
   → rewrite: убирает /private-seaweed/ префикс
   → proxy_pass http://127.0.0.1:8888 (SeaweedFS)
   → Возвращает файл клиенту напрямую
```

### Почему Next.js не видит API-запросы?

```nginx
# Этот location ПЕРЕХВАТЫВАЕТ все /api/* запросы ДО location /
location ^~ /api/ {                          # ← приоритет 2
    proxy_pass http://127.0.0.1:8080;        # → Vapor
}

location / {                                  # ← приоритет 4 (ниже!)
    proxy_pass http://localhost:3002/;         # → Next.js
}
```

`^~` означает: «если URL начинается с `/api/`, сразу используй этот блок,
не проверяй regex-location». Поэтому Next.js **никогда** не получит запрос на `/api/*`.

---

## Переключение между бэкендами

### Текущий метод: ручное переключение в Nginx

**Переключить на Swift Vapor:**

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:8080;   # ← Vapor
}
```

**Переключить обратно на Next.js:**

```nginx
location ^~ /api/ {
    proxy_pass http://localhost:3002;    # ← Next.js
}
```

После изменения:

```bash
sudo nginx -t && sudo nginx -s reload
```

### Будущее: автоматическое переключение через Nginx `map`

Можно добавить в `/etc/nginx/nginx.conf` (в блок `http {}`):

```nginx
# Читает переменную окружения через env-файл или set
map $api_backend_switch $api_upstream {
    default     http://localhost:3002;      # Next.js (безопасный default)
    swift       http://127.0.0.1:8080;     # Vapor
}
```

И в server-блоке:

```nginx
location ^~ /api/ {
    set $api_backend_switch "swift";      # ← менять здесь
    proxy_pass $api_upstream;
}
```

Переключение: поменять `"swift"` → `"nextjs"` + `nginx -s reload`.

---

## Структура проекта

```
vapor-api/
├── Package.swift                           # Зависимости: Vapor, Fluent, JWT
├── Dockerfile                              # 3-stage build (swift:6.0 → ubuntu:24.04)
├── .dockerignore
└── Sources/App/
    ├── entrypoint.swift                    # @main точка входа
    ├── configure.swift                     # БД, JWT, CORS, middleware
    ├── routes.swift                        # Регистрация маршрутов
    │
    ├── Models/
    │   ├── User.swift                      # Таблица users (18 колонок)
    │   ├── DBSession.swift                 # Таблица sessions (6 колонок)
    │   └── AuthenticatedUser.swift         # Структура авторизованного пользователя
    │
    ├── Middleware/
    │   ├── JWTAuthMiddleware.swift          # Верификация NextAuth JWT
    │   ├── AdminMiddleware.swift            # Проверка isAdmin
    │   └── RealIPMiddleware.swift           # Логирование X-Real-IP
    │
    └── Controllers/
        ├── FileController.swift            # GET /api/files/** (X-Accel-Redirect)
        ├── SeaweedProxyController.swift     # Admin-only SeaweedFS proxy
        └── HealthController.swift           # GET /api/health
```

---

## Модели

### User.swift → таблица `users`

Маппинг **без миграций** — Fluent только читает существующую схему.

| Колонка        | Тип          | Fluent           | Описание                 |
| -------------- | ------------ | ---------------- | ------------------------ |
| `userID`       | varchar(21)  | `@ID(custom:)`   | Primary key (nanoid)     |
| `name`         | varchar(255) | `@Field`         | Имя пользователя         |
| `email`        | varchar(255) | `@Field`         | Unique, для поиска       |
| `isAdmin`      | boolean      | `@Field`         | Флаг администратора      |
| `firmaID`      | varchar(21)  | `@OptionalField` | FK → organisations       |
| `passwordHash` | varchar(255) | `@Field`         | bcrypt hash              |
| `provider`     | varchar(50)  | `@Field`         | google/apple/credentials |
| `status`       | integer      | `@OptionalField` | Статус аккаунта          |

> **Важно**: колонки в camelCase (`userID`, `firmaID`, `isAdmin`) — это особенность существующей схемы. Fluent-ключи должны точно совпадать.

### DBSession.swift → таблица `sessions`

| Колонка     | Тип         | Описание                      |
| ----------- | ----------- | ----------------------------- |
| `sessionID` | varchar(21) | PK, nanoid                    |
| `userID`    | varchar(21) | FK → users, ON DELETE CASCADE |
| `expiresAt` | timestamptz | Срок действия сессии          |
| `createdAt` | timestamptz | Время создания                |
| `userAgent` | text        | Браузер/устройство            |
| `ip`        | varchar(45) | IP-адрес клиента              |

---

## Аутентификация

### Как NextAuth создаёт JWT

```
NextAuth (Next.js) при логине:
1. Проверяет credentials / OAuth
2. Создаёт JWT payload:
   {
     sub: "user-email",
     userId: "abc123nanoid",
     email: "user@example.com",
     isAdmin: false,
     firmaID: "org456nanoid",
     sessionId: "sess789nanoid",
     provider: "credentials",
     status: 0,
     iat: 1709471234,
     exp: 1712063234
   }
3. Подписывает HMAC SHA-256 ключом AUTH_SECRET
4. Сохраняет в cookie: authjs.session-token=eyJhbGciOi...
```

### Как Vapor верифицирует тот же JWT

```swift
// configure.swift
app.jwt.signers.use(.hs256(key: authSecret))  // Тот же AUTH_SECRET!

// JWTAuthMiddleware:
// 1. Извлекает токен из cookie или Authorization header
// 2. Верифицирует подпись
// 3. Проверяет сессию в БД (sessions.expiresAt > NOW())
// 4. Сохраняет AuthenticatedUser в req.auth
```

### Три уровня доступа

```swift
// routes.swift
let api = app.grouped("api")

// Публичный — без авторизации
try api.register(collection: HealthController())        // GET /api/health

// Защищённый — требует валидный JWT
let protected = api.grouped(JWTAuthMiddleware())
try protected.register(collection: FileController())    // GET /api/files/**

// Админский — JWT + isAdmin = true
let admin = protected.grouped(AdminMiddleware())
try admin.register(collection: SeaweedProxyController()) // GET/POST/DELETE /api/seaweed-proxy/**
```

---

## Контроллеры

### FileController — скачивание файлов

- **Маршрут**: `GET /api/files/**`
- **Авторизация**: JWT (кроме публичных путей с `3Eoxlmzdr4uEJggFueFnB`)
- **Логика**: возвращает `X-Accel-Redirect: /private-seaweed/<path>`, Nginx отдаёт файл из SeaweedFS
- **Порт с**: `app/api/files/[...path]/route.ts`

### SeaweedProxyController — админ-панель SeaweedFS

- **Маршрут**: `GET/POST/DELETE /api/seaweed-proxy/**`
- **Авторизация**: JWT + isAdmin
- **Логика**: проксирует запросы в SeaweedFS Filer, переписывает HTML-ссылки
- **Порт с**: `app/api/seaweed-proxy/[[...path]]/route.ts`

### HealthController — healthcheck

- **Маршрут**: `GET /api/health`
- **Авторизация**: нет
- **Ответ**: `{"status":"ok","timestamp":"2026-03-03T13:00:00Z"}`

---

## Docker

### Multi-stage сборка

```
Stage 1: resolve     → swift:6.0-noble → resolves Package.swift deps
Stage 2: build       → swift:6.0-noble → swift build -c release --static-swift-stdlib
Stage 3: runtime     → ubuntu:24.04    → только бинарник + libcurl4
```

**Итоговый размер образа**: ~80-100MB (vs. ~1.5GB образ Swift)

### docker-compose.yml (в `/home/hronop/mailserver/`)

```yaml
vapor-api:
  image: vapor-api:latest
  container_name: vapor-api
  restart: unless-stopped
  ports:
    - '127.0.0.1:8080:8080' # Только localhost (Nginx проксирует)
  environment:
    - DATABASE_URL=postgres://hronop:***@postgres:5432/hronop
    - AUTH_SECRET=${AUTH_SECRET} # Из .env файла
    - SEAWEED_FILER_URL=http://seaweedfs:8888
  depends_on:
    - postgres
    - seaweedfs
  mem_limit: 512m
  cpus: 2.0
```

### Пересборка

```bash
cd /home/hronop/node/moment/vapor-api
docker build -t vapor-api:latest .

cd /home/hronop/mailserver
docker compose up -d vapor-api
```

---

## Деплой

### Первый деплой (уже выполнен)

```bash
# 1. Собрать образ
cd /home/hronop/node/moment/vapor-api
docker build -t vapor-api:latest .

# 2. Добавить AUTH_SECRET в /home/hronop/mailserver/.env
echo 'AUTH_SECRET=Qnej6gE8BZfKX9WzTK6VFvfytfWQ0Y6tfWoHmyzRv+Y=' >> .env

# 3. Запустить контейнер
cd /home/hronop/mailserver
docker compose up -d vapor-api

# 4. Перезагрузить Nginx (конфиг уже обновлён)
sudo nginx -t && sudo nginx -s reload

# 5. Проверить
curl -s https://moment-lbs.app/api/health
# → {"status":"ok","timestamp":"..."}
```

### Обновление кода

```bash
cd /home/hronop/node/moment/vapor-api
docker build -t vapor-api:latest .
cd /home/hronop/mailserver
docker compose up -d vapor-api          # Автоматически пересоздаст контейнер
```

### Откат на Next.js API

```bash
# Отредактировать /etc/nginx/sites-available/default
# Строка ~528: изменить proxy_pass
#   http://127.0.0.1:8080  →  http://localhost:3002
sudo nginx -s reload
```

---

## Файлы и SeaweedFS

### X-Accel-Redirect — как Nginx отдаёт файлы

```
Запрос: GET /api/files/buckets/reports/photo.jpg
   ↓
Vapor: проверяет JWT → 200 OK
   Headers: X-Accel-Redirect: /private-seaweed/buckets/reports/photo.jpg
   Body: пустое (!)
   ↓
Nginx: видит X-Accel-Redirect
   → Ищет: location ^~ /private-seaweed/
   → Флаг: internal (прямой доступ из браузера → 404)
   → rewrite: убирает /private-seaweed/
   → proxy_pass: http://127.0.0.1:8888/buckets/reports/photo.jpg
   ↓
SeaweedFS: отдаёт файл
   ↓
Nginx → Браузер: получает photo.jpg
```

**Преимущество**: Vapor не тратит память/CPU на передачу файла. Nginx передаёт напрямую из SeaweedFS.

---

## Troubleshooting

### Vapor не запускается

```bash
# Проверить логи
docker logs vapor-api --tail 50

# Частые причины:
# - DATABASE_URL неверный → "Connection refused"
# - AUTH_SECRET не задан → "AUTH_SECRET environment variable is required"
# - Порт 8080 занят → "Address already in use"
```

### API возвращает 404 (HTML от Next.js)

```bash
# Nginx не перезагружен
sudo nginx -t && sudo nginx -s reload

# Проверить, что location ^~ /api/ есть в конфиге
grep -n "location.*api" /etc/nginx/sites-available/default
```

### API возвращает 502 Bad Gateway

```bash
# Vapor контейнер не запущен
docker ps | grep vapor

# Если нет — запустить
cd /home/hronop/mailserver && docker compose up -d vapor-api
```

### JWT ошибка 401

```bash
# Проверить, что AUTH_SECRET одинаковый
docker exec moment cat /app/.env | grep AUTH_SECRET
docker exec vapor-api env | grep AUTH_SECRET
# Значения должны совпадать!
```

### Файлы не скачиваются (X-Accel-Redirect)

```bash
# Проверить, что /private-seaweed/ location существует
grep -A5 "private-seaweed" /etc/nginx/sites-available/default

# Проверить SeaweedFS напрямую
curl -s http://127.0.0.1:8888/buckets/  # Должен вернуть JSON-листинг
```
