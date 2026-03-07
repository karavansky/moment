# Development Guide

## Quick Start

### Использование dev.sh скрипта (рекомендуется)

```bash
# Показать справку
./dev.sh help

# Собрать и задеплоить
./dev.sh deploy

# Протестировать регистрацию
./dev.sh test

# Посмотреть логи
./dev.sh logs

# Посмотреть сессии в БД
./dev.sh sessions
```

### Использование VSCode Tasks

**Быстрый доступ:**
1. Нажмите `Ctrl+Shift+P`
2. Введите `Tasks: Run Task`
3. Выберите нужную задачу

**Или используйте горячую клавишу:**
- `Ctrl+Shift+B` - собрать release версию

**Доступные задачи:**
- Build Debug
- Build Release
- Run Server (Debug)
- Restart Vapor Service
- View Server Logs
- Server Status
- Test Register User
- View Database Sessions
- Full Build and Restart

Подробнее: [.vscode/TASKS_GUIDE.md](.vscode/TASKS_GUIDE.md)

## Команды разработки

### Сборка

```bash
# Debug
swift build

# Release
swift build -c release
```

### Управление сервером

```bash
# Перезапустить
sudo systemctl restart vapor-chat.service

# Статус
sudo systemctl status vapor-chat.service

# Логи
sudo journalctl -u vapor-chat.service -f

# Остановить
sudo systemctl stop vapor-chat.service
```

### Тестирование API

```bash
# Регистрация
curl -X POST http://localhost:3003/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"test","password":"test123"}' | jq .

# Health check
curl http://localhost:3003/health

# Статистика сервера
curl http://localhost:3003/server-stats

# Список пользователей
curl http://localhost:3003/users | jq .
```

### Работа с БД

```bash
# Открыть БД
sqlite3 db.sqlite

# Посмотреть сессии
sqlite3 db.sqlite "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10"

# Удалить старые сессии
sqlite3 db.sqlite "DELETE FROM sessions WHERE LENGTH(session_id) != 22"

# Посмотреть пользователей
sqlite3 db.sqlite "SELECT * FROM users"
```

## Структура проекта

```
Hello/
├── Sources/
│   └── Hello/
│       ├── configure.swift      # Конфигурация приложения
│       ├── routes.swift          # API маршруты
│       ├── WebSocketManager.swift # WebSocket менеджер
│       └── Models/
│           └── Models.swift      # Модели данных
├── Tests/
├── Public/                       # Статические файлы
├── .vscode/
│   ├── tasks.json               # VSCode задачи
│   └── TASKS_GUIDE.md           # Руководство по задачам
├── dev.sh                       # Скрипт разработчика
├── Package.swift                # Swift Package описание
└── db.sqlite                    # База данных SQLite
```

## Session ID Format

Проект использует короткий формат sessionId в стиле nanoid:

- **Длина:** 22 символа
- **Формат:** base62 (0-9, A-Z, a-z)
- **Пример:** `R8IexwH6OJ1aF9H4UXtG2R`
- **Безопасность:** Криптографически стойкий генератор
- **Хранение:** Redis с автоматическим TTL

**Реализация:** [Sources/Hello/SessionManager.swift#L198-208](Sources/Hello/SessionManager.swift#L198-L208)

## Session Management (Redis)

### TTL и продление сессии

Проект использует **sliding expiration** (скользящее продление):

- **Начальный TTL:** 24 часа (86400 секунд)
- **Продление при активности:** Полные 24 часа от последнего действия
- **Активные действия:**
  - Подключение к WebSocket
  - Отправка сообщения в чат

**Поведение:**
- ✅ Активный пользователь: сессия продлевается автоматически, никогда не истечет
- ⏱️ Неактивный пользователь: сессия удалится через 24 часа после последней активности
- 🔄 Redis автоматически удаляет истекшие ключи (no cleanup job needed)

**Подробнее:** [REDIS_SESSION_GUIDE.md](REDIS_SESSION_GUIDE.md)

## Настройка sudo без пароля (опционально)

Для удобства работы с VSCode Tasks и dev.sh:

```bash
sudo visudo
```

Добавьте:
```
your_username ALL=(ALL) NOPASSWD: /bin/systemctl restart vapor-chat.service
your_username ALL=(ALL) NOPASSWD: /bin/systemctl stop vapor-chat.service
your_username ALL=(ALL) NOPASSWD: /bin/systemctl status vapor-chat.service
your_username ALL=(ALL) NOPASSWD: /bin/journalctl
```

## Полезные команды

```bash
# Мониторинг процессов
ps aux | grep WebSocketServer

# Мониторинг портов
sudo netstat -tulpn | grep 3003

# Посмотреть активные WebSocket соединения
curl -s http://localhost:3003/server-stats

# Бэкап БД
cp db.sqlite db.sqlite.backup

# Очистка build артефактов
swift package clean
```

## Troubleshooting

### Сервер не запускается
```bash
# Проверить логи
sudo journalctl -u vapor-chat.service -n 50

# Проверить порт
sudo lsof -i :3003
```

### База данных заблокирована
```bash
# Остановить сервер
sudo systemctl stop vapor-chat.service

# Проверить блокировки
fuser db.sqlite
```

### Старые сессии в БД
```bash
# Очистить через скрипт
./dev.sh clean

# Или вручную
sqlite3 db.sqlite "DELETE FROM sessions WHERE LENGTH(session_id) != 22"
```
