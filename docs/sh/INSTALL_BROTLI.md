# Установка Brotli модуля для Nginx

## Текущее состояние
- ✅ HTTP/3 поддержка есть
- ✅ Gzip compression включен (comp_level 6)
- ⚠️ Brotli модуля нет (нужна установка)

## Вариант 1: Установка через apt (проще)

```bash
# Добавить PPA репозиторий
sudo add-apt-repository ppa:ondrej/nginx-mainline

# Установить модуль Brotli
sudo apt update
sudo apt install libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static

# Проверить установку
nginx -V 2>&1 | grep brotli
```

Если модули установились, добавьте в `/etc/nginx/nginx.conf` в секцию `http`:

```nginx
# Включить модули
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;
```

Затем в `nginx-http3-compression.conf` раскомментируйте:

```nginx
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

## Вариант 2: Использовать только Gzip (рекомендуется)

**Gzip уже работает и дает хорошее сжатие:**
- Сжатие: ~70-80% для текста
- CPU overhead: низкий
- Поддержка: 100% браузеров

**Brotli дает:**
- Сжатие: ~75-85% для текста (на 5-10% лучше)
- CPU overhead: выше
- Поддержка: 95% браузеров

**Вывод:** Для большинства сайтов Gzip достаточно. Brotli дает небольшой выигрыш за счет дополнительной сложности.

## Применение конфигурации

```bash
# 1. Backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# 2. Применить новую конфигурацию
sudo cp nginx-http3-compression.conf /etc/nginx/sites-available/default

# 3. Проверить
sudo nginx -t

# 4. Перезагрузить
sudo systemctl reload nginx

# 5. Открыть UDP порт для HTTP/3
sudo ufw allow 443/udp

# 6. Проверить compression
curl -H "Accept-Encoding: gzip" -I https://quailbreeder.net

# Должен быть header:
# Content-Encoding: gzip
```

## Тестирование

**Проверить Gzip:**
```bash
curl -H "Accept-Encoding: gzip" https://quailbreeder.net -o /dev/null -w '%{size_download}\n'
```

**Проверить HTTP/3:**
```bash
curl --http3 https://quailbreeder.net -I
```

**Онлайн проверка:**
- HTTP/3: https://http3check.net/?host=quailbreeder.net
- Compression: https://www.giftofspeed.com/gzip-test/

## Конфигурация Gzip (уже включена)

```nginx
gzip on;                    # Включить Gzip
gzip_vary on;               # Добавить Vary: Accept-Encoding header
gzip_proxied any;           # Сжимать proxied content
gzip_comp_level 6;          # Уровень сжатия (1-9, 6 оптимально)
gzip_min_length 256;        # Минимальный размер для сжатия
gzip_types                  # Типы файлов для сжатия
  text/plain
  text/css
  text/xml
  text/javascript
  application/json
  application/javascript
  application/xml+rss
  application/rss+xml
  font/truetype
  font/opentype
  application/vnd.ms-fontobject
  image/svg+xml;
```

## Ожидаемые результаты

**Без compression:**
- HTML: ~50 KB
- CSS: ~100 KB
- JS: ~500 KB
- Total: ~650 KB

**С Gzip (level 6):**
- HTML: ~10 KB (80% сжатие)
- CSS: ~15 KB (85% сжатие)
- JS: ~150 KB (70% сжатие)
- Total: ~175 KB (73% экономия)

**С Brotli (level 6):**
- HTML: ~8 KB (84% сжатие)
- CSS: ~12 KB (88% сжатие)
- JS: ~130 KB (74% сжатие)
- Total: ~150 KB (77% экономия)

**Разница:** Brotli дает ~25 KB дополнительной экономии (4% улучшение над Gzip).
