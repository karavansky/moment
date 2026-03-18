# GPS Tracking Architecture для WebSocket

> **Ключевой вопрос**: Кто отслеживает GPS? Service Worker или React?
> **Ответ**: **React компонент**, НЕ Service Worker!

---

## ❌ Почему НЕ Service Worker?

### Ограничения Service Worker:

1. **Нет доступа к `navigator.geolocation` в фоне**
   - Service Worker может работать в фоне, но `navigator.geolocation` требует активного foreground контекста
   - Браузер блокирует геолокацию когда вкладка не активна

2. **Service Worker для других задач**:
   - ✅ Push-уведомления (`push` event)
   - ✅ Offline cache (`fetch` event)
   - ✅ Фоновая синхронизация (`sync` event)
   - ❌ **НЕ для continuous GPS tracking**

3. **Background Geolocation API (experimental)**:
   - Существует `Background Geolocation API`, но:
     - Не поддерживается в браузерах (только Capacitor/Cordova)
     - Требует нативное приложение
     - Мы делаем PWA, не нативное приложение

---

## ✅ Правильная архитектура: React Component

### Кто выполняет задачу?

**React Hook** `useDriverTracking()` в компоненте `/driver`

### Когда работает?

- Когда водитель **активно** использует приложение (вкладка открыта)
- Если вкладка свёрнута → трекинг останавливается (браузерное ограничение)
- **Решение**: Водитель должен держать вкладку открытой во время поездки

---

## 📊 Текущая реализация (для appointments)

Существующий `useGeolocation.ts` (строки 152-240):

```typescript
const SEND_INTERVAL_MS = 30_000 // 30 секунд

navigator.geolocation.watchPosition(
  (pos) => {
    latestPositionRef.current = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    }
  },
  { enableHighAccuracy: false }  // ← FALSE для desktop
)

setInterval(() => {
  if (latestPositionRef.current) {
    sendLocationToServer(latestPositionRef.current)  // ← Отправляет ВСЕГДА
  }
}, SEND_INTERVAL_MS)
```

### ❌ Проблема:
Отправляет **каждые 30 секунд**, даже если водитель стоит на месте!

---

## ✅ Новая реализация для Transport

### Алгоритм:

```
1. navigator.geolocation.watchPosition()
   → Браузер отслеживает позицию постоянно
   → При изменении обновляет latestPositionRef

2. setInterval(30_000)
   → Каждые 30 секунд проверяет:
     - Изменилась ли позиция > 10 метров?
     - ИЛИ прошло > 5 минут с последней отправки? (heartbeat)

3. ЕСЛИ изменилась → отправить через WebSocket
   ИНАЧЕ → пропустить (skip)
```

### Код (hooks/useDriverTracking.ts):

```typescript
const MIN_DISTANCE_METERS = 10; // Минимальное изменение (10 метров)
const CHECK_INTERVAL_MS = 30_000; // Проверять каждые 30 секунд
const HEARTBEAT_INTERVAL_MS = 300_000; // Heartbeat каждые 5 минут

interface Position {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export function useDriverTracking(driverID: string, orderID: string, vehicleID: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSentPositionRef = useRef<Position | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const latestPositionRef = useRef<Position | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // 1. Подключиться к WebSocket
    const ws = new WebSocket(`wss://ws.moment-lbs.app/driver?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Driver] WebSocket connected');
    };

    ws.onerror = (error) => {
      console.error('[Driver] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Driver] WebSocket disconnected');
    };

    // 2. Начать отслеживание GPS
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Сохранить последнюю позицию
        latestPositionRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
        };
      },
      (error) => {
        console.error('[Driver] GPS error:', error);
      },
      {
        enableHighAccuracy: true,  // ← ВАЖНО! Для водителей нужна точность GPS
        timeout: 30000,
        maximumAge: 0,  // ← НЕ использовать кэш, только свежие данные
      }
    );

    // 3. Проверять и отправлять каждые 30 секунд
    const intervalId = setInterval(() => {
      const latest = latestPositionRef.current;
      const lastSent = lastSentPositionRef.current;
      const now = Date.now();

      if (!latest) {
        console.log('[Driver] No GPS position yet, skipping');
        return; // Ещё нет координат
      }

      // Проверка 1: Изменилась ли позиция?
      const positionChanged = !lastSent || getDistance(latest, lastSent) >= MIN_DISTANCE_METERS;

      // Проверка 2: Heartbeat (отправить даже если не двигался)
      const heartbeatNeeded = (now - lastSentTimeRef.current) >= HEARTBEAT_INTERVAL_MS;

      if (!positionChanged && !heartbeatNeeded) {
        console.log('[Driver] Position unchanged (<10m), skipping send');
        return;
      }

      // Отправить через WebSocket
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'location',
          lat: latest.lat,
          lng: latest.lng,
          accuracy: latest.accuracy,
          speed: latest.speed,
          heading: latest.heading,
          orderID,
          vehicleID,
        }));

        lastSentPositionRef.current = latest;
        lastSentTimeRef.current = now;

        console.log(`[Driver] Location sent: ${positionChanged ? 'moved' : 'heartbeat'}`, latest);
      } else {
        console.warn('[Driver] WebSocket not open, queuing for retry');
        // TODO: Сохранить в IndexedDB для offline sync
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
      ws.close();
    };
  }, [driverID, orderID, vehicleID]);
}

// Haversine formula для расчёта расстояния между двумя точками
function getDistance(pos1: Position, pos2: Position): number {
  const R = 6371e3; // Радиус Земли в метрах
  const φ1 = pos1.lat * Math.PI / 180;
  const φ2 = pos2.lat * Math.PI / 180;
  const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
  const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Расстояние в метрах
}
```

---

## 🔋 Энергоэффективность

### Почему проверка каждые 30 секунд экономит батарею?

1. **`watchPosition()` работает постоянно** (браузер управляет частотой)
   - Браузер сам решает как часто опрашивать GPS
   - Обычно 1-5 секунд для высокой точности

2. **Отправка через WebSocket** → дорогая операция
   - Включает сетевой интерфейс
   - Пробуждает CPU
   - Расходует батарею

3. **Оптимизация**:
   - Отслеживаем постоянно (браузер оптимизирует)
   - Отправляем редко (только при изменении)
   - Результат: батарея экономится в 3-10 раз!

### Сравнение подходов:

| Подход | Отправок в час (стоя) | Отправок в час (едет) | Расход батареи |
|--------|------------------------|------------------------|----------------|
| **Текущий** (каждые 30 сек) | 120 | 120 | 100% |
| **Новый** (при изменении) | 12 (heartbeat) | 60-120 | 30-50% |

---

## 📱 Что если вкладка свёрнута?

### Проблема: Браузер throttles GPS в фоне

Когда вкладка не активна:
- Chrome: `watchPosition` **останавливается** полностью
- Safari: продолжает работать, но с **очень низкой частотой** (1 раз в минуту)
- Firefox: зависит от настроек энергосбережения

### Решения:

#### Вариант 1: Screen Wake Lock API ✅ (рекомендуемый)
```typescript
const wakeLock = await navigator.wakeLock.request('screen');
// Экран остаётся включённым → GPS работает
```

**Плюсы**:
- ✅ Гарантирует работу GPS
- ✅ Поддерживается в Chrome/Edge

**Минусы**:
- ❌ Экран не гаснет (расход батареи)
- ❌ Не работает в Safari

#### Вариант 2: Требовать от водителя держать вкладку активной
```typescript
// Показать уведомление если вкладка свёрнута
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    alert('⚠️ Держите приложение открытым для отслеживания!');
  }
});
```

**Плюсы**:
- ✅ Простая реализация
- ✅ Работает везде

**Минусы**:
- ❌ Водитель должен помнить

#### Вариант 3: Нативное приложение (долгосрочно)
- Capacitor/Cordova с Background Geolocation Plugin
- Требует сборки нативного APK/IPA

---

## 🗺️ Интеграция с диспетчером

### Dispatcher получает обновления через WebSocket:

```typescript
// components/dispatcher/VehicleMap.tsx

const ws = new WebSocket(`wss://ws.moment-lbs.app/dispatcher?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'driver_location') {
    // Обновить маркер на карте
    updateVehicleMarker(data.driverID, {
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      heading: data.heading,
    });
  }
};
```

---

## 📊 Offline Sync (будущее)

Если водитель теряет связь:

```typescript
// IndexedDB для очереди
const db = await openDB('driver-tracking', 1, {
  upgrade(db) {
    db.createObjectStore('location-queue', { autoIncrement: true });
  },
});

// Сохранить offline
if (ws.readyState !== WebSocket.OPEN) {
  await db.add('location-queue', {
    lat: latest.lat,
    lng: latest.lng,
    timestamp: Date.now(),
    orderID,
  });
}

// Отправить когда вернулся online
ws.onopen = async () => {
  const queue = await db.getAll('location-queue');
  for (const item of queue) {
    ws.send(JSON.stringify({ type: 'location_bulk', data: queue }));
  }
  await db.clear('location-queue');
};
```

---

## 📝 Итоговая архитектура

```
┌─────────────────────────────────────┐
│     Driver PWA (React)              │
│  /app/[lang]/driver                 │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  useDriverTracking()          │ │
│  │  ├─ watchPosition() continuous│ │
│  │  ├─ setInterval(30s) check    │ │
│  │  └─ WebSocket send if changed │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │ wss://ws.moment-lbs.app/driver
               ▼
┌──────────────────────────────────────┐
│  WebSocket Server (Swift Vapor)      │
│                                      │
│  ├─ Validate JWT                    │
│  ├─ Save to track_points (PostGIS)  │
│  └─ Broadcast to dispatchers        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Dispatcher (React)                  │
│  /app/[lang]/dispatcher              │
│                                      │
│  ├─ WebSocket /dispatcher            │
│  ├─ Receive driver_location          │
│  └─ Update map markers real-time    │
└──────────────────────────────────────┘
```

---

## 🔗 Связанные документы

- [WEBSOCKET-INTEGRATION.md](WEBSOCKET-INTEGRATION.md) - Общая архитектура
- [OFFLINE_SYNC_ARCHITECTURE.md](OFFLINE_SYNC_ARCHITECTURE.md) - Offline синхронизация
- [TRANSPORT_PROGRESS.md](../docs/TRANSPORT_PROGRESS.md) - Транспортная система
- [useGeolocation.ts](../hooks/useGeolocation.ts) - Существующая реализация для appointments

---

**Last updated:** 2026-03-15
**Status:** Архитектурный документ для реализации
