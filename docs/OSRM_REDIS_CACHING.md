# OSRM Redis Кэширование Маршрутов

## Обзор

Система кэширования маршрутов использует Redis для хранения результатов запросов к OSRM API. Это значительно снижает нагрузку на OSRM сервер и ускоряет получение маршрутов для повторяющихся запросов.

## Архитектура

```
Клиент → Next.js API Route → Redis Cache ↔ OSRM Server (локальный/публичный)
```

### Компоненты

1. **Redis** - In-memory кэш для хранения маршрутов
2. **API Route** (`/api/routing`) - Обрабатывает запросы и управляет кэшем
3. **OSRM Server** - Вычисляет маршруты (локальный или публичный fallback)

## Как это работает

### 1. Нормализация координат

Координаты округляются до 4 знаков после запятой для эффективного кэширования:

```
6.95817,50.94131 → 6.9582,50.9413
```

Это позволяет кэшировать близкие координаты как один маршрут.

### 2. Создание ключа кэша

Ключ генерируется из нормализованных координат:

```typescript
// Пример: osrm:route:a1b2c3d4e5f6789012345678
const hash = crypto.createHash('md5').update(normalized).digest('hex')
const key = `osrm:route:${hash}`
```

### 3. Логика кэширования

```
┌─────────────┐
│ API Request │
└──────┬──────┘
       │
       ↓
┌──────────────┐
│ Check Redis  │
└──────┬───────┘
       │
       ├─→ Cache Hit  → Return cached data
       │
       └─→ Cache Miss → ┌───────────────┐
                        │ Call OSRM API │
                        └───────┬───────┘
                                │
                                ↓
                        ┌───────────────┐
                        │  Save to Redis│
                        │   TTL: 7 days │
                        └───────┬───────┘
                                │
                                ↓
                        ┌───────────────┐
                        │ Return result │
                        └───────────────┘
```

### 4. TTL (Time To Live)

Маршруты кэшируются на **7 дней** (604,800 секунд):

```typescript
const CACHE_TTL = 7 * 24 * 60 * 60 // 7 дней
await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data))
```

## Конфигурация

### Docker Compose

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "127.0.0.1:6379:6379"
  volumes:
    - redis-data:/data
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  mem_limit: 512m
```

### Параметры Redis

- **maxmemory**: 256 MB (достаточно для тысяч маршрутов)
- **maxmemory-policy**: `allkeys-lru` - удаляет старые ключи при заполнении памяти
- **appendonly**: `yes` - сохраняет данные на диск для персистентности

### Environment Variables

```env
REDIS_HOST=redis        # В Docker сети
REDIS_PORT=6379
```

## API Usage

### Запрос маршрута

```bash
# Формат 1: coordinates parameter
GET /api/routing?coordinates=6.9582,50.9413;6.9452,50.9429

# Формат 2: start/end parameters
GET /api/routing?start=6.9582,50.9413&end=6.9452,50.9429
```

### Ответ с кэшем

```json
{
  "code": "Ok",
  "routes": [...],
  "waypoints": [...],
  "_cached": true,              // Получено из кэша
  "_cacheKey": "osrm:route:..."  // Ключ кэша
}
```

### Ответ без кэша

```json
{
  "code": "Ok",
  "routes": [...],
  "waypoints": [...],
  "_cached": false,             // Новый запрос к OSRM
  "_cacheKey": "osrm:route:..." // Сохранено в кэш
}
```

### Fallback на публичный OSRM

```json
{
  "code": "Ok",
  "routes": [...],
  "waypoints": [...],
  "_fallback": true,            // Использован публичный сервер
  "_cached": false,
  "_message": "Using public OSRM server"
}
```

## Мониторинг

### Проверка Redis

```bash
# Подключение к Redis CLI
docker exec -it redis redis-cli

# Проверка работоспособности
redis-cli ping
# PONG

# Количество ключей
redis-cli DBSIZE

# Информация о памяти
redis-cli INFO memory

# Получить все ключи маршрутов
redis-cli KEYS "osrm:route:*"

# Посмотреть TTL ключа
redis-cli TTL "osrm:route:a1b2c3d4..."

# Посмотреть значение ключа
redis-cli GET "osrm:route:a1b2c3d4..."
```

### Проверка логов

```bash
# Логи Next.js приложения (показывают cache hits/misses)
docker compose logs -f moment

# Логи Redis
docker compose logs -f redis
```

### Ожидаемые логи

```
✅ Cache hit for: 6.9582,50.9413;6.9452,50.9429
❌ Cache miss for: 6.9582,50.9413;6.9452,50.9429
🗺️  OSRM request: http://localhost:5000/route/v1/driving/...
💾 Cached route: osrm:route:a1b2c3d4...
```

## Производительность

### Статистика кэширования

- **Cache Hit**: ~1-5 ms (чтение из Redis)
- **Cache Miss**: ~50-200 ms (запрос к локальному OSRM + кэширование)
- **Public OSRM**: ~200-500 ms (запрос к удаленному серверу)

### Экономия ресурсов

С кэшированием для **1000 заказов в день**:

- **Без кэша**: 1000 запросов к OSRM ежедневно
- **С кэшем** (при 80% повторяющихся маршрутов): 200 запросов к OSRM, 800 из кэша

## Очистка кэша

### Очистить все маршруты

```bash
docker exec -it redis redis-cli
> EVAL "return redis.call('del', unpack(redis.call('keys', 'osrm:route:*')))" 0
```

### Очистить весь Redis

```bash
docker exec -it redis redis-cli FLUSHALL
```

### Удалить конкретный маршрут

```bash
docker exec -it redis redis-cli DEL "osrm:route:HASH"
```

## Troubleshooting

### Redis недоступен

Приложение продолжит работать, но без кэширования:

```
⚠️  Redis unavailable, skipping cache: [error]
```

### Ключ не найден в кэше

Нормальное поведение для новых маршрутов:

```
❌ Cache miss for: 6.9582,50.9413;6.9452,50.9429
```

### OSRM недоступен

Система автоматически переключится на публичный OSRM:

```
🔄 Trying fallback OSRM: https://router.project-osrm.org/...
```

## Рекомендации

1. **Мониторинг**: Регулярно проверяйте cache hit rate
2. **TTL**: 7 дней - оптимально для городского транспорта
3. **Память**: 256 MB Redis может хранить ~10,000-50,000 маршрутов
4. **Backup**: Redis использует AOF (Append Only File) для персистентности
5. **Производство**: Рассмотрите Redis Sentinel или Cluster для HA

## Пример использования в коде

```typescript
// RoutePolyline компонент автоматически использует кэшированный API
import RoutePolyline from '@/components/dispatcher/RoutePolyline'

<RoutePolyline
  pickup={[50.9413, 6.9582]}
  dropoff={[50.9429, 6.9452]}
  color="#0ea5e9"
/>
```

Компонент делает запрос к `/api/routing`, который:
1. Проверяет Redis кэш
2. Возвращает кэшированный результат ИЛИ
3. Запрашивает OSRM и сохраняет в кэш

Никакой дополнительной логики в компоненте не требуется!
