# Инструкция: Приватное хранилище файлов (SeaweedFS)

Мы настроили защищенное хранилище, где файлы физически лежат в SeaweedFS, но доступны пользователям только через проверку авторизации в Next.js.

## 1. Архитектура

- **SeaweedFS (Docker):** Хранит файлы. Порты закрыты от внешнего мира (слушают только `127.0.0.1`).
- **Nginx:** Прокси-сервер. Имеет скрытый маршрут `/private-seaweed/`, который отдает файлы, но доступен только по внутреннему перенаправлению (`internal`).
- **Next.js:** Приложение. Проверяет права пользователя и, если всё ок, говорит Nginx'у: "Отдай этому пользователю файл X" (через заголовок `X-Accel-Redirect`).

## 2. Настройка сервера (VPS)

### Docker Compose (`docker-compose.yml`)

Добавлен сервис `seaweedfs`. Важно, что порты привязаны к localhost для безопасности.

```yaml
seaweedfs:
  image: chrislusf/seaweedfs
  ports:
    - "127.0.0.1:8333:8333" # S3 API
    - "127.0.0.1:8888:8888" # Filer (WebDAV/HTTP)
    - "127.0.0.1:9333:9333" # Master
  volumes:
    - ./docker-data/seaweedfs:/data
  command: "server -dir=/data -s3 -filer"
```

### Nginx Config (`default`)

1.  **Закомментирован/Удален** публичный блок `server { server_name storage.moment-lbs.app ... }`, чтобы никто не мог скачать файлы напрямую.
2.  **Добавлен** внутренний блок в конфиг домена `moment-lbs.app`:

```nginx
    # Блок для X-Accel-Redirect
    location /private-seaweed/ {
        internal; # Доступ только внутри Nginx (не из браузера напрямую)
        rewrite ^/private-seaweed/(.*) /$1 break; # Убираем префикс
        proxy_pass http://localhost:8888; # Проксируем в Filer
        proxy_set_header Host $host;
    }
```

## 3. Настройка приложения (Next.js)

### Установка зависимостей

```bash
npm install @aws-sdk/client-s3
```

### Клиент S3 (`lib/s3.ts`)

Используется для **загрузки** (Upload) и **удаления** файлов.

```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "us-east-1",
  // Внутри Docker сети обращаемся по имени сервиса
  endpoint: process.env.S3_ENDPOINT || "http://seaweedfs:8333",
  credentials: { accessKeyId: "any", secretAccessKey: "any" },
  forcePathStyle: true,
});
```

### Скачивание файлов (Download)

Используется API Route: `app/api/files/[...path]/route.ts`.

- **URL для фронтенда:** `/api/files/buckets/my-bucket/photo.jpg`
- **Механизм:** Next.js проверяет сессию -> Отдает заголовок `X-Accel-Redirect` -> Nginx отдает контент.

## 4. Полезные команды

**Перезапуск контейнеров:**

```bash
cd /home/hronop/mailserver
docker compose up -d
```

**Применение конфига Nginx:**

```bash
sudo cp default /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl reload nginx
```

**Проверка работы (с сервера):**

```bash
# Проверка, что Filer отвечает локально
curl -I http://localhost:8888/
```
