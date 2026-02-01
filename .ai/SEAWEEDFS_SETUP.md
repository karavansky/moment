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

**ВАЖНО: Ловушка регулярных выражений**
Если у вас есть глобальный блок для статики `location ~* \.(jpg|png|...)$`, он перехватит внутренний редирект, если файл имеет такое расширение.
Чтобы этого избежать, используйте модификатор `^~`, который имеет более высокий приоритет, чем регулярные выражения.

Также используйте `127.0.0.1` вместо `localhost` для избежания конфликтов IPv4/IPv6.

```nginx
    # ===== PRIVATE STORAGE (X-Accel-Redirect) =====
    # ^~ предотвращает перехват запроса блоком статики (.png, .jpg)
    location ^~ /private-seaweed/ {
        internal; # Доступ только внутри Nginx (не из браузера напрямую)
        
        # 1. Меняем Host на localhost, чтобы SeaweedFS не путался в доменах
        proxy_set_header Host "localhost";

        # 2. Убираем префикс
        rewrite ^/private-seaweed/(.*) /$1 break; 
        
        # 3. Используем IP явно
        proxy_pass http://127.0.0.1:8888; 
    }
```

### Cloudflare Real IP
Для корректного определения IP адресов при использовании Cloudflare, создайте файл `/etc/nginx/conf.d/cloudflare.conf` со списком IP Cloudflare и директивой `real_ip_header CF-Connecting-IP;`.

## 3. Настройка приложения (Next.js)

### Инициализация бакетов
Бакеты в SeaweedFS не появляются сами по себе при деплое. Их нужно создать скриптом один раз.
**Скрипт:** `scripts/init-s3.js`
**Запуск:** `node scripts/init-s3.js` (на сервере)

### Клиент S3 (`lib/s3.js`)

Используется для **загрузки** (Upload) и **удаления** файлов.

```javascript
import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "us-east-1",
  // В продакшене внутри Docker сети можно использовать имя сервиса http://seaweedfs:8333
  // Но для скриптов с хоста используем localhost
  endpoint: process.env.S3_ENDPOINT || "http://127.0.0.1:8333",
  credentials: { accessKeyId: "any", secretAccessKey: "any" },
  forcePathStyle: true,
});
```

### Скачивание файлов (Download)

Используется API Route: `app/api/files/[...path]/route.ts`.

- **URL для фронтенда:** `/api/files/buckets/images/photo.png`
- **Механизм:** Next.js проверяет сессию -> Отдает заголовок `X-Accel-Redirect` -> Nginx отдает контент.

```typescript
// Пример возврата заголовка в route.ts
return new NextResponse(null, {
  headers: {
    'X-Accel-Redirect': `/private-seaweed/${filePath}`,
    'Content-Type': 'application/octet-stream', // Или реальный тип файла
  },
});
```

## 4. Диагностика

**Проверка наличия файлов:**
```bash
node scripts/check-s3.js
```

**Проверка прямого доступа (curl с сервера):**
```bash
# Получить список файлов в бакете images
curl -H "Accept: application/json" http://127.0.0.1:8888/buckets/images/
```

**Логи Nginx:**
```bash
tail -f /var/log/nginx/error.log
```
Если вы видите ошибку 404 при запросе картинки через API, скорее всего сработал location для статики. Проверьте наличие `^~` в конфиге Nginx.