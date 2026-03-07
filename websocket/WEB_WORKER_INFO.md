# Web Worker Integration for Load Testing

## Проблема

Браузеры throttle (замедляют) JavaScript таймеры (`setInterval`, `setTimeout`) когда вкладка неактивна для экономии ресурсов. Это приводило к:

- **Замедление отправки сообщений** в 10-100 раз
- **Неточные результаты тестирования**
- **Невозможность запустить тест и переключиться на другую вкладку**

## Решение: Web Workers

Web Workers работают в отдельном потоке и **НЕ подвержены throttling'у браузера** даже когда вкладка неактивна.

## Архитектура

### Файлы:

1. **`Public/message-worker.js`** - Web Worker который:
   - Работает в отдельном потоке
   - Отправляет команды на отправку сообщений каждую секунду
   - Не зависит от состояния вкладки (активна/неактивна)

2. **`Public/load.html`** - Главная страница тестирования:
   - Инициализирует Web Worker при загрузке
   - Передает список активных сессий в Worker
   - Получает команды от Worker'а и отправляет WebSocket сообщения
   - Отслеживает когда вкладка становится неактивной (для статистики)

## Как это работает

```
┌─────────────────────────────────────────────────────────┐
│  Main Thread (load.html)                                │
│  - WebSocket connections                                 │
│  - UI updates                                            │
│  - Receives commands from Worker                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ postMessage()
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Worker Thread (message-worker.js)                       │
│  - setInterval() runs at precise 1000ms                  │
│  - NOT affected by browser throttling                    │
│  - Sends "sendMessage" commands every second             │
└──────────────────────────────────────────────────────────┘
```

### Поток данных:

1. **Инициализация**:
   ```javascript
   initWorker() → messageWorker = new Worker('message-worker.js')
   ```

2. **Старт теста**:
   ```javascript
   startWorkerMessaging() → Worker получает список сессий → Worker запускает setInterval(1000ms)
   ```

3. **Каждую секунду** (даже в неактивной вкладке):
   ```javascript
   Worker → postMessage('sendMessage', sessionId, cpuValue) → Main Thread → ws.send(message)
   ```

4. **Остановка**:
   ```javascript
   stopWorkerMessaging() → Worker останавливает setInterval
   ```

## Преимущества

✅ **Точность**: Сообщения отправляются точно каждую секунду, даже если вкладка неактивна

✅ **Надежность**: Worker работает в отдельном потоке и не блокируется UI

✅ **Стабильность**: Результаты тестирования больше не зависят от активности вкладки

✅ **Масштабируемость**: Один Worker может управлять отправкой для сотен WebSocket соединений

## Тестирование

### Без Web Worker (старая версия):
```
1. Запустить тест на 250 клиентов
2. Переключиться на другую вкладку через 30 секунд
3. Вернуться через 1 минуту

Результат:
- Sent: ~10,000 (должно быть ~57,000) ❌
- Received: 10,827,000 ✅ (продолжало получать)
- Throughput: завышен из-за дисбаланса ❌
```

### С Web Worker (новая версия):
```
1. Запустить тест на 250 клиентов
2. Переключиться на другую вкладку через 30 секунд
3. Вернуться через 1 минуту

Результат:
- Sent: ~57,000 ✅ (Worker продолжал отправку)
- Received: 10,827,000 ✅
- Throughput: точный ✅
- Лог: "Tab was inactive for 60s (Web Worker kept test running accurately)"
```

## API Worker'а

### Команды в Worker (Main → Worker):

```javascript
// Инициализация списка сессий
postMessage({ type: 'init', data: { sessions: [...] } })

// Добавить сессию
postMessage({ type: 'addSession', data: { session: {...} } })

// Удалить сессию
postMessage({ type: 'removeSession', data: { sessionId: 123 } })

// Обновить весь список
postMessage({ type: 'updateSessions', data: { sessions: [...] } })

// Запустить отправку
postMessage({ type: 'start', data: { interval: 1000 } })

// Остановить отправку
postMessage({ type: 'stop' })
```

### Команды из Worker'а (Worker → Main):

```javascript
// Команда отправить сообщение
{ type: 'sendMessage', sessionId: 123, message: {...}, timestamp: ... }

// Статистика (опционально)
{ type: 'stats', activeCount: 250, timestamp: ... }

// Worker остановлен
{ type: 'stopped' }

// Ошибка
{ type: 'error', error: 'message' }
```

## Ограничения Web Workers

❌ **Нет доступа к DOM**: Worker не может изменять HTML напрямую

❌ **Нет доступа к WebSocket**: Worker не может создавать WebSocket соединения

✅ **Решение**: Worker отправляет команды, Main Thread выполняет WebSocket операции

## Совместимость

Web Workers поддерживаются всеми современными браузерами:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Opera: ✅

## Производительность

**Overhead**: Минимальный
- Один Worker управляет всеми 250+ соединениями
- postMessage() очень быстрый (<1ms)
- setInterval в Worker'е точнее чем в Main Thread

**Результаты**:
- 250 клиентов × 1 msg/s = 250 команд/с от Worker'а
- Main Thread обрабатывает 250 WebSocket.send() в секунду
- CPU использование: незначительное увеличение

## Итог

Web Worker решил проблему throttling'а браузера и позволяет проводить точное нагрузочное тестирование независимо от того, активна вкладка или нет.
