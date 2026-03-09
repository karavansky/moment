# Transport System Implementation Progress

## ✅ COMPLETED (Phase 1: Database & Backend)

### 1. Database Migration
- ✅ Upgraded to PostGIS 16 (from PostgreSQL 18)
- ✅ All production data restored successfully (5 users, 8 appointments, 4 workers, 5 clients)
- ✅ Created transport tables:
  - `vehicles` - Fleet management
  - `orders` - Transport orders
  - `routes` - Order routes (pickup/dropoff)
  - `reject_reasons` - Rejection reasons dictionary
  - `order_rejects` - Driver rejection history
  - `track_points` - GPS tracking with PostGIS GEOMETRY
- ✅ Partitioning for `track_points` (monthly, auto-cleanup after 2 months)
- ✅ Updated `workers` table: added `hasVehicle`, `vehicleID`, `isOnline`
- ✅ Updated `appointments` table: added `orderID` (link to transport)

### 2. TypeScript Types
- ✅ Created `/types/transport.ts` with complete type definitions:
  - Vehicle types (VehicleType, VehicleStatus, Vehicle, VehicleDB)
  - Order types (OrderStatus, Order, OrderDB, CreateOrderData, UpdateOrderData)
  - Route types (Route, RouteDB)
  - Reject reason types (RejectReason, OrderReject)
  - Track point types (TrackPoint, TrackPointDB, GeoLocation)
  - SSE event types (TransportEvent, TransportEventType)
  - Dispatcher/Driver view types
  - Statistics types

### 3. Lib Functions (Backend Logic)
All CRUD operations with pg_notify for real-time updates:

#### ✅ `/lib/vehicles.ts`
- createVehicle(), getVehiclesByFirmaID(), getVehicleByID()
- getActiveVehicles(), getVehiclesWithDrivers()
- updateVehicle(), updateVehicleLocation()
- assignDriverToVehicle(), deleteVehicle()
- getVehicleStats()

#### ✅ `/lib/orders.ts`
- createOrder(), getOrdersByFirmaID(), getOrderByID()
- getOrdersByStatus(), getOrdersByDriverID(), getOrdersByClientID()
- getPendingOrders(), getActiveOrders()
- updateOrder(), assignOrderToDriver()
- Driver actions: acceptOrder(), arriveAtPickup(), startTrip(), completeOrder()
- cancelOrder(), deleteOrder()
- Push notifications: sendOrderPushToDriver(), sendOrderPushToDispatchers()
- getOrderStats()

#### ✅ `/lib/routes.ts`
- createRoute(), createRoutesForOrder() (bulk insert with transaction)
- getRoutesByOrderID(), getRouteByID(), getNextRoute()
- updateRoute(), deleteRoute(), deleteRoutesByOrderID()

#### ✅ `/lib/reject-reasons.ts`
- Reject reasons dictionary: createRejectReason(), getRejectReasonsByFirmaID(), getActiveRejectReasons()
- Order rejects: createOrderReject(), getRejectsByOrderID(), getRejectsByDriverID()
- Statistics: getDriverRejectStats(), getTopRejectReasons()

#### ✅ `/lib/track-points.ts` (PostGIS geospatial queries)
- insertTrackPoint(), insertTrackPointsBulk()
- getTrackPointsByOrderID(), getTrackPointsByTimeRange()
- getLatestTrackPoint(), getRecentTrackPoints()
- Geospatial: calculateOrderDistance(), getTrackPointsNearLocation()
- getOrderTrackGeoJSON() (for map display)
- Cleanup: deleteOldTrackPoints(), getTrackPointsStorageSize()
- getTrackPointsStats()

---

## 🚧 IN PROGRESS (Phase 2: API Routes)

### Next.js API Endpoints

**Directory structure:**
```
app/api/transport/
  ├── vehicles/route.ts      - GET/POST/PUT/DELETE vehicles
  ├── orders/route.ts         - GET/POST/PUT/DELETE orders
  ├── routes/route.ts         - GET/POST/DELETE routes
  ├── reject-reasons/route.ts - GET/POST/PUT/DELETE reasons
  └── location/route.ts       - POST GPS updates
```

**Authentication:**
- Use `getSchedulingSession()` for Director-only operations (create/delete)
- Use `getAnySchedulingSession()` for all authenticated users (GET)

**Pattern (based on `/api/scheduling/workers/route.ts`):**
```typescript
import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createVehicle, getVehiclesByFirmaID, ... } from '@/lib/vehicles'

export async function GET() {
  const session = await getAnySchedulingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vehicles = await getVehiclesByFirmaID(session.user.firmaID!)
  return NextResponse.json({ vehicles })
}

export async function POST(request: Request) {
  const session = await getSchedulingSession() // Director only
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...data } = await request.json()
  const vehicle = await createVehicle({ ...data, vehicleID: id, firmaID: session.user.firmaID! })
  return NextResponse.json(vehicle)
}
```

---

## 📋 TODO (Phase 3: Frontend)

### 1. Driver Interface (PWA) - `/app/[lang]/driver`
**Priority: HIGH (as per requirements)**

Components to create:
- `DriverHome.tsx` - Main screen with "Go Online/Offline" button
- `OrderNotification.tsx` - Full-screen notification when order assigned (30s countdown)
- `RejectOrderModal.tsx` - Select rejection reason
- `ActiveTrip.tsx` - Current trip view with navigation
- `TripComplete.tsx` - Generate QR code for passenger review

Functionality:
- Continuous GPS tracking (use `lib/track-points.ts`)
- Offline sync with IndexedDB (Service Worker)
- Push notifications (already implemented, reuse from appointments)
- Real-time order updates via SSE

### 2. Dispatcher Interface - integrate into `/app/[lang]/map`
**Priority: MEDIUM**

Extend existing `AppointmentsMap.tsx`:
- `VehicleMarkers.tsx` - Real-time vehicle positions (green/yellow/gray)
- `OrdersSidebar.tsx` - Pending orders list
- `VehiclesFooter.tsx` - Online vehicles list
- `AssignDriverModal.tsx` - Assign driver to order

Real-time:
- Subscribe to `vehicle_location_update` via SSE
- Update markers on map every 30 seconds

### 3. Administrator (Director) Interface - extend `Sidebar.tsx`
**Priority: LOW**

Add menu items:
- "Автопарк" (Vehicles) - `/admin/vehicles`
- "Причины отказа" (Reject Reasons) - `/admin/reject-reasons`

Pages:
- `/app/[lang]/admin/vehicles` - Vehicle list (CRUD)
- `/app/[lang]/admin/reject-reasons` - Rejection reasons dictionary

Components:
- `VehiclesList.tsx` - Table with edit/delete
- `VehicleForm.tsx` - Add/edit vehicle
- `RejectReasonsList.tsx` - Table with edit/delete

---

## 🔧 Technical Details

### Real-time Architecture (SSE)

**Channel naming:**
- Transport events: `transport_{firmaID}`
- Scheduling events: `scheduling_{firmaID}` (existing)

**Event types:**
```typescript
type TransportEventType =
  | 'vehicle_created' | 'vehicle_updated' | 'vehicle_deleted'
  | 'vehicle_location_update'
  | 'order_created' | 'order_updated' | 'order_deleted'
  | 'order_assigned' | 'order_accepted' | 'order_completed'
  | 'driver_online' | 'driver_offline'
  | 'reject_reason_created' | 'reject_reason_updated' | 'reject_reason_deleted'
```

**Implementation:**
- Extend `/app/api/scheduling/events/route.ts` to handle transport events
- OR create separate `/app/api/transport/events/route.ts`

### GPS Tracking Strategy

**Driver PWA:**
1. When driver goes online → start `GeolocationTracker`
2. Every 30 seconds → POST `/api/transport/location` with coordinates
3. If offline → store in IndexedDB queue
4. When online → bulk POST via `/lib/track-points.ts` insertTrackPointsBulk()

**Dispatcher Map:**
1. Subscribe to SSE `vehicle_location_update`
2. Update vehicle marker positions in real-time
3. Display track line using PostGIS GeoJSON

### Push Notifications

Already implemented in `/lib/orders.ts`:
- `sendOrderPushToDriver()` - notify driver about new order
- `sendOrderPushToDispatchers()` - notify directors about completed orders

Uses existing `/lib/push-notifications.ts` infrastructure.

---

## 🎯 Next Steps

### Immediate (Today):
1. ✅ Create API routes (vehicles, orders, routes, reject-reasons, location)
2. ✅ Test API endpoints with curl/Postman
3. ⏳ Create minimal UI for testing (Director: vehicle list, Driver: home screen)

### Short-term (This Week):
4. ⏳ Implement Driver interface (PWA)
5. ⏳ Implement continuous GPS tracking
6. ⏳ Integrate Dispatcher interface into `/map`

### Mid-term (Next Week):
7. ⏳ Add vehicle management to Sidebar
8. ⏳ QR code generation for reviews
9. ⏳ Statistics dashboard

---

## 📊 Database Schema Summary

```sql
-- Core tables
vehicles (vehicleID, firmaID, plateNumber, type, status, currentDriverID, currentLat, currentLng)
orders (orderID, firmaID, clientID, driverID, vehicleID, status, scheduledTime, ...)
routes (routeID, firmaID, orderID, sequence, pickupAddress, dropoffAddress, pickupLat, pickupLng, ...)
reject_reasons (reasonID, firmaID, reasonText, isActive)
order_rejects (rejectID, orderID, driverID, reasonID, customReason)
track_points (id, orderID, vehicleID, driverID, location GEOMETRY, speed, heading, recordedAt)
  ├── track_points_2026_03 (partition)
  └── track_points_2026_04 (partition)

-- Updated tables
workers (+hasVehicle, +vehicleID, +isOnline)
appointments (+orderID)
```

---

## 🔗 Related Documentation

- `/docs/TRANSPORT_REQUEREMENTS.md` - Original requirements (Russian)
- `/types/transport.ts` - TypeScript type definitions
- `/scripts/add-transport-system.sql` - Database migration script
- `/docs/GEOLOCATION_ARCHITECTURE.md` - Existing geolocation system (for appointments)
- `/docs/NOTIFICATIONS_ARCHITECTURE.md` - Push notifications architecture
- `/docs/REALTIME_SSE.md` - SSE real-time system

---

**Last updated:** 2026-03-07
**Status:** Phase 1 Complete ✅ | Phase 2 In Progress 🚧 | Phase 3 TODO 📋
