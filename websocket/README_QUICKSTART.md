# WebSocket Server для Moment LBS

> Real-time GPS tracking для транспортной системы (Uber-style)

---

## 🚀 Быстрый старт

### Для новых сессий — читать в таком порядке:

1. **[WEBSOCKET-INTEGRATION.md](WEBSOCKET-INTEGRATION.md)** (30 мин)
   - Общая архитектура WebSocket интеграции
   - Как всё связано с Moment (Next.js + Vapor API)
   - Docker и развёртывание
   - Nginx конфигурация

2. **[GPS_TRACKING_ARCHITECTURE.md](GPS_TRACKING_ARCHITECTURE.md)** (15 мин)
   - **КТО отслеживает GPS**: React Component, НЕ Service Worker (важно!)
   - Алгоритм: проверять каждые 30 сек, отправлять только если изменилось > 10м
   - Screen Wake Lock для фонового трекинга

3. **[OFFLINE_SYNC_ARCHITECTURE.md](OFFLINE_SYNC_ARCHITECTURE.md)** (15 мин)
   - IndexedDB для offline storage
   - Background Sync API (Chrome/Edge)
   - WebSocket + HTTP retry logic

---

## 📊 Текущий статус

### ✅ Что УЖЕ готово:

- ✅ **Nginx конфиг**: `wss://ws.moment-lbs.app` → порт 3003 (строки 748-779)
- ✅ **Таблица БД**: `track_points` с PostGIS GEOMETRY (см. `TRANSPORT_PROGRESS.md`)
- ✅ **Аутентификация**: JWTAuthMiddleware работает в vapor-api (копировать)
- ✅ **Package.swift**: crypto библиотеки добавлены (swift-crypto, CryptoSwift)
- ✅ **Документация**: 3 подробных MD файла

### ⏳ Что НЕ сделано:

- ⏳ WebSocket сервер не запущен (порт 3003 свободен)
- ⏳ JWTAuthMiddleware не скопирован из vapor-api
- ⏳ Dockerfile не создан
- ⏳ docker-compose.yml не обновлён
- ⏳ Frontend `/websocket/frontend/` не удалён (тестовый UI)

---

**Next step:** Read [WEBSOCKET-INTEGRATION.md](WEBSOCKET-INTEGRATION.md)
