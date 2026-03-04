# Vapor API Migration — Полный контекст для продолжения работы

> Этот файл содержит ВСЁ необходимое для продолжения работы над миграцией API на Swift Vapor.
> Дата создания: 2026-03-04, обновлено: 2026-03-04

---

## Текущий статус: ✅ JWE-авторизация РАБОТАЕТ

### Что работает ✅

- Vapor-проект собирается и запускается (Docker image `vapor-api:latest`)
- `/api/health` → отвечает `{"status":"ok"}` через Vapor
- Nginx routing: `/api/files/`, `/api/seaweed-proxy/`, `/api/health` → Vapor (порт 8080)
- Все остальные `/api/*` (auth, scheduling, reports) → Next.js (порт 3002)
- Авторизация на `moment-lbs.app` работает (Next.js routes не затронуты)
- **JWE A256CBC-HS512 расшифровка** — работает через `swift-crypto` + `CryptoSwift`
- **DB-сессии** — проверяются в таблице `sessions` (БД `moment`)
- **Файлы отдаются** через X-Accel-Redirect → SeaweedFS

### Исправленные баги (2026-03-04)

1. **Swift `split` пропускал пустые элементы JWE** — `String.split(separator: ".")` по умолчанию использует `omittingEmptySubsequences: true`. JWE с `dir` алгоритмом имеет пустой `encryptedKey` (формат `header..iv.ciphertext.tag`), поэтому `split` возвращал 4 части вместо 5 → токен отклонялся. **Fix**: `split(separator: ".", omittingEmptySubsequences: false)`
2. **Неправильная БД в DATABASE_URL** — `docker-compose.yml` указывал на БД `hronop` (пустая), а все таблицы (users, sessions и т.д.) находятся в БД `moment`. **Fix**: `DATABASE_URL=postgres://hronop:***@postgres:5432/moment`

---

## Архитектура шифрования NextAuth v5

Обнаружено в файле `node_modules/@auth/core/jwt.js`:

```javascript
// Ключевые параметры:
const alg = 'dir' // Direct key agreement (без key wrapping)
const enc = 'A256CBC-HS512' // AES-256-CBC + HMAC-SHA-512

// Key derivation:
async function getDerivedEncryptionKey(enc, keyMaterial, salt) {
  return await hkdf('sha256', keyMaterial, salt, `Auth.js Generated Encryption Key (${salt})`, 64) // 64 bytes
}

// Где salt = имя cookie (напр. "authjs.session-token")
// keyMaterial = AUTH_SECRET
```

**Алгоритм расшифровки:**

1. Взять `AUTH_SECRET` (base64-строка)
2. HKDF(SHA-256, AUTH_SECRET, salt="authjs.session-token", info="Auth.js Generated Encryption Key (authjs.session-token)") → 64 байта
3. Разделить ключ: первые 32B → MAC key (HMAC-SHA-512), последние 32B → ENC key (AES-256-CBC)
4. JWE формат: `header.encryptedKey.iv.ciphertext.tag` (5 частей через `.`)
5. Для `dir`: encryptedKey пустой
6. Проверить auth tag: HMAC-SHA-512(AAD || IV || ciphertext || AL) с MAC key, truncate до 32B
7. Расшифровать: AES-256-CBC(encKey, iv, ciphertext) → JSON payload

---

## Текущее состояние кода

### Package.swift

```swift
dependencies:
  - vapor/vapor ~> 4.99
  - vapor/fluent ~> 4.0
  - vapor/fluent-postgres-driver ~> 2.0
  - apple/swift-crypto "1.0.0"..<"4.0.0"    // HKDF, HMAC
  - krzyzanowskim/CryptoSwift >= 1.8.0       // AES-CBC
```

**Убрано**: `vapor/jwt` (не поддерживает JWE)

### JWTAuthMiddleware.swift (текущая версия)

- Полная JWE A256CBC-HS512 расшифровка через `swift-crypto` + `CryptoSwift`
- HKDF key derivation совпадает с NextAuth
- Сборка chunked cookies (`.0`, `.1`, `.2`...)
- Debug logging (WARNING level)
- Модули disambiguated: `Crypto.HKDF<Crypto.SHA256>`, `Crypto.HMAC<Crypto.SHA512>`

### configure.swift

- Убрана конфигурация JWT signers (не нужна для JWE)
- Остальное без изменений: DB, CORS, middleware, routes

### SeaweedProxyController.swift

- Добавлены root-handlers для `/api/seaweed-proxy/` (без пути после — листинг корня filer)
- Сохранены catch-all handlers `**` для sub-paths

### Nginx `/etc/nginx/sites-available/default` (в серверном блоке `moment-lbs.app`)

```nginx
# Только мигрированные эндпоинты → Vapor
location ^~ /api/files/ { proxy_pass http://127.0.0.1:8080; ... }
location ^~ /api/seaweed-proxy/ { proxy_pass http://127.0.0.1:8080; ... }
location = /api/health { proxy_pass http://127.0.0.1:8080; ... }

# Всё остальное → Next.js (включая /api/auth/*)
location / { proxy_pass http://localhost:3002/; ... }
```

---

## Docker-инфраструктура

### docker-compose.yml (в `/home/hronop/mailserver/`)

```yaml
vapor-api:
  image: vapor-api:latest
  container_name: vapor-api
  restart: unless-stopped
  ports:
    - '127.0.0.1:8080:8080'
  environment:
    - DATABASE_URL=postgres://hronop:Sk02081978@postgres:5432/hronop
    - AUTH_SECRET=${AUTH_SECRET}
    - SEAWEED_FILER_URL=http://seaweedfs:8888
  depends_on:
    - postgres
    - seaweedfs
  mem_limit: 512m
  cpus: 2.0
```

### Как пересобрать

```bash
cd /home/hronop/node/moment/vapor-api
docker build --no-cache -t vapor-api:latest .     # --no-cache важно!
docker stop vapor-api && docker rm vapor-api
cd /home/hronop/mailserver && docker compose up -d vapor-api
```

---

## Следующие шаги для продолжения

### Немедленные действия (debugging)

1. **Пересобрать с `--no-cache`** и проверить debug-логи:

   ```bash
   docker logs vapor-api --tail 10
   ```

   Должна появиться строка `DEBUG Cookies raw header length: N, parsed keys: [...]`

2. **Если cookies пустые** — проверить Nginx:
   - Возможно нужно `proxy_set_header Cookie $http_cookie;` в location-блоках
3. **Если cookies есть но JWE не расшифровывается** — проверить:
   - Совпадает ли AUTH_SECRET с тем что в Next.js
   - Попробовать расшифровать токен через Node.js скрипт для валидации

4. **Если всё заработает** — убрать debug-логирование из JWTAuthMiddleware

### Полезные команды для диагностики

```bash
# Логи Vapor
docker logs vapor-api --tail 50

# Проверить AUTH_SECRET одинаковый
docker exec moment cat /app/.env | grep AUTH_SECRET
docker exec vapor-api env | grep AUTH_SECRET

# Прямой запрос к Vapor (минуя Nginx)
curl -v http://localhost:8080/api/health

# Проверить что Nginx пробрасывает cookies
curl -v -b "__Secure-authjs.session-token=test" https://moment-lbs.app/api/health 2>&1 | grep -i cookie
```

---

## Структура файлов проекта

```
/home/hronop/node/moment/vapor-api/
├── Package.swift
├── Package.resolved
├── Dockerfile
├── .dockerignore
├── VAPOR-API.md                              # Полная документация
└── Sources/App/
    ├── entrypoint.swift
    ├── configure.swift
    ├── routes.swift
    ├── Models/
    │   ├── User.swift                        # 18 columns → `users` table
    │   ├── DBSession.swift                   # 6 columns → `sessions` table
    │   └── AuthenticatedUser.swift
    ├── Middleware/
    │   ├── JWTAuthMiddleware.swift            # JWE A256CBC-HS512 + chunked cookies
    │   ├── AdminMiddleware.swift
    │   └── RealIPMiddleware.swift
    └── Controllers/
        ├── FileController.swift              # X-Accel-Redirect
        ├── SeaweedProxyController.swift       # Admin-only SeaweedFS proxy
        └── HealthController.swift
```

---

## Важные env-переменные

| Variable            | Где                            | Значение                                            |
| ------------------- | ------------------------------ | --------------------------------------------------- |
| `AUTH_SECRET`       | `/home/hronop/mailserver/.env` | `Qnej6gE8BZfKX9WzTK6VFvfytfWQ0Y6tfWoHmyzRv+Y=`      |
| `DATABASE_URL`      | docker-compose                 | `postgres://hronop:Sk02081978@postgres:5432/hronop` |
| `SEAWEED_FILER_URL` | docker-compose                 | `http://seaweedfs:8888`                             |

---

## Ключевые решения (чтобы не повторять исследование)

1. **NextAuth v5 НЕ использует стандартный JWT** — токен зашифрован (JWE), не подписан (JWS)
2. **`vapor/jwt` библиотека не поддерживает JWE** — используем `swift-crypto` + `CryptoSwift`
3. **Cookie chunking** — NextAuth разбивает длинные JWE на `.0`, `.1`, etc.
4. **Nginx `location ^~`** — только 3 эндпоинта идут на Vapor, остальные на Next.js
5. **Docker-compose** для Vapor находится в `/home/hronop/mailserver/docker-compose.yml` (не в `/home/hronop/node/moment/`)
6. **SeaweedProxy root** — нужны отдельные handlers для корня + catch-all `**`
