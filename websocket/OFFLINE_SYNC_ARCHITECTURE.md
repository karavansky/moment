# Offline Sync Architecture для GPS Tracking

> **Вопрос**: Как реализовать offline cache и фоновую синхронизацию для GPS координат?
> **Ответ**: Комбинация IndexedDB + Background Sync API + WebSocket retry logic

---

## 🎯 Сценарии использования

### Сценарий 1: Водитель теряет связь во время поездки
```
1. Водитель едет по туннелю → нет сети
2. GPS продолжает работать → координаты накапливаются
3. Координаты сохраняются в IndexedDB
4. Водитель выезжает из туннеля → связь восстановлена
5. Все накопленные координаты отправляются bulk-запросом
```

### Сценарий 2: Приложение закрыто/crashed
```
1. Водитель едет → координаты в IndexedDB
2. Приложение крашится / браузер закрывается
3. Background Sync API регистрирует событие 'sync-locations'
4. Service Worker пробуждается в фоне
5. Service Worker отправляет координаты из IndexedDB через HTTP
```

---

## 📊 Архитектура (3 уровня)

### Level 1: IndexedDB (Storage) ✅ Работает всегда

```typescript
// lib/offline-storage.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DriverTrackingDB extends DBSchema {
  'location-queue': {
    key: number;
    value: {
      lat: number;
      lng: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      orderID: string;
      vehicleID: string;
      driverID: string;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<DriverTrackingDB> | null = null;

  async init() {
    this.db = await openDB<DriverTrackingDB>('driver-tracking', 1, {
      upgrade(db) {
        const store = db.createObjectStore('location-queue', {
          autoIncrement: true,
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async addLocation(location: LocationData) {
    if (!this.db) await this.init();
    await this.db!.add('location-queue', {
      ...location,
      timestamp: Date.now(),
    });
  }

  async getAllLocations() {
    if (!this.db) await this.init();
    return await this.db!.getAll('location-queue');
  }

  async clearLocations() {
    if (!this.db) await this.init();
    await this.db!.clear('location-queue');
  }

  async getCount() {
    if (!this.db) await this.init();
    return await this.db!.count('location-queue');
  }
}

export const offlineStorage = new OfflineStorage();
```

**Плюсы**:
- ✅ Работает всегда (даже offline)
- ✅ Нет лимитов на размер (обычно 50MB+)
- ✅ Персистентное хранение

**Минусы**:
- ❌ Не может отправлять в фоне (нужен активный контекст)

---

### Level 2: Background Sync API ⚠️ Ограниченная поддержка

```typescript
// public/sw.js (Service Worker)

// Регистрация sync event
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-locations') {
    event.waitUntil(syncLocationsToServer());
  }
});

async function syncLocationsToServer() {
  try {
    // 1. Получить данные из IndexedDB
    const db = await openIndexedDB();
    const locations = await db.getAll('location-queue');

    if (locations.length === 0) return;

    // 2. Отправить через HTTP (НЕ WebSocket! Service Worker не поддерживает WS)
    const response = await fetch('/api/transport/location/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getStoredToken()}`,
      },
      body: JSON.stringify({ locations }),
    });

    if (response.ok) {
      // 3. Очистить IndexedDB после успешной отправки
      await db.clear('location-queue');
      console.log('[SW] Synced', locations.length, 'locations');
    } else {
      throw new Error('Sync failed: ' + response.status);
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    // Background Sync автоматически повторит попытку
    throw error;
  }
}

// Helper для получения токена из IndexedDB
async function getStoredToken() {
  const db = await openIndexedDB();
  const tokenStore = await db.get('auth-tokens', 'current');
  return tokenStore?.token;
}
```

**Регистрация sync в React компоненте**:

```typescript
// hooks/useDriverTracking.ts

async function scheduleBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-locations');
    console.log('[Driver] Background sync scheduled');
  }
}

// Вызывать при потере соединения
ws.onclose = () => {
  scheduleBackgroundSync();
};
```

**Плюсы**:
- ✅ Работает даже когда приложение закрыто
- ✅ Автоматический retry (браузер повторяет до успеха)
- ✅ Гарантированная доставка

**Минусы**:
- ❌ **Только Chrome/Edge** (Safari/Firefox не поддерживают)
- ❌ **Только HTTP**, НЕ WebSocket
- ❌ Браузер решает КОГДА запустить (может быть задержка до 12 часов)

**Поддержка браузеров**:
- ✅ Chrome 49+
- ✅ Edge 79+
- ❌ Safari (нет поддержки)
- ❌ Firefox (нет поддержки)

---

### Level 3: Periodic Background Sync API ❌ НЕ рекомендуется

```typescript
// НЕ ИСПОЛЬЗУЕМ для GPS tracking!

const registration = await navigator.serviceWorker.ready;
await registration.periodicSync.register('sync-locations', {
  minInterval: 12 * 60 * 60 * 1000, // Минимум 12 часов
});
```

**Почему НЕ подходит**:
- ❌ Минимальный интервал 12 часов (слишком редко для GPS)
- ❌ Только для PWA, установленных на главный экран
- ❌ Требует разрешение пользователя
- ❌ Браузер может отменить (зависит от использования приложения)

---

## ✅ Рекомендуемая стратегия

### Hybrid Approach (IndexedDB + WebSocket retry + Background Sync fallback)

```typescript
// hooks/useDriverTracking.ts

export function useDriverTracking(driverID: string, orderID: string, vehicleID: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPositionRef = useRef<Position | null>(null);
  const latestPositionRef = useRef<Position | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Отслеживать online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Driver] Network restored, reconnecting...');
      setIsOnline(true);
      connectWebSocket();
      syncQueuedLocations(); // ← Отправить накопленные
    };

    const handleOffline = () => {
      console.log('[Driver] Network lost, queuing locations...');
      setIsOnline(false);
      scheduleBackgroundSync(); // ← Fallback для закрытого приложения
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Подключение к WebSocket
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const ws = new WebSocket(`wss://ws.moment-lbs.app/driver?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Driver] WebSocket connected');
      syncQueuedLocations(); // ← Отправить накопленные при подключении
    };

    ws.onerror = (error) => {
      console.error('[Driver] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Driver] WebSocket closed, scheduling reconnect...');
      scheduleBackgroundSync(); // ← Background sync для закрытого приложения

      // Reconnect через 5 секунд
      reconnectTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          connectWebSocket();
        }
      }, 5000);
    };
  }, []);

  // Отправить накопленные координаты из IndexedDB
  const syncQueuedLocations = useCallback(async () => {
    const count = await offlineStorage.getCount();
    if (count === 0) return;

    console.log(`[Driver] Syncing ${count} queued locations...`);
    const locations = await offlineStorage.getAllLocations();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Отправить через WebSocket bulk
      wsRef.current.send(JSON.stringify({
        type: 'location_bulk',
        locations: locations.map(loc => ({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          orderID: loc.orderID,
          vehicleID: loc.vehicleID,
          timestamp: loc.timestamp,
        })),
      }));

      await offlineStorage.clearLocations();
      console.log(`[Driver] Synced ${count} locations via WebSocket`);
    } else {
      // WebSocket не подключён → отправить через HTTP
      try {
        const response = await fetch('/api/transport/location/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations }),
        });

        if (response.ok) {
          await offlineStorage.clearLocations();
          console.log(`[Driver] Synced ${count} locations via HTTP`);
        }
      } catch (error) {
        console.error('[Driver] HTTP sync failed:', error);
      }
    }
  }, []);

  // Регистрация Background Sync (для закрытого приложения)
  const scheduleBackgroundSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-locations');
        console.log('[Driver] Background sync scheduled');
      } catch (error) {
        console.warn('[Driver] Background sync not available:', error);
      }
    }
  }, []);

  // GPS tracking
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        latestPositionRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
        };
      },
      (error) => console.error('[Driver] GPS error:', error),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );

    const intervalId = setInterval(async () => {
      const latest = latestPositionRef.current;
      const lastSent = lastSentPositionRef.current;

      if (!latest) return;

      const positionChanged = !lastSent || getDistance(latest, lastSent) >= 10;
      if (!positionChanged) return;

      const locationData = {
        lat: latest.lat,
        lng: latest.lng,
        accuracy: latest.accuracy,
        speed: latest.speed,
        heading: latest.heading,
        orderID,
        vehicleID,
        driverID,
      };

      // Попытка отправить через WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'location',
          ...locationData,
        }));
        lastSentPositionRef.current = latest;
        console.log('[Driver] Location sent via WebSocket');
      } else {
        // Offline → сохранить в IndexedDB
        await offlineStorage.addLocation(locationData);
        console.log('[Driver] Location queued (offline)');

        // Попытка sync через HTTP (если есть сеть)
        if (navigator.onLine) {
          syncQueuedLocations();
        }
      }
    }, 30_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [driverID, orderID, vehicleID, connectWebSocket, syncQueuedLocations]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  return { isOnline, queuedCount: /* ... */ };
}
```

---

## 🔄 Поток данных

### Нормальный режим (online):
```
GPS → latestPositionRef → WebSocket → Server → track_points
```

### Offline режим:
```
GPS → latestPositionRef → IndexedDB queue
                              ↓
                    (wait for connection)
                              ↓
                    WebSocket reconnect / HTTP bulk
                              ↓
                         Server → track_points
```

### Background sync (приложение закрыто):
```
IndexedDB queue → Service Worker (sync event)
                       ↓
                  HTTP POST /api/transport/location/bulk
                       ↓
                  Server → track_points
```

---

## 📊 Сравнение подходов

| Метод | Работает offline | Работает в фоне | Поддержка браузеров | Использование |
|-------|------------------|-----------------|---------------------|---------------|
| **IndexedDB** | ✅ Да | ❌ Нет | ✅ Все | Storage |
| **WebSocket retry** | ❌ Нет | ❌ Нет | ✅ Все | Primary sync |
| **HTTP bulk** | ❌ Нет | ❌ Нет | ✅ Все | Fallback sync |
| **Background Sync** | ✅ Да | ✅ Да | ⚠️ Chrome/Edge | Закрытое приложение |

---

## 🎯 Итоговая рекомендация

### Используем все 3 метода вместе:

1. **IndexedDB** → хранение (всегда)
2. **WebSocket retry** → основной канал (когда приложение открыто)
3. **Background Sync** → fallback (когда приложение закрыто, только Chrome)
4. **HTTP bulk** → fallback (Safari/Firefox, когда WebSocket не работает)

### Приоритет отправки:
```
1. WebSocket (если подключён) → fastest
2. HTTP bulk (если онлайн, но WS не работает) → reliable
3. Background Sync (если приложение закрыто) → guaranteed (Chrome only)
```

---

## 📝 API для Server-side

Нужно создать HTTP endpoint для bulk upload:

```typescript
// app/api/transport/location/bulk/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAnySchedulingSession } from '../../auth-check';
import { insertTrackPointsBulk } from '@/lib/track-points';

export async function POST(request: NextRequest) {
  const session = await getAnySchedulingSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { locations } = await request.json();

  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Валидация и сохранение
  const trackPoints = locations.map(loc => ({
    driverID: session.user.myWorkerID!,
    orderID: loc.orderID,
    vehicleID: loc.vehicleID,
    latitude: loc.lat,
    longitude: loc.lng,
    accuracy: loc.accuracy,
    speed: loc.speed,
    heading: loc.heading,
    recordedAt: new Date(loc.timestamp),
  }));

  await insertTrackPointsBulk(trackPoints);

  return NextResponse.json({
    success: true,
    count: trackPoints.length
  });
}
```

---

## 🔗 Связанные документы

- [GPS_TRACKING_ARCHITECTURE.md](GPS_TRACKING_ARCHITECTURE.md) - Основная архитектура GPS
- [WEBSOCKET-INTEGRATION.md](WEBSOCKET-INTEGRATION.md) - WebSocket интеграция
- [MDN Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)

---

**Last updated:** 2026-03-15
**Status:** Архитектурный документ
