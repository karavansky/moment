# pgAdmin Setup через Nginx

pgAdmin теперь доступен через `https://quailbreeder.net/pgadmin/`

## 🚀 Запуск pgAdmin

### 1. Настройте пароль

Отредактируйте `docker-compose.pgadmin.yml` и измените:
```yaml
PGADMIN_DEFAULT_EMAIL: admin@quailbreeder.net
PGADMIN_DEFAULT_PASSWORD: changeme  # ИЗМЕНИТЕ ЭТО!
```

### 2. Запустите контейнер

```bash
docker-compose -f docker-compose.pgadmin.yml up -d
```

### 3. Проверьте статус

```bash
docker ps | grep pgadmin
docker logs pgadmin
```

### 4. Скопируйте конфиг nginx

```bash
sudo cp default /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl reload nginx
```

## 🔐 Безопасность (ВАЖНО!)

По умолчанию pgAdmin защищен только своей системой авторизации. Для дополнительной безопасности рекомендуется:

### Вариант 1: HTTP Basic Auth (Рекомендуется)

Создайте файл паролей:
```bash
sudo apt-get install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd pgadmin
```

Раскомментируйте в `/etc/nginx/sites-available/default`:
```nginx
auth_basic "pgAdmin Access";
auth_basic_user_file /etc/nginx/.htpasswd;
```

Перезагрузите nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Вариант 2: IP Whitelist

Добавьте в location /pgadmin/:
```nginx
allow 217.154.208.217;  # Ваш IP
allow 192.168.1.0/24;   # Локальная сеть
deny all;
```

## 📊 Использование

1. Откройте `https://quailbreeder.net/pgadmin/`
2. Войдите используя email и пароль из docker-compose.pgadmin.yml
3. Добавьте PostgreSQL сервер:
   - Host: `localhost` (или IP сервера)
   - Port: `5432`
   - Username: ваш postgres username
   - Password: ваш postgres password

## 🛠️ Управление контейнером

### Остановить
```bash
docker-compose -f docker-compose.pgadmin.yml stop
```

### Запустить
```bash
docker-compose -f docker-compose.pgadmin.yml start
```

### Перезапустить
```bash
docker-compose -f docker-compose.pgadmin.yml restart
```

### Удалить (с удалением данных)
```bash
docker-compose -f docker-compose.pgadmin.yml down -v
```

### Просмотр логов
```bash
docker-compose -f docker-compose.pgadmin.yml logs -f
```

## 🔧 Troubleshooting

### Ошибка "Failed to connect to the server"

Проверьте:
1. PostgreSQL запущен: `sudo systemctl status postgresql`
2. PostgreSQL слушает на правильном порту: `sudo netstat -nltp | grep 5432`
3. pg_hba.conf разрешает подключения (обычно в `/etc/postgresql/*/main/pg_hba.conf`)

### Ошибка 502 Bad Gateway

Проверьте:
1. Контейнер работает: `docker ps | grep pgadmin`
2. Контейнер слушает порт 5050: `netstat -nltp | grep 5050`
3. Логи контейнера: `docker logs pgadmin`

### Проблемы со стилями/скриптами

Убедитесь, что в docker-compose.yml установлена переменная:
```yaml
SCRIPT_NAME: /pgadmin
```

## 📝 Важные заметки

- pgAdmin работает через nginx reverse proxy на пути `/pgadmin/`
- Контейнер слушает только на `127.0.0.1:5050` (недоступен извне)
- Все данные хранятся в Docker volume `pgadmin_data`
- WebSocket поддерживается для real-time features
- Таймаут установлен на 300 секунд для длительных запросов
