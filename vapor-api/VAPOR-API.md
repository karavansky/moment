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

### Модели транспортной системы

#### Order.swift → таблица `orders`

| Колонка           | Тип         | Описание                                                       |
| ----------------- | ----------- | -------------------------------------------------------------- |
| `orderID`         | varchar(21) | PK, nanoid                                                     |
| `firmaID`         | varchar(21) | FK → organisations                                             |
| `clientID`        | varchar(21) | FK → clients, пассажир                                         |
| `vehicleID`       | varchar(21) | FK → vehicles (nullable)                                       |
| `driverID`        | varchar(21) | FK → workers (nullable)                                        |
| `status`          | varchar(20) | CREATED, ASSIGNED, ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED |
| `passengerName`   | varchar(255)| Имя пассажира                                                  |
| `passengerCount`  | integer     | Количество пассажиров                                          |
| `phone`           | varchar(20) | Телефон для связи                                              |
| `scheduledAt`     | timestamptz | Время подачи транспорта                                        |
| `createdAt`       | timestamptz | Время создания заявки                                          |
| `assignedAt`      | timestamptz | Время назначения водителя (nullable)                           |
| `acceptedAt`      | timestamptz | Время принятия заявки водителем (nullable)                     |
| `arrivedAt`       | timestamptz | Время прибытия водителя (nullable)                             |
| `startedAt`       | timestamptz | Время начала поездки (nullable)                                |
| `completedAt`     | timestamptz | Время завершения поездки (nullable)                            |
| `cancelledAt`     | timestamptz | Время отмены (nullable)                                        |
| `rejectReasonID`  | varchar(21) | FK → reject_reasons (nullable)                                 |
| `notes`           | text        | Дополнительные заметки (nullable)                              |

#### Vehicle.swift → таблица `vehicles`

| Колонка        | Тип         | Описание                                    |
| -------------- | ----------- | ------------------------------------------- |
| `vehicleID`    | varchar(21) | PK, nanoid                                  |
| `firmaID`      | varchar(21) | FK → organisations                          |
| `plateNumber`  | varchar(20) | Гос. номер (unique в рамках firmaID)        |
| `type`         | varchar(20) | STANDARD, MINIVAN, WHEELCHAIR               |
| `status`       | varchar(20) | ACTIVE, REPAIR, INACTIVE                    |
| `currentLat`   | double      | Текущая широта (nullable)                   |
| `currentLng`   | double      | Текущая долгота (nullable)                  |
| `lastGPSUpdate`| timestamptz | Время последнего обновления GPS (nullable)  |

#### TransportRoute.swift → таблица `routes`

| Колонка         | Тип         | Описание                                      |
| --------------- | ----------- | --------------------------------------------- |
| `routeID`       | varchar(21) | PK, nanoid                                    |
| `firmaID`       | varchar(21) | FK → organisations                            |
| `orderID`       | varchar(21) | FK → orders, ON DELETE CASCADE                |
| `sequence`      | integer     | Порядковый номер сегмента маршрута (1, 2, 3…) |
| `pickupAddress` | text        | Адрес подачи для данного сегмента             |
| `dropoffAddress`| text        | Адрес высадки для данного сегмента            |
| `pickupLat`     | double      | Широта точки подачи                           |
| `pickupLng`     | double      | Долгота точки подачи                          |
| `dropoffLat`    | double      | Широта точки высадки                          |
| `dropoffLng`    | double      | Долгота точки высадки                         |
| `createdAt`     | timestamptz | Время создания маршрута                       |

> **Важно**: Маршрут может состоять из нескольких сегментов (`sequence`). Например, для поездки A → B → C создаются 3 записи:
> - sequence=1: A (pickup) → B (dropoff)
> - sequence=2: B (pickup) → C (dropoff)
> - sequence=3: C (pickup) → D (dropoff)

#### RejectReason.swift → таблица `reject_reasons`

| Колонка    | Тип         | Описание                          |
| ---------- | ----------- | --------------------------------- |
| `reasonID` | varchar(21) | PK, nanoid                        |
| `firmaID`  | varchar(21) | FK → organisations                |
| `reason`   | varchar(255)| Текст причины отклонения          |
| `createdAt`| timestamptz | Время создания                    |

#### Ticket.swift → таблица `ticket`

| Колонка    | Тип         | Описание                          |
| ---------- | ----------- | --------------------------------- |
| `ticketID` | varchar(21) | PK, nanoid                        |
| `firmaID`  | varchar(21) | FK → organisations                |
| `userID`   | varchar(21) | FK → users, ON DELETE CASCADE     |
| `subject`  | varchar(500)| Тема обращения                    |
| `category` | integer     | Категория (0-N)                   |
| `priority` | integer     | Приоритет                         |
| `date`     | timestamptz | Дата создания тикета              |

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

cd /home/hronop/mailserver && docker compose up -d vapor-api
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

---

# Описание API Маршрутов

В этом документе перечислены все эндпоинты, которые теперь обрабатываются Swift Vapor-сервером, а также роуты, оставленные на Next.js.

## Vapor API (Swift)

Все эти роуты проксируются Nginx на `http://127.0.0.1:8080`.

| Маршрут | Метод(ы) | Описание |
|---------|----------|----------|
| `/api/health` | GET | Проверка состояния сервиса и подключения к БД |
| `/api/version` | GET | Возвращает версию бэкенда |
| `/api/photon` | GET | Прокси к geocoding API Photon/Komoot |
| `/api/photon/reverse` | GET | Прокси к reverse geocoding API Photon/Komoot |
| `/api/files/*` | GET, POST, DELETE | Работа с публичными файлами (S3 / SeaweedFS) |
| `/api/seaweed-proxy/*` | - | Внутренний прокси для SeaweedFS |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `/api/scheduling` | GET | Главный роут расписания (возвращает appointments, workers, clients и т.д.) |
| `/api/scheduling/appointments` | POST | Создание записи |
| `/api/scheduling/appointments/:id` | PUT, DELETE | Обновление и удаление записи |
| `/api/scheduling/workers` | GET, POST | Получение и создание сотрудников |
| `/api/scheduling/workers/:id` | PUT, DELETE | Отредактировать / удалить сотрудника |
| `/api/scheduling/clients` | GET, POST | Получение и создание клиентов |
| `/api/scheduling/clients/:id`| PUT, DELETE | Отредактировать / удалить клиента |
| `/api/scheduling/teams` | GET, POST, PUT, DELETE | CRUD для таблиц Teams |
| `/api/scheduling/groupes` | GET, POST, PUT, DELETE| CRUD для таблиц Groupes |
| `/api/scheduling/services`| GET, POST, PUT, DELETE| CRUD для услуг (Services) |
| `/api/scheduling/reports` | GET, POST | CRUD отчетов со страницы расписания |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `/api/reports` | GET, POST | Получение и вставка отчетов |
| `/api/reports/:id` | PUT, DELETE | Обновление и удаление отчетов |
| `/api/reports/save` | POST | Сохранение драфта отчета и перенос фото из temp |
| `/api/reports/photos/:id` | PUT, DELETE | Обновление/удаление фото к отчету |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `/api/tickets/my` | GET, POST | Тикеты текущего пользователя |
| `/api/tickets/:id/messages` | GET, POST | Чат/Сообщения внутри тикета |
| `/api/settings` | GET, PATCH | Настройки профиля пользователя |
| `/api/location` | POST | Обновление гео-координат (worker / appointment location) |
| `/api/invites` | POST, GET | Создание инвайтов (директор) / Проверка инвайтов |
| `/api/push/subscribe` | POST | Подписка устройства на Push-уведомления (сохранение endpoint) |
| `/api/push/unsubscribe` | POST | Отписка от Push |
| `/api/push/vapid-key` | GET | Публичный ключ для Web Push |
| `/api/staff/sync-device` | POST | Синхронизация статуса устройства (заряд, версия ОС) |
| `/api/test/vapor` | GET | **Load Test:** Полный дамп расписания (без auth и без фильтров) |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `/api/transport/orders` | GET, POST | Получение списка заявок на транспорт и создание новой заявки |
| `/api/transport/orders/:id` | GET, PUT, DELETE | Получение, обновление и удаление конкретной заявки |
| `/api/transport/orders/:id/assign` | POST | Назначение водителя на заявку |
| `/api/transport/orders/:id/accept` | POST | Принятие заявки водителем |
| `/api/transport/orders/:id/reject` | POST | Отклонение заявки водителем (с указанием причины) |
| `/api/transport/orders/:id/arrive` | POST | Отметка о прибытии водителя на место подачи |
| `/api/transport/orders/:id/start` | POST | Начало поездки (посадка пассажира) |
| `/api/transport/orders/:id/complete` | POST | Завершение поездки |
| `/api/transport/orders/:id/cancel` | POST | Отмена заявки |
| `/api/transport/vehicles` | GET, POST | Получение списка транспортных средств и добавление нового |
| `/api/transport/vehicles/:id` | GET, PUT, DELETE | Получение, обновление и удаление конкретного ТС |
| `/api/transport/routes` | GET, POST | Получение маршрутов для заявки и создание новых маршрутов |
| `/api/transport/routes/:id` | GET, PUT, DELETE | Получение, обновление и удаление конкретного маршрута |
| `/api/transport/routes/order/:orderId` | GET, DELETE | Получение всех маршрутов заявки и их массовое удаление |
| `/api/transport/reject-reasons` | GET, POST | Получение списка причин отклонения и добавление новой |
| `/api/transport/reject-reasons/:id` | GET, PUT, DELETE | Получение, обновление и удаление причины отклонения |
| `/api/routing/osrm` | GET | OSRM маршрутизация с кэшированием в Redis и fallback на прямую линию |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `/api/admin/users` | GET, POST | CRUD полных прав на пользователей (Director only) |
| `/api/admin/users/:id` | PUT, DELETE | Изменение/удаление пользователей |
| `/api/admin/users/sessions` | GET | Просмотр активных сессий пользователей |


## Next.js API (Node.js)

Эти роуты остаются в Next.js (обрабатываются на `http://localhost:3002`).

| Маршрут | Метод(ы) | Причина |
|---------|----------|---------|
| `/api/auth/*` | GET, POST | NextAuth.js интеграция: управление сессиями, авторизация (OAuth, JWT, CSRF). |
| `/api/convert-heic` | POST | Использует Node.js `child_process.exec()` для серверной конвертации изображений. |
| `/api/staff/verify-push` | POST | Использует библиотеку `web-push` (Node.js) для отправки реальных Push-событий. |
| `/api/scheduling/events` | GET (SSE) | Server-Sent Events с PostgreSQL `LISTEN/NOTIFY`. |
| `/api/admin/sse-stats` | GET (SSE) | Метрики памяти `process.memoryUsage()`, uptime процесса Node.js. |
| `/api/support/tickets` | POST | Создает тикет и отправляет Email-подтверждение через `nodemailer`/SMTP. |
| `/api/test/next` | GET | **Load Test:** Полный дамп расписания (аналог Vapor, на Node.js) |
| `/api/[...path]` | WebSocket | Логика проксирования к отдельному WebSocket серверу на :3003. |

---

## Последние исправления и улучшения (март 2026)

### 1. Транспортная система (Transport API)

**Добавлены модели:**
- `Order.swift` — заявки на транспорт с поддержкой статусов жизненного цикла
- `Vehicle.swift` — транспортные средства с GPS-отслеживанием
- `TransportRoute.swift` — многосегментные маршруты для сложных поездок
- `RejectReason.swift` — справочник причин отклонения заявок

**Добавлены контроллеры:**
- `OrdersController.swift` — полный CRUD + lifecycle методы (assign, accept, reject, arrive, start, complete, cancel)
- `VehiclesController.swift` — управление автопарком
- `TransportRoutesController.swift` — управление маршрутами с поддержкой batch-операций
- `RejectReasonsController.swift` — справочник причин отклонения

**Особенности реализации:**
- Поддержка многосегментных маршрутов (A → B → C → D) через `sequence` field
- Валидация переходов между статусами (CREATED → ASSIGNED → ACCEPTED → ...)
- Проверка уникальности гос. номеров автомобилей в рамках `firmaID`
- Batch-загрузка маршрутов для списка заявок (оптимизация N+1 запросов)

### 2. OSRM маршрутизация с кэшированием

**Контроллер:** `RoutingController.swift`

**Функционал:**
- Интеграция с OSRM (Open Source Routing Machine) для построения автомобильных маршрутов
- Кэширование результатов в Redis (TTL: 24 часа)
- Fallback на прямую линию при недоступности OSRM
- Метаданные в ответе: `cached: true/false`, `fallback: true/false`

**Формат кэш-ключа:**
```
osrm:<lat1>,<lng1>|<lat2>,<lng2>|...
```

### 3. Исправления безопасности и стабильности

#### PushController — устранение race condition

**Проблема:** При одновременной подписке одного устройства два запроса пытались создать дублирующуюся запись.

**Решение:** Заменили `check-then-insert` на PostgreSQL UPSERT:
```sql
INSERT INTO push_subscriptions (...)
VALUES (...)
ON CONFLICT (endpoint)
DO UPDATE SET ...
```

Теперь операция атомарна и не требует транзакций.

#### StaffController — шифрование телеметрии (PBKDF2)

**Проблема:** Client использует PBKDF2 (Web Crypto API), но Swift Crypto на Linux не имеет встроенного PBKDF2.

**Решение:** Реализована ручная деривация ключа через HMAC-SHA256:
```swift
func deriveKeyPBKDF2(password: String, salt: Data, iterations: Int = 100000) -> Data {
    // RFC 2898 implementation using HMAC<SHA256>
    // Совместимо с crypto.subtle.deriveKey() в браузере
}
```

Параметры:
- Алгоритм: PBKDF2-HMAC-SHA256
- Итерации: 100,000
- Длина ключа: 32 байта (256 бит)
- Шифрование: AES-GCM

#### Ticket model — добавление firmaID и исправление опечатки

**Проблема 1:** Таблица `ticket` не имела поля `firmaID`, что не позволяло фильтровать тикеты по организациям.

**Решение:**
1. Добавлен столбец `firmaID VARCHAR(21) NOT NULL` в таблицу `ticket`
2. Заполнены значения из связанной таблицы `users`
3. Добавлен индекс `idx_ticket_firmaid`
4. Обновлена модель `Ticket.swift`
5. Все методы `TicketController` теперь фильтруют по `firmaID`

**Проблема 2:** Опечатка в названии столбца `pripority` (вместо `priority`).

**Решение:**
1. Переименован столбец: `ALTER TABLE ticket RENAME COLUMN pripority TO priority;`
2. Обновлена модель `Ticket.swift`: `@Field(key: "priority")`

**Миграция:**
```sql
-- Добавление firmaID
ALTER TABLE ticket ADD COLUMN "firmaID" VARCHAR(21);
UPDATE ticket SET "firmaID" = users."firmaID" FROM users WHERE ticket."userID" = users."userID";
ALTER TABLE ticket ALTER COLUMN "firmaID" SET NOT NULL;
CREATE INDEX idx_ticket_firmaid ON ticket("firmaID");

-- Исправление опечатки
ALTER TABLE ticket RENAME COLUMN pripority TO priority;
```

### 4. Code quality improvements

**Исправлены warnings компилятора:**
- `var response` → `let response` во всех контроллерах (OrdersController, VehiclesController, RejectReasonsController, TransportRoutesController, RoutingController)
- `var key` → `let key` в StaffController PBKDF2

**Добавлены импорты:**
- `import FluentPostgresDriver` в PushController для доступа к `PSQLError`

### 5. Структура контроллеров

Все новые контроллеры следуют единому паттерну:

```swift
struct SomeController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let group = routes.grouped("resource")

        // CRUD endpoints
        group.get(use: list)           // GET /resource
        group.post(use: create)        // POST /resource
        group.get(":id", use: get)     // GET /resource/:id
        group.put(":id", use: update)  // PUT /resource/:id
        group.delete(":id", use: delete) // DELETE /resource/:id
    }

    // Response pattern
    let response = Response(status: .ok)
    try response.content.encode(dto, as: .json)
    return response
}
```

### 6. Docker и переменные окружения

**Добавлены в `.env`:**
```bash
TELEMETRY_SECRET=9edgdOVOe5v+wgJP9m4eDe0srXA52PouuCrgHKvQ3Yw=
```

**Добавлены в `docker-compose.yml`:**
```yaml
vapor-api:
  environment:
    - TELEMETRY_SECRET=${TELEMETRY_SECRET}
```

---

## Известные особенности схемы БД

1. **camelCase в именах столбцов** — `userID`, `firmaID`, `orderID` (нестандартно для PostgreSQL)
2. **Отсутствие FK на organisations** — в некоторых таблицах `firmaID` не имеет внешнего ключа
3. **Nullable timestamps** — большинство timestamp-полей nullable, что требует `@Timestamp(key:, on: .none)`

---

## Roadmap

### Краткосрочные задачи
- [ ] Добавить WebSocket поддержку для real-time обновлений заявок
- [ ] Реализовать геозоны (geofencing) для автоматической отметки прибытия
- [ ] Добавить push-уведомления для водителей при новых заявках
- [ ] Metrics и мониторинг производительности transport API

### Долгосрочные задачи
- [ ] Миграция всех Next.js API на Vapor (кроме NextAuth)
- [ ] GraphQL endpoint для сложных запросов
- [ ] Rate limiting на уровне приложения
- [ ] Автоматическое тестирование (unit + integration tests)
