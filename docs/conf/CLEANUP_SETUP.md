# Инструкция: Очистка временных файлов (Cron / Systemd)

Мы используем подход с временной папкой для загрузки файлов. Если пользователь не сохранил форму, файлы остаются "сиротами".
Для их удаления используется Systemd Timer, который запускает скрипт очистки раз в сутки.

## 1. Скрипт очистки
Файл: `scripts/cleanup-temp.js`
Логика: Удаляет файлы из бакета `temp`, которые старше 24 часов.

## 2. Установка Systemd Timer (на сервере)

### Шаг 1: Копирование файлов
Файлы находятся в `docs/conf/`. Скопируйте их в системную директорию:

```bash
sudo cp docs/conf/moment-cleanup.service /etc/systemd/system/
sudo cp docs/conf/moment-cleanup.timer /etc/systemd/system/
```

### Шаг 2: Настройка путей
Отредактируйте сервис файл, если пути отличаются:
```bash
sudo nano /etc/systemd/system/moment-cleanup.service
```
*   Проверьте `User` (должен быть вашим пользователем, например `hronop`).
*   Проверьте `WorkingDirectory` (путь к проекту).
*   Проверьте путь к `node` (`which node`).

### Шаг 3: Активация
```bash
# Перезагружаем демон systemd, чтобы он увидел новые файлы
sudo systemctl daemon-reload

# Включаем и запускаем таймер
sudo systemctl enable moment-cleanup.timer
sudo systemctl start moment-cleanup.timer

# Проверка статуса таймера
sudo systemctl list-timers --all | grep moment
# Должно показать время следующего запуска
```

### Шаг 4: Тестовый запуск
Можно запустить сервис вручную (без таймера), чтобы проверить работу скрипта прямо сейчас:
```bash
sudo systemctl start moment-cleanup.service
# Проверка логов
tail -f /var/log/moment-cleanup.log
```
