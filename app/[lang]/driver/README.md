# 🚗 Driver Interface - GPS Navigation & Optimization

## 📋 Содержание

1. [Обзор](#обзор)
2. [Архитектура GPS трекинга](#архитектура-gps-трекинга)
3. [Оптимизации](#оптимизации)
4. [Режимы работы](#режимы-работы)
5. [UI компоненты](#ui-компоненты)
6. [Тестирование](#тестирование)
7. [Технические детали](#технические-детали)

---

## Обзор

Интерфейс водителя для real-time GPS трекинга с оптимизацией производительности и плавной анимацией карты.

**Файл**: `app/[lang]/driver/page.tsx`

**Основные возможности**:
- ✅ Real-time GPS трекинг (обновление каждые 2 секунды)
- ✅ Плавное движение маркера (interpolation)
- ✅ Вращение карты по направлению движения
- ✅ Snap-to-road (OSRM)
- ✅ Батчинг GPS точек (опционально)
- ✅ Фильтрация GPS шума
- ✅ Расчет скорости и bearing

---

## Архитектура GPS трекинга

### Поток данных

```
┌─────────────────────────────────────────────────────────────────┐
│                    КЛИЕНТСКАЯ СТОРОНА                            │
└─────────────────────────────────────────────────────────────────┘

[Browser Geolocation API]
         ↓ (каждые 2 секунды)
    [useGeolocation hook]
         ↓
    [GPS Noise Filter]
    (отклонение > 50м = отклонить)
         ↓
    [Local Calculations]
    - Bearing (направление)
    - Speed (скорость)
    - Distance (расстояние)
         ↓
    [State Updates - ЛОКАЛЬНО]
    - setMapBearing()
    - setCurrentSpeed()
    - setInterpolationParams()
         ↓
    ┌─────────────────────────────────┐
    │  BATCHING MODE?                 │
    └─────────────────────────────────┘
         ↓                    ↓
    [YES - Batch]       [NO - Immediate]
    Накопить 5          Отправить
    точек или           сразу
    10 секунд
         ↓                    ↓
         └────────┬───────────┘
                  ↓

┌─────────────────────────────────────────────────────────────────┐
│                    СЕРВЕРНАЯ СТОРОНА                             │
└─────────────────────────────────────────────────────────────────┘

    [Vapor-API]
         ↓
    [OSRM Snap-to-Road]
    (с кэшем, grid 11m, TTL 60s)
         ↓
    [PostgreSQL]
    (UPDATE...RETURNING)
         ↓
    [Response]
    { currentLat, currentLng, wasSnapped }
         ↓

┌─────────────────────────────────────────────────────────────────┐
│                 ВИЗУАЛИЗАЦИЯ (60 FPS)                            │
└─────────────────────────────────────────────────────────────────┘

    [Interpolation Animation]
    - requestAnimationFrame
    - Ease-out-quad easing
    - Duration: 2 секунды
         ↓
    [Map Rotation]
    - requestAnimationFrame
    - Smooth bearing transition
    - Duration: 1 секунда
         ↓
    [Vehicle Tracking]
    - requestAnimationFrame
    - Позиция: 50% X, 80% Y
    - Continuous centering
         ↓
    [Leaflet Map Update]
    - Маркер двигается плавно
    - Карта вращается плавно
    - Карта следует за маркером
```

---

## Оптимизации

### Реализованные оптимизации (5 из 5)

#### 1️⃣ Логирование (-98%)
**Файл**: `vapor-api/Sources/App/Controllers/VehicleLocationController.swift:186`

**Было**: ~15 строк логов на каждое GPS обновление
```swift
req.logger.info("[GPS] Received update")
req.logger.info("[GPS] Vehicle found")
req.logger.info("[GPS] OSRM called")
// ... 12 строк ...
```

**Стало**: 1 debug строка
```swift
req.logger.debug("[GPS] Updated ABC-123: (50.123, 7.456) snapped=true")
```

**Эффект**:
- 69 точек × 15 строк = 1035 строк → 14 строк
- Снижение: **-98.6%**

---

#### 2️⃣ Throttling (уже было)
**Файл**: `app/[lang]/driver/page.tsx:282-328`

**Реализация**:
```typescript
const GPS_UPDATE_INTERVAL = 2000 // 2 секунды

if (now - lastGPSUpdateRef.current < GPS_UPDATE_INTERVAL) {
  console.log('⏱️ Throttling GPS update (too soon)')
  return
}

// GPS NOISE FILTER: Reject unrealistic jumps
const maxRealisticDist = 50 // meters
if (dist > maxRealisticDist) {
  console.warn('🚫 GPS NOISE detected - rejecting update')
  return
}
```

**Эффект**:
- Предотвращение спама GPS обновлений
- Фильтрация GPS шума (дрожание сигнала)

---

#### 3️⃣ OSRM Кэширование
**Файл**: `vapor-api/Sources/App/Controllers/VehicleLocationController.swift:8-53`

**Параметры**:
- Grid size: `0.0001°` (~11 метров)
- TTL: `60 секунд`
- Max entries: `1000`
- Thread-safe: `NSLock`

**Реализация**:
```swift
private static let cacheLock = NSLock()
private nonisolated(unsafe) static var osrmCache: [String: (lat, lng, timestamp)] = [:]

func getCachedOSRM(lat: Double, lng: Double) -> (lat: Double, lng: Double)? {
    cacheLock.lock()
    defer { cacheLock.unlock() }

    let key = "\(roundToGrid(lat)),\(roundToGrid(lng))"
    if let cached = osrmCache[key],
       Date().timeIntervalSince(cached.timestamp) < cacheLifetime {
        return (lat: cached.lat, lng: cached.lng)
    }
    return nil
}
```

**Эффект**:
- Cache hit rate: **50-80%** (зависит от маршрута)
- Снижение OSRM вызовов: **-50-80%**

---

#### 4️⃣ Батчинг GPS точек
**Файл**: `app/[lang]/driver/page.tsx:96-101, 377-475`

**Параметры**:
- Batch size: `5 точек`
- Batch interval: `10 секунд`
- Endpoint: `/api/transport/location/batch`

**Логика**:
```typescript
// Накопление точек
gpsBatchRef.current.push({
  latitude: position.latitude,
  longitude: position.longitude,
  timestamp: new Date().toISOString(),
})

// Отправка когда:
const shouldSendBatch =
  gpsBatchRef.current.length >= BATCH_SIZE ||     // 5 точек
  (now - lastBatchSentRef.current) >= BATCH_INTERVAL // 10 сек

if (shouldSendBatch) {
  fetch('/api/transport/location/batch', {
    method: 'POST',
    body: JSON.stringify({
      vehicleID: vehicle.id,
      locations: batch, // Array of 5 points
    }),
  })
}
```

**Эффект**:
- HTTP запросы: 69 → ~14 (**-80%**)
- Bandwidth: значительно меньше (headers overhead)

---

#### 5️⃣ Оптимизация БД
**Файл**: `vapor-api/Sources/App/Controllers/VehicleLocationController.swift:158-184`

**Было**: 2 операции
```swift
// 1. SELECT
let vehicle = try await Vehicle.query(on: req.db)
    .filter(\.$id == vehicleID)
    .first()

// 2. UPDATE
vehicle.currentLat = lat
vehicle.currentLng = lng
try await vehicle.save(on: req.db)
```

**Стало**: 1 операция
```swift
let updated = try await sql.raw("""
    UPDATE vehicles
    SET "currentLat" = \(bind: finalLat),
        "currentLng" = \(bind: finalLng),
        "lastLocationUpdate" = \(bind: timestamp)
    WHERE "vehicleID" = \(bind: vehicleID)
      AND "firmaID" = \(bind: firmaID)
    RETURNING "vehicleID", "plateNumber", "currentLat", "currentLng", "lastLocationUpdate"
    """).first()
```

**Эффект**:
- DB операции: 138 → 14 (**-90%**)
- Latency: меньше (один round-trip)

---

### Итоговая таблица оптимизаций

| Метрика | До | После | Снижение |
|---------|----|----|----------|
| **HTTP запросы** | 69 | ~14 | **-80%** |
| **DB операции** | 138 | ~14 | **-90%** |
| **Строк логов** | 1035 | ~14 | **-98.6%** |
| **OSRM вызовы** | 69 | 14-69* | **0-80%** |

*Зависит от cache hit rate

**Общее снижение нагрузки**: **~85-90%**

---

## Режимы работы

### Batching Mode (по умолчанию) ✅

**Включение**: Checkbox "Batching ✅" включен

**Поведение**:
- GPS обновляется **локально** каждые 2 секунды
- Bearing и speed вычисляются **локально**
- Маркер двигается **плавно** (interpolation 2 сек)
- Карта вращается **плавно** (requestAnimationFrame)
- Отправка на сервер: **пачками** (5 точек ИЛИ 10 сек)

**Логи в консоли**:
```
📦 Added GPS point to batch: { batchSize: 1, maxSize: 5, ... }
📦 Added GPS point to batch: { batchSize: 2, maxSize: 5, ... }
📦 Added GPS point to batch: { batchSize: 3, maxSize: 5, ... }
📦 Added GPS point to batch: { batchSize: 4, maxSize: 5, ... }
📦 Added GPS point to batch: { batchSize: 5, maxSize: 5, ... }
📤 Sending GPS batch to /api/transport/location/batch: { pointCount: 5 }
✅ Vehicle position updated (batch): { processedCount: 5 }
```

**Network вкладка**:
- ~14 запросов к `/api/transport/location/batch`
- Каждый с `pointCount: 5` (кроме последнего)

---

### Immediate Mode ❌

**Включение**: Checkbox "Batching ❌" выключен

**Поведение**:
- GPS обновляется **локально** каждые 2 секунды
- Bearing и speed вычисляются **локально**
- Маркер двигается **плавно** (interpolation 2 сек)
- Карта вращается **плавно** (requestAnimationFrame)
- Отправка на сервер: **каждые 2 секунды**

**Логи в консоли**:
```
⚠️ Batching disabled - clearing batch with 3 pending points
📤 Sending GPS immediately to /api/transport/location
✅ Vehicle position updated (immediate)
📤 Sending GPS immediately to /api/transport/location
✅ Vehicle position updated (immediate)
...
```

**Network вкладка**:
- 69 запросов к `/api/transport/location`
- Каждые 2 секунды

---

### Сравнение режимов

| Параметр | Batching ✅ | Immediate ❌ |
|----------|------------|--------------|
| **Визуальная плавность** | Плавно ✅ | Плавно ✅ |
| **Частота локальных обновлений** | 2 сек | 2 сек |
| **Частота отправки на сервер** | 10 сек | 2 сек |
| **HTTP запросы (69 точек)** | ~14 | 69 |
| **DB операции (69 точек)** | ~14 | 69 |
| **Логи vapor-api** | ~14 строк | ~69 строк |
| **Нагрузка на сервер** | Низкая | Высокая |
| **Использование bandwidth** | Низкое | Высокое |

**Ключевой вывод**: Визуально режимы **ИДЕНТИЧНЫ**, но batching снижает нагрузку на **85-90%**!

---

## UI компоненты

### Header (верхний бар)

```tsx
<div className="flex items-center gap-3">
  {/* Batching toggle */}
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={batchingEnabled} />
    <span>Batching {batchingEnabled ? '✅' : '❌'}</span>
  </label>

  {/* Test route button */}
  <button onClick={loadTestRoute}>
    🧪 Test Route
  </button>

  {/* Online status */}
  <span>{isOnline ? 'На линии' : 'Не на линии'}</span>
  <Switch isSelected={isOnline} onChange={handleOnlineToggle} />
</div>
```

**Расположение**: Правый верхний угол

---

### Map (основная карта)

**Компонент**: `components/map/Map.tsx`

**Возможности**:
- ✅ Вращение карты (leaflet-rotate)
- ✅ Vehicle маркер с направлением
- ✅ Route polyline (тестовый маршрут)
- ✅ Фиксированная позиция маркера (50% X, 80% Y)

**Props**:
```typescript
<Map
  center={mapCenter}
  zoom={mapZoom}
  vehicles={localVehicle ? [localVehicle] : []}
  orders={[]}
  selectedOrderId={selectedOrderId}
  onOrderSelect={handleOrderSelect}
  bearing={mapBearing}               // Для вращения карты
  isDriverMode={true}                // Включает режим водителя
  routeCoordinates={testRouteCoordinates}  // Тестовый маршрут
/>
```

---

### List (список заказов)

**Компонент**: `components/map/List.tsx`

**Отображение**:
- Заказы водителя (filteredOrders)
- Фильтрация по статусу
- Поиск по пассажиру/телефону/адресу

---

## Тестирование

### Быстрый тест (5 минут)

#### 1. Открыть страницу
```
http://localhost:3002/de/driver
```

#### 2. Открыть DevTools
- F12 → Console
- F12 → Network

#### 3. Тест с батчингом

**Шаги**:
1. Убедиться что checkbox "Batching ✅" включен
2. Разрешить GPS (или нажать "🧪 Test Route")
3. Подождать 20 секунд

**Ожидаемый результат в Console**:
```
📦 Added GPS point to batch: { batchSize: 1 }
📦 Added GPS point to batch: { batchSize: 2 }
📦 Added GPS point to batch: { batchSize: 3 }
📦 Added GPS point to batch: { batchSize: 4 }
📦 Added GPS point to batch: { batchSize: 5 }
📤 Sending GPS batch to /api/transport/location/batch
✅ Vehicle position updated (batch): { processedCount: 5 }
```

**Ожидаемый результат в Network**:
- ~3 запроса к `/api/transport/location/batch` за 20 секунд
- Каждый с payload: `{ locations: [...5 точек...] }`

#### 4. Тест без батчинга

**Шаги**:
1. Отключить checkbox "Batching ❌"
2. Подождать 20 секунд

**Ожидаемый результат в Console**:
```
⚠️ Batching disabled - clearing batch with X pending points
📤 Sending GPS immediately to /api/transport/location
✅ Vehicle position updated (immediate)
...повторяется каждые 2 сек...
```

**Ожидаемый результат в Network**:
- ~10 запросов к `/api/transport/location` за 20 секунд
- Каждый с одной точкой

#### 5. Визуальный тест

**Проверить**:
- ✅ Маркер движется плавно (НЕ прыгает)
- ✅ Карта вращается плавно (следует направлению)
- ✅ Маркер остается на позиции 80% от верха
- ✅ При переключении checkbox НЕТ визуальных изменений

---

### Автоматический тест

```bash
./scripts/test-gps-optimization.sh
```

**Скрипт**:
1. Мониторит логи vapor-api
2. Подсчитывает GPS обновления
3. Проверяет cache hits
4. Выдает отчет

**Результат**:
```
📊 Analysis Results:
===================

1. GPS Update Logs: 14
   ✅ PASS - Batching working (reduced from 69)

2. Batch Operations: 14
   ✅ PASS - Batch endpoint being used

3. OSRM Cache Hits: 48
   ✅ PASS - Cache hit ratio: 69%

4. Total OSRM Logs: 70
```

---

### Vapor-API логи (real-time)

```bash
docker logs -f vapor-api 2>&1 | grep --line-buffered -E '\[GPS|\[OSRM'
```

**С батчингом**:
```
[GPS Batch] Updated ABC-123: 5 points → (50.680220, 7.146796) snapped=true
[OSRM] Cache hit
[GPS Batch] Updated ABC-123: 5 points → (50.682983, 7.149951) snapped=true
[OSRM] Cache hit
```

**Без батчинга**:
```
[GPS] Updated ABC-123: (50.680220, 7.146796) snapped=true
[GPS] Updated ABC-123: (50.680350, 7.147100) snapped=true
[OSRM] Cache hit
[GPS] Updated ABC-123: (50.680480, 7.147404) snapped=true
...
```

---

## Технические детали

### Константы

```typescript
// GPS
const GPS_UPDATE_INTERVAL = 2000 // ms - throttle interval
const maxRealisticDist = 50      // meters - noise filter

// Batching
const BATCH_SIZE = 5             // points - when to send
const BATCH_INTERVAL = 10000     // ms - max wait time

// Interpolation
const INTERPOLATION_DURATION = 2000  // ms - marker movement
const ROTATION_DURATION = 1000       // ms - map rotation

// Vehicle tracking
const VEHICLE_POSITION_X = 0.5   // 50% from left
const VEHICLE_POSITION_Y = 0.8   // 80% from top
```

---

### Hooks используемые

```typescript
// GPS tracking
const { position, isTracking, startTracking, stopTracking } = useGeolocation()

// State management
const [batchingEnabled, setBatchingEnabled] = useState(true)
const [mapBearing, setMapBearing] = useState(0)
const [currentSpeed, setCurrentSpeed] = useState(0)
const [interpolationParams, setInterpolationParams] = useState({...})

// Refs (avoid re-renders)
const gpsBatchRef = useRef<Array<LocationPoint>>([])
const lastGPSUpdateRef = useRef<number>(0)
const previousPositionRef = useRef<{lat, lng} | null>(null)
```

---

### API Endpoints

#### Single GPS Update
```
POST /api/transport/location
```

**Request**:
```json
{
  "vehicleID": "uuid",
  "latitude": 50.680220,
  "longitude": 7.146796
}
```

**Response**:
```json
{
  "success": true,
  "vehicleID": "uuid",
  "currentLat": 50.680215,
  "currentLng": 7.146800,
  "lastLocationUpdate": "2026-03-17T05:30:00Z",
  "wasSnapped": true
}
```

---

#### Batch GPS Update
```
POST /api/transport/location/batch
```

**Request**:
```json
{
  "vehicleID": "uuid",
  "locations": [
    { "latitude": 50.680220, "longitude": 7.146796, "timestamp": "2026-03-17T05:30:00Z" },
    { "latitude": 50.680350, "longitude": 7.147100, "timestamp": "2026-03-17T05:30:02Z" },
    { "latitude": 50.680480, "longitude": 7.147404, "timestamp": "2026-03-17T05:30:04Z" },
    { "latitude": 50.680610, "longitude": 7.147708, "timestamp": "2026-03-17T05:30:06Z" },
    { "latitude": 50.680740, "longitude": 7.148012, "timestamp": "2026-03-17T05:30:08Z" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "vehicleID": "uuid",
  "processedCount": 5,
  "currentLat": 50.680735,
  "currentLng": 7.148015,
  "lastLocationUpdate": "2026-03-17T05:30:08Z",
  "wasSnapped": true
}
```

**Примечание**: Сервер обрабатывает только **последнюю точку** из batch (самую свежую по timestamp).

---

### Анимации (60 FPS)

#### Marker Interpolation
```typescript
useEffect(() => {
  if (!interpolationParams.startPos || !interpolationParams.endPos) return

  const animate = () => {
    const elapsed = Date.now() - interpolationParams.startTime
    const progress = Math.min(elapsed / interpolationParams.duration, 1)

    // Ease-out-quad
    const eased = progress * (2 - progress)

    const lat = interpolationParams.startPos.lat +
      (interpolationParams.endPos.lat - interpolationParams.startPos.lat) * eased
    const lng = interpolationParams.startPos.lng +
      (interpolationParams.endPos.lng - interpolationParams.startPos.lng) * eased

    setInterpolatedPosition({ lat, lng })

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}, [interpolationParams])
```

---

#### Map Rotation
```typescript
useEffect(() => {
  if (bearing === undefined) return

  const targetBearing = -bearing
  const startBearing = currentBearingRef.current

  // Shortest rotation path (handle 360° wrap)
  let diff = targetBearing - startBearing
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360

  const duration = 1000
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = progress * (2 - progress) // ease-out-quad

    const newBearing = startBearing + diff * easedProgress
    rotateMap.setBearing(newBearing)

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  animate()
}, [bearing])
```

---

#### Vehicle Tracking (Fixed Position)
```typescript
useEffect(() => {
  if (!isDriverMode || !vehicle.currentLat || !vehicle.currentLng) return

  const trackVehicle = () => {
    const mapSize = map.getSize()
    const vehiclePoint = map.latLngToContainerPoint([
      vehicle.currentLat,
      vehicle.currentLng
    ])

    // Target: center X, 80% Y
    const targetX = mapSize.x / 2
    const targetY = mapSize.y * 0.8

    const deltaX = vehiclePoint.x - targetX
    const deltaY = vehiclePoint.y - targetY

    // Pan if delta > 1 pixel
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      map.panBy([deltaX, deltaY], { animate: false })
    }

    requestAnimationFrame(trackVehicle)
  }

  requestAnimationFrame(trackVehicle)
}, [isDriverMode, vehicle])
```

---

### Leaflet-Rotate Integration

**Import**:
```typescript
if (typeof window !== 'undefined') {
  require('leaflet-rotate')
}
```

**MapContainer props**:
```tsx
<MapContainer
  // @ts-ignore - leaflet-rotate options
  rotate={isDriverMode}
  bearing={0}
  touchRotate={isDriverMode}
  rotateControl={isDriverMode ? { closeOnZeroBearing: false } : false}
>
```

---

## Troubleshooting

### Проблема: Маркер "прыгает"

**Причина**: Interpolation не работает

**Решение**:
1. Проверить `interpolationParams` в state
2. Проверить консоль на ошибки
3. Убедиться что `setInterpolationParams()` вызывается

---

### Проблема: Карта не вращается

**Причина**: leaflet-rotate не загружен

**Решение**:
1. Проверить консоль: `📦 leaflet-rotate required`
2. Убедиться что `require('leaflet-rotate')` выполнился
3. Проверить MapContainer props: `rotate={true}`

---

### Проблема: Батчинг не работает

**Симптомы**: Все запросы идут на `/api/transport/location`

**Решение**:
1. Проверить checkbox включен: `batchingEnabled === true`
2. Проверить консоль: должны быть `📦 Added GPS point to batch`
3. Проверить Network: должны быть запросы к `/batch`

---

### Проблема: Vapor-API unhealthy

**Причина**: curl не установлен в Docker образе

**Решение**:
```dockerfile
# vapor-api/Dockerfile
RUN apt-get update && apt-get install -y curl
```

Пересобрать образ:
```bash
cd vapor-api && docker build -t vapor-api:latest .
docker compose up -d vapor-api
```

---

## Performance Metrics

### Target Performance

| Метрика | Цель | Статус |
|---------|------|--------|
| GPS Update Frequency | 2 сек | ✅ |
| Animation FPS | 60 | ✅ |
| HTTP Requests (batch) | <20 на 69 точек | ✅ (~14) |
| DB Operations (batch) | <20 на 69 точек | ✅ (~14) |
| OSRM Cache Hit Rate | >50% | ✅ (50-80%) |
| Log Volume | <50 строк на 69 точек | ✅ (~14) |

---

### Мониторинг

**Browser DevTools**:
- Console: логи GPS/батчинга
- Network: количество запросов
- Performance: FPS анимаций

**Vapor-API**:
```bash
# Real-time logs
docker logs -f vapor-api 2>&1 | grep -E '\[GPS|\[OSRM'

# Count GPS updates
docker logs vapor-api 2>&1 | grep -c "\[GPS"

# Count cache hits
docker logs vapor-api 2>&1 | grep -c "Cache hit"
```

---

## Best Practices

### ✅ DO

- Включать батчинг в production для снижения нагрузки
- Использовать interpolation для плавного движения
- Фильтровать GPS шум (> 50м за 2 сек)
- Мониторить cache hit rate OSRM
- Проверять плавность анимации визуально

### ❌ DON'T

- Отправлять GPS чаще чем каждые 2 секунды (спам)
- Использовать `setInterval` для анимаций (вместо requestAnimationFrame)
- Забывать очищать batch при отключении батчинга
- Игнорировать GPS noise (может вызвать рывки карты)
- Пропускать snap-to-road (маркер будет "плавать" рядом с дорогой)

---

## Future Improvements

### Планируемые улучшения

1. **Adaptive Batching**
   - Динамический размер batch в зависимости от скорости
   - Быстро едешь → меньше batch (точнее трек)
   - Медленно/стоишь → больше batch (экономия)

2. **Offline Support**
   - IndexedDB для хранения batch при потере сети
   - Отправка накопленных данных при восстановлении

3. **WebSocket для real-time**
   - Замена HTTP polling на WebSocket
   - Двунаправленная связь (диспетчер → водитель)

4. **Machine Learning для GPS фильтрации**
   - Предсказание следующей позиции
   - Умная фильтрация аномалий

5. **Predictive Caching**
   - Предзагрузка OSRM данных по маршруту
   - Offline maps для областей маршрута

---

## Changelog

### v2.0.0 (2026-03-17) - GPS Optimization Release

**Added**:
- ✅ GPS Batching (опционально)
- ✅ OSRM Caching (thread-safe)
- ✅ DB Optimization (UPDATE...RETURNING)
- ✅ Logging Reduction (debug level)
- ✅ Batching toggle checkbox

**Improved**:
- ✅ Map rotation smoothness (1s ease-out-quad)
- ✅ Marker interpolation (2s ease-out-quad)
- ✅ Vehicle tracking (80% from top)

**Performance**:
- 🚀 HTTP requests: **-80%**
- 🚀 DB operations: **-90%**
- 🚀 Log volume: **-98.6%**
- 🚀 Overall load: **-85-90%**

---

## Authors & Contributors

**Driver Interface Development**:
- GPS Tracking & Optimization
- Batch Processing System
- Performance Monitoring

**Related Components**:
- `components/map/Map.tsx` - Map with rotation
- `hooks/useGeolocation.ts` - GPS tracking hook
- `vapor-api/.../VehicleLocationController.swift` - Backend GPS handling

---

## License

Proprietary - Internal Use Only

---

## Links

- [OSRM Documentation](https://project-osrm.org/docs/v5.24.0/api/)
- [Leaflet-Rotate Plugin](https://github.com/fnicollet/Leaflet.Rotate)
- [Turf.js Documentation](https://turfjs.org/docs/)
- [Web Animations Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

---

**Last Updated**: 2026-03-17
**Version**: 2.0.0
