# Test Route - Debug Analysis

> **Problem**: Jerky movement (прыжки/рывки) при воспроизведении test route, несмотря на имплементацию GPS buffering

---

## 🐛 Симптомы

1. **Visual jerks** - машина "прыгает" между точками вместо плавного движения
2. **Console logs** показывают buffering работает (buffer fills to 2 points)
3. **Real GPS** работает плавно с тем же buffering кодом

---

## 🔍 Root Cause Analysis

### Текущая реализация Test Route

```typescript
// app/[lang]/driver/page.tsx:785-925

const testInterval = setInterval(() => {
  const currentPoint = route.points[currentIndex]

  // Send GPS point to server (real API call)
  fetch('/api/transport/location', {
    method: 'POST',
    body: JSON.stringify({
      vehicleID: localVehicle.id,
      latitude: currentPoint.lat,
      longitude: currentPoint.lng,
    }),
  })
    .then(res => res.json())
    .then(data => {
      const { currentLat: newLat, currentLng: newLng } = data

      // Add to buffer (SAME as real GPS)
      gpsBufferRef.current.push({
        lat: newLat,
        lng: newLng,
        timestamp: Date.now(),
      })

      // Wait for BUFFER_SIZE points
      if (!isBufferReadyRef.current && gpsBufferRef.current.length < BUFFER_SIZE) {
        console.log('🧪 ⏳ Buffering GPS points...')
        setLocalVehicle(prev => prev ? {
          ...prev,
          currentLat: newLat,
          currentLng: newLng,
        } : null)
        return
      }

      // Start animation
      const targetPoint = gpsBufferRef.current.shift()!

      // Calculate dynamic duration
      const currentTime = Date.now()
      const timeSinceLastUpdate = lastGPSTimestampRef.current > 0
        ? currentTime - lastGPSTimestampRef.current
        : GPS_UPDATE_INTERVAL

      const interpolationDuration = Math.min(timeSinceLastUpdate, 10000)
      lastGPSTimestampRef.current = currentTime // ← CRITICAL!

      setInterpolationParams({
        startPos: currentPos,
        endPos: { lat: targetPoint.lat, lng: targetPoint.lng },
        duration: interpolationDuration,
      })
    })

  currentIndex++
}, updateInterval) // 2000ms
```

### Проблема #1: Timing между setInterval и fetch completion

**Expected behavior:**
```
t=0ms     → setInterval fires → send point 0
t=50ms    → fetch completes → buffer.push(point 0)
t=2000ms  → setInterval fires → send point 1
t=2050ms  → fetch completes → buffer.push(point 1)
          → duration = 2050 - 50 = 2000ms ✅
```

**Actual behavior (с network jitter):**
```
t=0ms     → setInterval fires → send point 0
t=50ms    → fetch completes → buffer.push(point 0)
t=2000ms  → setInterval fires → send point 1
t=2250ms  → fetch completes (slow!) → buffer.push(point 1)
          → duration = 2250 - 50 = 2200ms ❌
t=2200ms  → animation from point 0 → point 1 STILL RUNNING!
t=4000ms  → setInterval fires → send point 2
t=4050ms  → fetch completes → buffer.push(point 2)
          → duration = 4050 - 2250 = 1800ms ❌ (too short!)
          → JERK! Animation finishes 200ms early, then jumps to next point
```

### Проблема #2: Buffer не сбрасывается при старте Test Route

```typescript
// Когда нажимаем "Test Route" кнопку второй раз:

// 1. Buffer может содержать old points from previous run
console.log('🧪 Buffer before start:', gpsBufferRef.current.length) // может быть 1-2 точки!

// 2. isBufferReadyRef может быть true from previous run
console.log('🧪 isBufferReady:', isBufferReadyRef.current) // true!

// 3. lastGPSTimestampRef содержит timestamp from previous run
console.log('🧪 lastGPSTimestamp:', lastGPSTimestampRef.current) // old timestamp!

// Результат: первая точка может иметь ОГРОМНЫЙ duration!
```

### Проблема #3: Server-side OSRM snap-to-road вариативность

```swift
// VehicleLocationController.swift:227-232

if let snapped = try await snapToRoad(lat: body.latitude, lng: body.longitude, osrmURL: osrmURL, req: req) {
    finalLat = snapped.lat
    finalLng = snapped.lng
    wasSnapped = true
}
```

**Timing вариативность**:
- **Cache hit** (50% случаев): 5-10ms
- **Cache miss** (50% случаев): 50-200ms (OSRM API call)

**Эффект на animation**:
```
Point 0: OSRM cache hit  → 10ms  → total fetch time: 60ms
Point 1: OSRM cache miss → 150ms → total fetch time: 200ms
Point 2: OSRM cache hit  → 10ms  → total fetch time: 60ms

Durations:
- Point 0 → Point 1: 2200 - 60 = 2140ms (animation too long!)
- Point 1 → Point 2: 2060 - 2200 = -140ms (negative! defaults to GPS_UPDATE_INTERVAL)

Результат: JERK!
```

---

## 🎯 Solutions

### Solution 1: Reset state при старте Test Route (RECOMMENDED)

```typescript
// В onClick handler для Test Route кнопки:

async () => {
  console.log('🧪 Starting Test Route - resetting state...')

  // 1. Clear GPS buffer
  gpsBufferRef.current = []
  console.log('🧪 ✅ Buffer cleared')

  // 2. Reset buffer ready flag
  isBufferReadyRef.current = false
  console.log('🧪 ✅ Buffer ready flag reset')

  // 3. Reset last timestamp
  lastGPSTimestampRef.current = 0
  console.log('🧪 ✅ Timestamp reset')

  // 4. Clear interpolation params (stop any ongoing animation)
  setInterpolationParams(null)
  console.log('🧪 ✅ Interpolation cleared')

  // 5. Clear previous interval (if exists)
  if (testIntervalRef.current) {
    clearInterval(testIntervalRef.current)
    testIntervalRef.current = null
    console.log('🧪 ✅ Previous interval cleared')
  }

  // NOW load and start test route
  try {
    const response = await fetch('/test-routes/burgstrasse-route.json')
    const route = await response.json()

    // ... rest of the code ...
  }
}
```

### Solution 2: Track setInterval fire time, not fetch completion time

```typescript
const testInterval = setInterval(() => {
  const intervalFireTime = Date.now() // ← Capture WHEN interval fired, not when fetch completed

  const currentPoint = route.points[currentIndex]

  fetch('/api/transport/location', {
    method: 'POST',
    body: JSON.stringify({
      vehicleID: localVehicle.id,
      latitude: currentPoint.lat,
      longitude: currentPoint.lng,
    }),
  })
    .then(res => res.json())
    .then(data => {
      const { currentLat: newLat, currentLng: newLng } = data

      // Add to buffer WITH interval fire time (not fetch completion time!)
      gpsBufferRef.current.push({
        lat: newLat,
        lng: newLng,
        timestamp: intervalFireTime, // ← Use interval fire time!
      })

      // ... rest of the code ...

      // Calculate duration using interval fire times (not fetch completion times)
      const currentTime = intervalFireTime // ← Use interval fire time!
      const timeSinceLastUpdate = lastGPSTimestampRef.current > 0
        ? currentTime - lastGPSTimestampRef.current
        : GPS_UPDATE_INTERVAL

      const interpolationDuration = Math.min(timeSinceLastUpdate, 10000)
      lastGPSTimestampRef.current = currentTime // ← Save interval fire time!

      console.log('🧪 🎬 Interpolation:', {
        duration: `${interpolationDuration}ms`,
        lastUpdate: new Date(lastGPSTimestampRef.current).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        delta: timeSinceLastUpdate,
      })
    })
}, updateInterval)
```

**Почему это работает**:
- `setInterval` fires **precisely** every 2000ms (controlled by browser event loop)
- Fetch completion time **varies** (network, OSRM cache)
- Using interval fire time → **constant 2000ms durations** → smooth animation!

### Solution 3: Add "Stop Test Route" button

```typescript
// Store interval ref
const testIntervalRef = useRef<NodeJS.Timeout | null>(null)

// Start button
<button onClick={async () => {
  // ... start logic from Solution 1 ...

  const testInterval = setInterval(() => { ... }, updateInterval)
  testIntervalRef.current = testInterval // ← Store ref
}}>
  🧪 Test Route
</button>

// Stop button
<button onClick={() => {
  if (testIntervalRef.current) {
    clearInterval(testIntervalRef.current)
    testIntervalRef.current = null

    // Reset state
    gpsBufferRef.current = []
    isBufferReadyRef.current = false
    lastGPSTimestampRef.current = 0
    setInterpolationParams(null)

    console.log('🧪 🛑 Test Route stopped')
  }
}} className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600">
  🛑 Stop
</button>
```

---

## 🧪 Debugging Test Route

### Console logs для диагностики

```typescript
// В Test Route fetch handler, добавить детальные логи:

.then(data => {
  const fetchCompleteTime = Date.now()
  const networkLatency = fetchCompleteTime - intervalFireTime

  console.log('🧪 📦 Point received:', {
    index: currentIndex,
    point: { lat: newLat, lng: newLng },
    wasSnapped: data.wasSnapped,
    networkLatency: `${networkLatency}ms`,
    intervalFireTime: new Date(intervalFireTime).toISOString(),
    fetchCompleteTime: new Date(fetchCompleteTime).toISOString(),
  })

  // After calculating interpolationDuration:
  console.log('🧪 ⏱️ Timing:', {
    timeSinceLastUpdate: `${timeSinceLastUpdate}ms`,
    interpolationDuration: `${interpolationDuration}ms`,
    bufferSize: gpsBufferRef.current.length,
    isBufferReady: isBufferReadyRef.current,
  })
})
```

### Что смотреть в console:

1. **Network latency consistency**:
   ```
   🧪 📦 Point 0: networkLatency: 60ms
   🧪 📦 Point 1: networkLatency: 180ms  ← OSRM cache miss!
   🧪 📦 Point 2: networkLatency: 55ms
   ```
   If latency varies wildly (50ms → 200ms), это причина jerks.

2. **Interpolation duration consistency**:
   ```
   🧪 ⏱️ Point 0 → Point 1: duration: 2000ms ✅
   🧪 ⏱️ Point 1 → Point 2: duration: 2000ms ✅
   🧪 ⏱️ Point 2 → Point 3: duration: 1800ms ❌ TOO SHORT!
   ```
   Duration should be **constant 2000ms** (matching updateIntervalMs).

3. **Buffer behavior**:
   ```
   🧪 📥 Buffer size: 0 → waiting...
   🧪 📥 Buffer size: 1 → waiting...
   🧪 📥 Buffer size: 2 → READY! ✅
   🧪 📥 Buffer size: 1 (after shift) → animating...
   🧪 📥 Buffer size: 2 (new point arrived) → ready for next
   ```
   Buffer should **NEVER drop to 0** after initial fill (causes jerks!).

---

## 🎬 Recommended Fix (Final)

Combine **Solution 1 + Solution 2** для best results:

```typescript
// State ref для interval
const testIntervalRef = useRef<NodeJS.Timeout | null>(null)

// Test Route button onClick:
async () => {
  console.log('🧪 🚀 Starting Test Route...')

  // SOLUTION 1: Reset state
  if (testIntervalRef.current) {
    clearInterval(testIntervalRef.current)
    testIntervalRef.current = null
  }

  gpsBufferRef.current = []
  isBufferReadyRef.current = false
  lastGPSTimestampRef.current = 0
  setInterpolationParams(null)

  console.log('🧪 ✅ State reset complete')

  // Load route
  const response = await fetch('/test-routes/burgstrasse-route.json')
  const route = await response.json()

  const { speedKmh, updateIntervalMs: updateInterval, points } = route
  let currentIndex = 0

  // SOLUTION 2: Track interval fire time
  const testInterval = setInterval(() => {
    if (currentIndex >= points.length) {
      clearInterval(testInterval)
      console.log('🧪 ✅ Route complete')
      return
    }

    const intervalFireTime = Date.now() // ← SOLUTION 2

    const currentPoint = points[currentIndex]

    fetch('/api/transport/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleID: localVehicle.id,
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
      }),
    })
      .then(res => res.json())
      .then(data => {
        const { currentLat: newLat, currentLng: newLng } = data

        // Use intervalFireTime instead of Date.now()
        gpsBufferRef.current.push({
          lat: newLat,
          lng: newLng,
          timestamp: intervalFireTime, // ← SOLUTION 2
        })

        if (!isBufferReadyRef.current && gpsBufferRef.current.length < BUFFER_SIZE) {
          console.log('🧪 ⏳ Buffering... waiting for', BUFFER_SIZE - gpsBufferRef.current.length, 'more points')
          setLocalVehicle(prev => prev ? { ...prev, currentLat: newLat, currentLng: newLng } : null)
          return
        }

        if (!isBufferReadyRef.current) {
          console.log('🧪 ✅ Buffer ready!')
          isBufferReadyRef.current = true
        }

        const targetPoint = gpsBufferRef.current.shift()!

        // Calculate duration using intervalFireTime
        const timeSinceLastUpdate = lastGPSTimestampRef.current > 0
          ? intervalFireTime - lastGPSTimestampRef.current
          : GPS_UPDATE_INTERVAL

        const interpolationDuration = Math.min(timeSinceLastUpdate, 10000)
        lastGPSTimestampRef.current = intervalFireTime // ← SOLUTION 2

        console.log('🧪 🎬 Interpolation:', {
          from: localVehicle ? { lat: localVehicle.currentLat, lng: localVehicle.currentLng } : null,
          to: { lat: targetPoint.lat, lng: targetPoint.lng },
          duration: `${interpolationDuration}ms`,
          bufferRemaining: gpsBufferRef.current.length,
        })

        setLocalVehicle(prev => {
          const currentPos = prev && prev.currentLat && prev.currentLng
            ? { lat: prev.currentLat, lng: prev.currentLng }
            : { lat: targetPoint.lat, lng: targetPoint.lng }

          setInterpolationParams({
            startPos: currentPos,
            endPos: { lat: targetPoint.lat, lng: targetPoint.lng },
            startTime: Date.now(),
            duration: interpolationDuration,
          })

          return prev ? { ...prev, lastLocationUpdate: new Date() } : null
        })
      })
      .catch(err => console.error('🧪 ❌ Error:', err))

    currentIndex++
  }, updateInterval)

  testIntervalRef.current = testInterval
  console.log(`🧪 ✅ Route started: ${points.length} points, ${updateInterval}ms interval`)
}
```

---

## 📊 Expected Results

### Before fix:
```
🧪 Point 0: duration=1000ms (default GPS_UPDATE_INTERVAL)
🧪 Point 1: duration=2200ms (too long due to network jitter)
🧪 Point 2: duration=1800ms (too short - compensating)
🧪 Point 3: duration=2300ms (too long again)

Result: JERKY! ❌
```

### After fix:
```
🧪 Point 0: duration=2000ms (exact updateIntervalMs)
🧪 Point 1: duration=2000ms (exact updateIntervalMs)
🧪 Point 2: duration=2000ms (exact updateIntervalMs)
🧪 Point 3: duration=2000ms (exact updateIntervalMs)

Result: SMOOTH! ✅
```

---

## 🔗 Related Files

- [page.tsx:785-925](./page.tsx#L785-L925) - Test Route implementation
- [TEST_ROUTE.md](./TEST_ROUTE.md) - Test Route documentation
- [VehicleLocationController.swift](../../../vapor-api/Sources/App/Controllers/VehicleLocationController.swift) - Server-side GPS validation
- [burgstrasse-route.json](../../../public/test-routes/burgstrasse-route.json) - Test route data

---

## ✅ Fix Applied (2026-03-18)

### Changes Made

**File**: [page.tsx:765-925](./page.tsx#L765-L925)

**Fix #1**: Reset GPS state before starting Test Route
```typescript
// Lines 770-780: Added state reset
console.log('🧪 🔄 Resetting GPS state...')
gpsBufferRef.current = []
isBufferReadyRef.current = false
lastGPSTimestampRef.current = 0
setInterpolationParams({
  startPos: null,
  endPos: null,
  startTime: null,
  duration: GPS_UPDATE_INTERVAL,
})
console.log('🧪 ✅ GPS state reset complete')
```

**Fix #2**: Capture interval fire time (not fetch completion time)
```typescript
// Line 799: Capture when setInterval fires
const intervalFireTime = Date.now()

// Line 871: Use intervalFireTime for buffer timestamp
gpsBufferRef.current.push({
  lat: newLat,
  lng: newLng,
  timestamp: intervalFireTime, // ← Not Date.now()!
})

// Lines 904-909: Use intervalFireTime for duration calculation
const timeSinceLastUpdate = lastGPSTimestampRef.current > 0
  ? intervalFireTime - lastGPSTimestampRef.current
  : GPS_UPDATE_INTERVAL

const interpolationDuration = Math.min(timeSinceLastUpdate, 10000)
lastGPSTimestampRef.current = intervalFireTime // ← Save interval fire time!
```

**Fix #3**: Added network latency logging
```typescript
// Lines 858-865: Monitor network performance
const fetchCompleteTime = Date.now()
const networkLatency = fetchCompleteTime - intervalFireTime

console.log('🧪 📦 Point received:', {
  index: currentIndex,
  networkLatency: `${networkLatency}ms`,
  wasSnapped: data.wasSnapped,
})
```

**Fix #4**: Enhanced interpolation logging
```typescript
// Lines 918-925: Detailed debug output
console.log('🧪 🎬 Starting interpolation:', {
  from: currentPos,
  to: { lat: targetPoint.lat, lng: targetPoint.lng },
  duration: `${interpolationDuration}ms`,
  timeSinceLastUpdate: `${timeSinceLastUpdate}ms`,
  bufferRemaining: gpsBufferRef.current.length,
  expectedDuration: `${updateInterval}ms`, // Should match duration!
})
```

### Expected Console Output (After Fix)

```
🧪 Loading test route...
🧪 🔄 Resetting GPS state...
🧪 ✅ GPS state reset complete
🧪 Test route loaded: { name: "...", points: 70, speedKmh: 30 }
🧪 Starting route playback (70 points, 2000ms interval)

🧪 📦 Point received: { index: 0, networkLatency: "65ms", wasSnapped: true }
🧪 📥 GPS point added to buffer: { bufferSize: 1, bufferReady: false }
🧪 ⏳ Buffering GPS points... waiting for 1 more points

🧪 📦 Point received: { index: 1, networkLatency: "158ms", wasSnapped: false }
🧪 📥 GPS point added to buffer: { bufferSize: 2, bufferReady: false }
🧪 ✅ Buffer ready - starting continuous animation with 2 points
🧪 🎬 Starting interpolation: {
  from: { lat: 50.680194, lng: 7.147072 },
  to: { lat: 50.680313, lng: 7.1471 },
  duration: "1000ms",                    ← First point uses GPS_UPDATE_INTERVAL
  timeSinceLastUpdate: "1000ms",
  bufferRemaining: 1,
  expectedDuration: "2000ms"
}

🧪 📦 Point received: { index: 2, networkLatency: "72ms", wasSnapped: true }
🧪 📥 GPS point added to buffer: { bufferSize: 2, bufferReady: true }
🧪 🎬 Starting interpolation: {
  from: { lat: 50.680313, lng: 7.1471 },
  to: { lat: 50.680488, lng: 7.147129 },
  duration: "2000ms",                    ← ✅ CONSISTENT 2000ms!
  timeSinceLastUpdate: "2000ms",
  bufferRemaining: 1,
  expectedDuration: "2000ms"             ← ✅ MATCHES!
}

🧪 📦 Point received: { index: 3, networkLatency: "145ms", wasSnapped: false }
🧪 📥 GPS point added to buffer: { bufferSize: 2, bufferReady: true }
🧪 🎬 Starting interpolation: {
  from: { lat: 50.680488, lng: 7.147129 },
  to: { lat: 50.680698, lng: 7.147175 },
  duration: "2000ms",                    ← ✅ STILL 2000ms!
  timeSinceLastUpdate: "2000ms",
  bufferRemaining: 1,
  expectedDuration: "2000ms"             ← ✅ MATCHES!
}
```

**Ключевые метрики**:
- ✅ `networkLatency` варьируется (65ms, 158ms, 72ms, 145ms) - нормально!
- ✅ `duration` **постоянная** (2000ms) - независимо от network latency!
- ✅ `expectedDuration` всегда совпадает с `duration`
- ✅ Плавное движение БЕЗ рывков!

### Fix #5: useEffect dependency array (CRITICAL!)

**Проблема #1**: useEffect зависел только от `startTime`, но не от `startPos/endPos/duration`

**Проблема #2**: Зависимость от объекта `interpolationParams` не работает - React сравнивает по reference!

**Что происходило**:
1. `setInterpolationParams({ startPos: A, endPos: B, startTime: 100, duration: 2000 })`
2. useEffect **НЕ перезапускается**, потому что:
   - `interpolationParams` - это **тот же объект** (reference не изменился)
   - React использует `Object.is(old, new)` → `true`
3. Старая анимация продолжает выполняться
4. **РЫВОК**!

**Решение** ([page.tsx:214-221](./page.tsx#L214-L221)):
```typescript
// ❌ ДО (version 1):
}, [interpolationParams.startTime])

// ❌ ДО (version 2):
}, [interpolationParams]) // НЕ работает - сравнивает по reference!

// ✅ ПОСЛЕ (FINAL):
}, [
  interpolationParams.startTime,
  interpolationParams.startPos?.lat,
  interpolationParams.startPos?.lng,
  interpolationParams.endPos?.lat,
  interpolationParams.endPos?.lng,
  interpolationParams.duration
]) // Зависим от PRIMITIVE values (lat/lng numbers)!
```

**Эффект**:
- Каждое изменение `interpolationParams` → `useEffect` перезапускается
- Старая анимация **отменяется** (cancelAnimationFrame)
- Новая анимация **сразу стартует** с правильными координатами
- **НЕТ рывков!**

**Дополнительно добавлено**:
```typescript
// Lines 161-166: Log when new interpolation starts
console.log('🎬 Starting NEW interpolation (useEffect triggered):', {
  from: interpolationParams.startPos,
  to: interpolationParams.endPos,
  duration: interpolationParams.duration,
})

// Lines 209-212: Log when previous animation is cancelled
return () => {
  if (animationFrameId) {
    console.log('🛑 Cancelling previous interpolation animation (new one starting)')
    cancelAnimationFrame(animationFrameId)
  }
}
```

---

### Testing Checklist

- [ ] Запустить Test Route первый раз
- [ ] Проверить в console: все `duration` должны быть `2000ms`
- [ ] Проверить в console: `🎬 Starting NEW interpolation` появляется для КАЖДОЙ точки
- [ ] Проверить в console: `🛑 Cancelling previous interpolation` появляется перед каждой новой анимацией
- [ ] Проверить в console: `✅ Interpolation complete` показывает `totalElapsed ≈ expectedDuration`
- [ ] Визуально проверить: движение плавное, БЕЗ рывков
- [ ] Запустить Test Route второй раз (проверить reset state)
- [ ] Мониторить `networkLatency`: должна варьироваться (50-200ms), но не влиять на duration

---

## 🔍 Console Filtering (NEW!)

**Все логи Test Route имеют префикс `[Test]`** для удобной фильтрации!

### Как фильтровать в DevTools:

1. Откройте DevTools (F12) → Console
2. В поле фильтра введите: `[Test]`
3. **Результат**: Видите ТОЛЬКО Test Route логи! ✅

### Пример отфильтрованных логов:

```
[Test] 🧪 Loading test route...
[Test] 🔄 Resetting GPS state...
[Test] ✅ GPS state reset complete
[Test] 🧪 Test route loaded: { name: "...", points: 70 }
[Test] 🗺️ Route polyline set with 70 points
[Test] 🧪 Starting route playback (70 points, 2000ms interval)
[Test] 🧪 [1/70] GPS: { lat: 50.680194, lng: 7.147072 }
[Test] 🧪 📦 Point received: { index: 0, networkLatency: "65ms" }
[Test] 🧪 📥 GPS point added to buffer: { bufferSize: 1 }
[Test] 🧪 🎬 Starting interpolation: { duration: "2000ms", ... }
```

### Advanced filters:

- **Только network latency**: `[Test] networkLatency`
- **Только interpolation**: `[Test] interpolation`
- **Только buffer operations**: `[Test] buffer`
- **Исключить Test Route** (показать real GPS): `-[Test]`

**Полная документация**: [CONSOLE_FILTER_GUIDE.md](./CONSOLE_FILTER_GUIDE.md)

---

**Last updated:** 2026-03-18
**Status:** ✅ All fixes applied + Console filtering added!
