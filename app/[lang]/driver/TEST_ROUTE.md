# Test Route - Demo Mode Documentation

> **Тестовый маршрут для демонстрации GPS навигации водителя**

---

## 🎯 Назначение

**Test Route** - это встроенный демонстрационный режим, который симулирует реальное движение водителя по маршруту без необходимости физического перемещения.

### Использование:

1. **Демонстрация клиентам** - показать работу системы без выезда на улицу
2. **Тестирование функционала** - проверить GPS tracking, bearing, snap-to-road
3. **Отладка производительности** - нагрузочное тестирование с контролируемыми данными
4. **Обучение водителей** - показать интерфейс без реальной поездки

---

## 📁 Файлы Test Route

### `/public/test-routes/burgstrasse-route.json`

```json
{
  "name": "Burgstrasse Test Route",
  "description": "Test route along Burgstrasse in Bonn",
  "speedKmh": 30,
  "updateIntervalMs": 2000,
  "points": [
    { "lat": 50.6802196, "lng": 7.1467959 },
    { "lat": 50.6829828, "lng": 7.1499507 },
    ...
  ]
}
```

**Поля:**
- `name` - Название маршрута
- `description` - Описание
- `speedKmh` - Целевая скорость (для расчета bearing)
- `updateIntervalMs` - Интервал между точками (мс)
- `points[]` - Массив GPS координат

---

## 🚀 Как работает Test Route

### Архитектура:

```
┌─────────────────┐
│ Test Route      │
│ Button Click    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 1. Load JSON from /test-routes/         │
│    - Parse route points                 │
│    - Set updateInterval                 │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 2. setInterval Loop                     │
│    - Send point to /api/transport/      │
│      location (real API call!)          │
│    - Calculate bearing from prev point  │
│    - Calculate speed                    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 3. Server Processing                    │
│    - GPS validation                     │
│    - Snap-to-road (OSRM)                │
│    - Save to DB                         │
│    - Return snapped coordinates         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 4. GPS Buffering (Client)               │
│    - Add to gpsBufferRef                │
│    - Wait for BUFFER_SIZE (2 points)    │
│    - Pop oldest point from buffer       │
│    - Calculate dynamic duration         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 5. Smooth Interpolation                 │
│    - requestAnimationFrame (60 FPS)     │
│    - Ease-out-quad easing               │
│    - Map rotation to bearing            │
│    - Vehicle tracking at 80% from top   │
└─────────────────────────────────────────┘
```

---

## 🔧 Технические детали

### 1. Загрузка маршрута

```typescript
const response = await fetch('/test-routes/burgstrasse-route.json')
const route = await response.json()

console.log('🧪 Test route loaded:', {
  name: route.name,
  points: route.points.length,
  speedKmh: route.speedKmh,
})
```

### 2. Отправка точек на сервер

```typescript
const testInterval = setInterval(() => {
  const currentPoint = route.points[currentIndex]

  // Реальный API call (не mock!)
  fetch('/api/transport/location', {
    method: 'POST',
    body: JSON.stringify({
      vehicleID: localVehicle.id,
      latitude: currentPoint.lat,
      longitude: currentPoint.lng,
    }),
  })
}, updateInterval)
```

**ВАЖНО:** Test Route использует **настоящий API** - точки проходят через:
- ✅ Server-side GPS validation
- ✅ OSRM snap-to-road
- ✅ Database UPDATE
- ✅ Те же самые оптимизации (кеш, батчинг)

### 3. Буферизация GPS (как real GPS)

```typescript
// Добавляем в буфер
gpsBufferRef.current.push({
  lat: newLat,
  lng: newLng,
  timestamp: Date.now(),
})

// Ждём 2 точки перед стартом
if (!isBufferReadyRef.current && gpsBufferRef.current.length < BUFFER_SIZE) {
  console.log('🧪 ⏳ Buffering GPS points...')
  return
}

// Берём следующую точку из буфера
const targetPoint = gpsBufferRef.current.shift()!
```

### 4. Динамическая интерполяция

```typescript
const timeSinceLastUpdate = currentTime - lastGPSTimestampRef.current
const interpolationDuration = Math.min(timeSinceLastUpdate, 10000)

setInterpolationParams({
  startPos: currentPos,
  endPos: { lat: targetPoint.lat, lng: targetPoint.lng },
  duration: interpolationDuration,  // Адаптивная!
})
```

---

## 📊 Сравнение: Test Route vs Real GPS

| Аспект | Test Route | Real GPS |
|--------|-----------|----------|
| **Источник координат** | JSON файл | `navigator.geolocation` |
| **Интервал обновлений** | Фиксированный (2000ms) | Нерегулярный (1-6 сек) |
| **API calls** | ✅ Да (настоящие) | ✅ Да (настоящие) |
| **Server validation** | ✅ Да | ✅ Да |
| **Snap-to-road** | ✅ Да | ✅ Да |
| **GPS buffering** | ✅ Да | ✅ Да |
| **Smooth interpolation** | ✅ Да | ✅ Да |
| **Map rotation** | ✅ Да | ✅ Да |
| **DB updates** | ✅ Да | ✅ Да |

**Вывод:** Test Route - это **100% идентичная симуляция** реального GPS!

---

## 🎬 Demo Mode (будущая функциональность)

### Планируемые улучшения:

1. **Библиотека маршрутов**
   ```
   /test-routes/
     - city-center-bonn.json
     - highway-autobahn.json
     - residential-area.json
     - complex-turns.json
   ```

2. **UI для выбора маршрута**
   ```typescript
   <Select label="Demo Route">
     <Option value="burgstrasse">Burgstrasse (5 км, 10 мин)</Option>
     <Option value="city-center">City Center (8 км, 15 мин)</Option>
     <Option value="highway">Highway (20 км, 12 мин)</Option>
   </Select>
   ```

3. **Настройки скорости**
   ```typescript
   <Slider
     label="Playback Speed"
     min={0.5}
     max={3.0}
     step={0.5}
     value={playbackSpeed}
   />
   ```

4. **Контроллер воспроизведения**
   ```
   [▶ Play] [⏸ Pause] [⏹ Stop] [⏮ Reset] [⏭ Skip]
   ```

5. **Статистика маршрута**
   ```
   Distance: 5.2 km
   Duration: 8:32
   Avg Speed: 36 km/h
   Max Speed: 52 km/h
   Points: 156
   ```

---

## 🧪 Как создать свой Test Route

### Шаг 1: Соберите GPS координаты

**Вариант A: Ручной сбор**
```typescript
const points = [
  { lat: 50.6802196, lng: 7.1467959 },
  { lat: 50.6829828, lng: 7.1499507 },
  // ...
]
```

**Вариант B: Запись реальной поездки**
```typescript
// Включить запись во время реальной поездки
const recordedPoints = []
watchPosition((pos) => {
  recordedPoints.push({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  })
})
```

**Вариант C: Использовать OSRM Route API**
```bash
curl "http://osrm:5000/route/v1/driving/7.14679,50.68022;7.14995,50.68298?steps=true&geometries=geojson"
```

### Шаг 2: Создайте JSON файл

```json
{
  "name": "My Custom Route",
  "description": "Route from A to B",
  "speedKmh": 30,
  "updateIntervalMs": 2000,
  "points": [
    { "lat": 50.xxx, "lng": 7.xxx },
    ...
  ]
}
```

### Шаг 3: Сохраните в `/public/test-routes/`

```bash
/public/test-routes/
  - my-custom-route.json
```

### Шаг 4: Загрузите в UI

```typescript
const response = await fetch('/test-routes/my-custom-route.json')
const route = await response.json()
```

---

## 🐛 Troubleshooting

### Проблема: "Прыжки" при воспроизведении

**Причина 1:** Недостаточно точек в буфере
```typescript
// Проверьте BUFFER_SIZE
const BUFFER_SIZE = 2  // Должно быть минимум 2
```

**Причина 2:** Слишком большой интервал между точками
```json
{
  "updateIntervalMs": 10000  // ❌ Слишком много! Используйте 1000-3000
}
```

**Причина 3:** Точки слишком далеко друг от друга
```typescript
// Расстояние между точками должно быть 20-50 метров
// Если больше - добавьте промежуточные точки
```

### Проблема: Карта не поворачивается

**Проверьте:**
```typescript
// Расстояние > 3 метров между точками?
if (dist > 3.0) {
  bearing = calculateBearing(...)
}
```

### Проблема: Слишком быстрое/медленное воспроизведение

**Настройте:**
```json
{
  "updateIntervalMs": 2000,  // Увеличьте/уменьшите
  "speedKmh": 30             // Используется только для логов
}
```

---

## 📈 Производительность

### Нагрузка от Test Route:

**За 1 минуту (30 точек):**
```
HTTP requests: 30
DB operations: 30 UPDATE
OSRM calls: ~15 (50% cache hit)
Network: ~90 KB upload, ~30 KB download
```

**Сравнение с real GPS:**
- ✅ Идентичная нагрузка
- ✅ Те же оптимизации работают
- ✅ Можно тестировать масштабирование

---

## 🔮 Roadmap

### v1.0 (текущая)
- ✅ Базовое воспроизведение JSON маршрута
- ✅ Интеграция с real API
- ✅ GPS buffering
- ✅ Smooth interpolation

### v1.1 (планируется)
- ⏳ Библиотека предустановленных маршрутов
- ⏳ UI селектор маршрутов
- ⏳ Playback controls (play/pause/stop)

### v1.2 (планируется)
- ⏳ Настройка скорости воспроизведения
- ⏳ Запись реальных поездок в JSON
- ⏳ Импорт GPX/KML файлов

### v2.0 (будущее)
- ⏳ Multi-driver simulation (несколько водителей одновременно)
- ⏳ Генерация маршрутов по адресам (OSRM integration)
- ⏳ Analytics dashboard (статистика маршрутов)

---

## 📚 См. также

- [Driver UI README](./README.md) - Общая документация интерфейса водителя
- [GPS_TRACKING_ARCHITECTURE.md](../../../websocket/GPS_TRACKING_ARCHITECTURE.md) - Архитектура GPS трекинга
- [WEBSOCKET-INTEGRATION.md](../../../websocket/WEBSOCKET-INTEGRATION.md) - WebSocket integration для масштаба

---

**Last updated:** 2026-03-18
**Maintainer:** См. git log для истории изменений
