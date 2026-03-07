# Как протестировать Web Worker

## Быстрый тест

### 1. Запустите сервер
```bash
cd /home/a0e394/testSwift/Hello
swift run
```

### 2. Откройте load.html
```
http://ubuntu-wrk-03-vm:3003/load.html
```

### 3. Проверьте что Web Worker загружен
В логе должно быть:
```
✅ Web Worker initialized (resistant to tab throttling)
✅ Web Worker enabled - test will continue accurately even in background tabs!
```

### 4. Запустите тест
- Username: `loadtest`
- Password: `test123`
- Connections: `50` (для быстрого теста)
- ✅ Включите "Auto-send messages"
- Нажмите **Start Load Test**

### 5. Тест БЕЗ переключения вкладки (baseline)

Подождите 1 минуту, затем нажмите **Stop All**

Ожидаемые результаты:
```
✅ Test completed: 1m 0s
📊 Final stats: Sent=~2,900, Received=~140,000, Errors=0
📈 Throughput: Avg=~2,300 msg/s, Peak=~2,450 msg/s
✅ Tab was active during entire test
```

Формула:
- Sent: 50 клиентов × ~58 секунд × 1 msg/s ≈ 2,900
- Received: 2,900 × 49 получателей ≈ 142,100

### 6. Тест С переключением вкладки (Web Worker тест)

Запустите снова тот же тест:
- **Через 10 секунд** переключитесь на другую вкладку (Chrome DevTools, YouTube, что угодно)
- **Подождите 40 секунд**
- Вернитесь на вкладку с тестом
- Нажмите **Stop All**

Ожидаемые результаты:
```
ℹ️ Tab is now inactive. Web Worker will continue sending messages accurately.
✅ Tab is active again (was hidden for 40s, total: 40s)
✅ Test completed: 1m 0s
📊 Final stats: Sent=~2,900, Received=~140,000, Errors=0  ← ТО ЖЕ САМОЕ!
📈 Throughput: Avg=~2,300 msg/s, Peak=~2,450 msg/s
ℹ️ Tab was inactive for 40s (Web Worker kept test running accurately)
```

**Ключевой момент**: Значения `Sent` и `Received` должны быть **одинаковыми** в обоих тестах!

## Детальный тест на 250 клиентов

### 1. Тест без переключения (5 минут)
```
Connections: 250
Auto-send: ✅
Duration: 5 минут (auto-stop)
Tab: АКТИВНА всё время
```

Ожидаемые результаты:
```
Sent: ~57,000
Received: ~10,800,000
Avg Throughput: ~36,000 msg/s
Peak Throughput: ~62,250 msg/s
Connection time: Min=15ms, Max=500ms, Avg=50ms
```

### 2. Тест с переключением (5 минут)
```
Connections: 250
Auto-send: ✅
Duration: 5 минут (auto-stop)
Tab: НЕАКТИВНА 4 минуты (240 секунд)
```

**Действия**:
1. Запустить тест
2. Дождаться подключения всех 250 клиентов (~2:30)
3. Переключиться на другую вкладку
4. Заняться другими делами 4 минуты
5. Вернуться и проверить результаты

Ожидаемые результаты:
```
Sent: ~57,000          ← ТАКОЕ ЖЕ как в активной вкладке!
Received: ~10,800,000  ← ТАКОЕ ЖЕ!
Avg Throughput: ~36,000 msg/s
Peak Throughput: ~62,250 msg/s
ℹ️ Tab was inactive for 240s (Web Worker kept test running accurately)
```

## Что проверять

### ✅ Web Worker работает правильно если:

1. **Sent сообщений одинаковое** в активной и неактивной вкладке
2. **Throughput стабильный** независимо от активности вкладки
3. **Лог показывает** "Web Worker kept test running accurately"
4. **Browser Console** не показывает ошибок Worker'а

### ❌ Проблемы если:

1. **Sent значительно меньше** в неактивной вкладке
   - Возможно Worker не запустился
   - Проверьте Console: `Failed to initialize Web Worker`

2. **Ошибки в Console**:
   ```
   Failed to load resource: message-worker.js
   ```
   - Проверьте что файл существует: `ls Public/message-worker.js`

3. **Worker не отправляет сообщения**:
   - Откройте Chrome DevTools → Application → Service Workers
   - Проверьте что Worker активен

## Проверка в Chrome DevTools

### 1. Откройте DevTools (F12)

### 2. Вкладка Console
Должны видеть:
```
[Worker] Message worker initialized
[Worker] Initialized with 0 sessions
[Worker] Starting message sending, interval: 1000 ms
[Worker] Added session 0 Total: 1
[Worker] Added session 1 Total: 2
...
```

### 3. Вкладка Application → Service Workers
Должно быть пусто (это не Service Worker, это Web Worker)

### 4. Вкладка Sources → Threads
Должны видеть:
```
▼ Main Thread (load.html)
▼ Worker (message-worker.js)  ← Worker активен!
```

## Сравнение: До и После Web Worker

### БЕЗ Web Worker (старая версия):

| Сценарий | Sent | Received | Accurate? |
|----------|------|----------|-----------|
| Активная вкладка | 57,000 | 10,800,000 | ✅ |
| Неактивная вкладка | 5,000 | 10,800,000 | ❌ |

### С Web Worker (новая версия):

| Сценарий | Sent | Received | Accurate? |
|----------|------|----------|-----------|
| Активная вкладка | 57,000 | 10,800,000 | ✅ |
| Неактивная вкладка | 57,000 | 10,800,000 | ✅ |

## Troubleshooting

### Worker не загружается

**Проблема**: `Failed to load resource: message-worker.js`

**Решение**:
```bash
# Проверьте что файл существует
ls -la /home/a0e394/testSwift/Hello/Public/message-worker.js

# Проверьте права доступа
chmod 644 /home/a0e394/testSwift/Hello/Public/message-worker.js
```

### Worker не отправляет сообщения

**Проблема**: Sent = 0 даже с включенным Auto-send

**Решение**:
1. Откройте Console
2. Проверьте есть ли ошибки
3. Вручную проверьте:
```javascript
// В Console
messageWorker.postMessage({ type: 'start', data: { interval: 1000 } })
```

### Неточные результаты всё равно

**Проблема**: Результаты всё еще неточные в неактивной вкладке

**Причина**: Возможно старая версия load.html в кэше браузера

**Решение**:
```
1. Ctrl+Shift+R (hard refresh)
2. Или: DevTools → Network → Disable cache → F5
3. Или: Инкогнито режим
```

## Итог

Web Worker полностью решил проблему throttling'а браузера. Теперь можно:
- ✅ Запустить тест и переключиться на другую вкладку
- ✅ Получить точные результаты независимо от активности вкладки
- ✅ Тестировать на любом количестве клиентов без потери точности
