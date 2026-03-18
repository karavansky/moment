# Console Filtering Guide

> **Quick reference** для фильтрации логов Test Route в DevTools Console

---

## 🎯 Как фильтровать логи Test Route

### В Chrome/Edge DevTools:

1. Откройте DevTools (F12)
2. Перейдите на вкладку **Console**
3. В поле фильтра (вверху) введите:

```
[Test]
```

**Результат**: Видите ТОЛЬКО логи Test Route! ✅

---

### В Firefox DevTools:

1. Откройте DevTools (F12)
2. Перейдите на вкладку **Console**
3. В поле фильтра введите:

```
[Test]
```

**Результат**: Видите ТОЛЬКО логи Test Route! ✅

---

## 📊 Примеры логов Test Route

### При запуске:
```
[Test] 🧪 Loading test route...
[Test] 🔄 Resetting GPS state...
[Test] ✅ GPS state reset complete
[Test] 🧪 Test route loaded: { name: "...", points: 70, speedKmh: 30 }
[Test] 🗺️ Route polyline set with 70 points
[Test] 🧪 Starting route playback (70 points, 2000ms interval)
```

### Во время воспроизведения:
```
[Test] 🧪 [1/70] GPS: { lat: 50.680194, lng: 7.147072 }
[Test] 🧪 ✅ Point 1 updated, wasSnapped: true
[Test] 🧪 📦 Point received: { index: 0, networkLatency: "65ms", wasSnapped: true }
[Test] 🧪 📥 GPS point added to buffer: { bufferSize: 1, bufferReady: false }
[Test] 🧪 ⏳ Buffering GPS points... waiting for 1 more points
```

### После buffer готов:
```
[Test] 🧪 ✅ Buffer ready - starting continuous animation with 2 points
[Test] 🧪 🎬 Starting interpolation: {
  from: { lat: 50.680194, lng: 7.147072 },
  to: { lat: 50.680313, lng: 7.1471 },
  duration: "1000ms",
  timeSinceLastUpdate: "1000ms",
  bufferRemaining: 1,
  expectedDuration: "2000ms"
}
```

### При завершении:
```
[Test] 🧪 ✅ Test route complete! Route cleared from map.
```

---

## 🔍 Advanced Filtering

### Показать только Test Route (без интерполяции):
```
[Test]
```

### Показать только Interpolation (анимация):
```
[Interpolation]
```

### Показать Test Route + Interpolation:
```
[Test]|[Interpolation]
```

**Примечание**: Используйте `|` (OR) для показа нескольких префиксов.

### Показать только network latency:
```
[Test] networkLatency
```

### Показать только buffer operations:
```
[Test] buffer
```

### Показать только GPS точки:
```
[Test] GPS
```

### Исключить Test Route (показать только real GPS):
```
-[Test]
```

**Примечание**: Префикс `-` означает "исключить" (работает в Chrome/Edge).

---

## 🎬 Логи интерполяции (префикс [Interpolation])

Логи интерполяции **имеют префикс `[Interpolation]`**, потому что используются **и для real GPS, и для Test Route**:

```
[Interpolation] 🎬 Starting NEW interpolation (useEffect triggered): {
  from: { lat: 50.680194, lng: 7.147072 },
  to: { lat: 50.680313, lng: 7.1471 },
  duration: 2000,
  startTime: "2026-03-18T10:30:45.123Z"
}

[Interpolation] 🛑 Cancelling previous interpolation animation (new one starting)

[Interpolation] ✅ Interpolation complete: {
  finalPosition: { lat: 50.680313, lng: 7.1471 },
  totalElapsed: "2000ms",
  expectedDuration: "2000ms"
}
```

**Чтобы увидеть ВСЕ логи (Test Route + интерполяция)**:
```
[Test]|[Interpolation]
```

---

## 📝 Checklist для отладки Test Route

Фильтруйте по `[Test]` и проверьте:

- [ ] `🔄 Resetting GPS state` - состояние сбрасывается при запуске
- [ ] `🗺️ Route polyline set` - маршрут загружен
- [ ] `Starting route playback` - воспроизведение началось
- [ ] `📦 Point received` - все точки получены от сервера
- [ ] `networkLatency` варьируется (50-200ms) - нормально!
- [ ] `📥 GPS point added to buffer` - точки добавляются в buffer
- [ ] `⏳ Buffering GPS points` - первые 2 точки буферизуются
- [ ] `✅ Buffer ready` - buffer готов после 2 точек
- [ ] `🎬 Starting interpolation` - анимация стартует для каждой точки
- [ ] `duration: "2000ms"` - всегда постоянная (кроме первой: 1000ms)
- [ ] `expectedDuration: "2000ms"` - совпадает с duration

**Без префикса `[Test]` проверьте**:
- [ ] `🎬 Starting NEW interpolation (useEffect triggered)` - для КАЖДОЙ точки
- [ ] `🛑 Cancelling previous interpolation` - старая анимация отменяется
- [ ] `✅ Interpolation complete` - totalElapsed ≈ expectedDuration

---

## 🚫 Что делать если рывки остались

1. **Проверьте duration**:
   - Фильтр: `[Test] duration`
   - Все должны быть `2000ms` (кроме первой точки: `1000ms`)

2. **Проверьте useEffect**:
   - Фильтр: `🎬 Starting NEW`
   - Должен появляться для КАЖДОЙ точки (не только для первых двух!)

3. **Проверьте cancellation**:
   - Фильтр: `🛑 Cancelling`
   - Должен появляться перед каждой новой интерполяцией

4. **Проверьте network latency**:
   - Фильтр: `[Test] networkLatency`
   - Если > 500ms → медленный интернет или OSRM проблемы

5. **Проверьте buffer**:
   - Фильтр: `[Test] bufferRemaining`
   - Должен быть `1` или `2` (НИКОГДА 0!)

---

## 📸 Screenshot Console Filter

**DevTools Console с фильтром**:

```
┌─────────────────────────────────────────────────┐
│ Console                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Filter: [Test]                        🔍    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Test] 🧪 Loading test route...                │
│ [Test] 🔄 Resetting GPS state...               │
│ [Test] ✅ GPS state reset complete             │
│ [Test] 🧪 Test route loaded: {...}             │
│ [Test] 🗺️ Route polyline set with 70 points    │
│ [Test] 🧪 Starting route playback...           │
│ [Test] 🧪 [1/70] GPS: {...}                    │
│ [Test] 🧪 📦 Point received: {...}             │
│ [Test] 🧪 📥 GPS point added to buffer: {...}  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

**Last updated:** 2026-03-18
**Related files:**
- [page.tsx](./page.tsx) - Test Route implementation
- [TEST_ROUTE_DEBUG.md](./TEST_ROUTE_DEBUG.md) - Debugging guide
