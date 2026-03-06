# Geolocation Architecture

## Overview

This document describes the geolocation tracking system for workers during appointments and future trips feature.

## Current Implementation (Appointments)

### How it works

1. **Manual tracking only** - Geolocation is captured **only** when user clicks Start/Finish buttons in `AppointmentReport`
2. **No automatic tracking** - `GeolocationTracker` component is **disabled** (does not auto-resume tracking on page reload)
3. **Two capture points**:
   - **Start button**: Captures worker's GPS location when starting work session
   - **Finish button**: Captures worker's GPS location when finishing work session

### Components

#### 1. `hooks/useGeolocation.ts`
Core geolocation hook providing:
- **Permission management**: Checks and requests location permission
- **Position tracking**: `watchPosition()` for continuous tracking
- **Server sync**: Sends position updates to server every 30 seconds
- **Error handling**: Handles POSITION_UNAVAILABLE, TIMEOUT, PERMISSION_DENIED errors

**Key methods:**
- `requestPermission()` - Request user permission for geolocation
- `startTracking(appointmentId)` - Start continuous position tracking
- `stopTracking()` - Stop tracking and cleanup

**Configuration:**
```javascript
{
  enableHighAccuracy: false,  // Use Wi-Fi/IP on desktop, GPS on mobile
  timeout: 30000,             // 30 seconds max wait
  maximumAge: 300000          // Accept 5-minute-old cached position
}
```

#### 2. `components/GeolocationTracker.tsx`
**Currently DISABLED** - Auto-tracking component that will be used for Trips feature.

- Monitors open appointments
- Automatically starts/stops tracking based on appointment state
- **To enable**: Set `ENABLE_AUTO_TRACKING = true` (line 45)

#### 3. `components/GeolocationBanner.tsx`
Permission prompt banner:
- Shows when permission is 'prompt' or 'denied'
- Only visible to workers (status=1)
- Provides instructions to enable location access

#### 4. `components/scheduling/AppointmentReport.tsx` & `AppReport.tsx`
Manual geolocation capture in Start/Finish handlers:
- Calls `getGeoData()` which uses `getCurrentPosition()`
- Captures: latitude, longitude, address (reverse geocoding), distance from client
- Sends to `/api/reports` endpoint

### Database Schema

```sql
-- Reports table stores geolocation data
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  worker_id UUID REFERENCES workers(id),

  -- Start location (captured on Start button)
  open_at TIMESTAMP,
  start_latitude DOUBLE PRECISION,
  start_longitude DOUBLE PRECISION,
  start_address TEXT,
  start_distance_from_client INTEGER, -- meters

  -- Finish location (captured on Finish button)
  close_at TIMESTAMP,
  end_latitude DOUBLE PRECISION,
  end_longitude DOUBLE PRECISION,
  end_address TEXT,
  end_distance_from_client INTEGER, -- meters

  -- Additional data
  photos JSONB,
  notes TEXT
);
```

### API Endpoints

#### POST `/api/reports`
Creates new report with geolocation data.

**Request:**
```json
{
  "reportID": "abc123",
  "type": 0,
  "appointmentId": "def456",
  "workerId": "worker789",
  "firmaID": "firma001",
  "latitude": 52.520007,
  "longitude": 13.404954,
  "address": "Straße 123, 10115 Berlin",
  "distance": 150
}
```

#### POST `/api/location`
Real-time location updates during active tracking (used by future Trips feature).

**Request:**
```json
{
  "appointmentId": "def456",
  "latitude": 52.520007,
  "longitude": 13.404954
}
```

---

## Future Implementation (Trips Feature)

### Planned Changes

The Trips feature will enable **Uber-style continuous tracking** for drivers/workers with vehicles.

### Architecture

#### 1. Enable `GeolocationTracker`
Set `ENABLE_AUTO_TRACKING = true` in `components/GeolocationTracker.tsx:45`

#### 2. Add Trip Type to Database

```sql
-- Add trip_type to appointments
ALTER TABLE appointments
ADD COLUMN trip_type VARCHAR(20) DEFAULT 'appointment' CHECK (trip_type IN ('appointment', 'trip'));

-- Add vehicle info to workers
ALTER TABLE workers
ADD COLUMN has_vehicle BOOLEAN DEFAULT false,
ADD COLUMN vehicle_type VARCHAR(50);
```

#### 3. Tracking Logic

**For appointments** (current):
- No auto-tracking
- Manual capture on Start/Finish

**For trips** (future):
- Auto-tracking starts when trip is marked as "Open"
- Continuous position updates every 30 seconds
- Auto-resumes tracking after page reload (if trip still open)
- Stops when trip is marked as "Closed"

#### 4. UI Changes

**Client view:**
- Real-time map showing driver location
- ETA calculation based on current position
- Route visualization

**Worker/Driver view:**
- "Start Trip" button → opens trip + starts tracking
- Navigation assistance
- "Arrive" button → stops tracking + captures final position

### Implementation Checklist

- [ ] Add `trip_type` column to appointments table
- [ ] Add vehicle fields to workers table
- [ ] Create Trip model in `types/scheduling.ts`
- [ ] Enable `GeolocationTracker` for trip_type='trip'
- [ ] Implement client-side live map view
- [ ] Add ETA calculation
- [ ] Create trip-specific UI components
- [ ] Test auto-resume after page reload
- [ ] Add trip analytics dashboard

---

## Testing

### Development Setup

**Option 1: Chrome DevTools Sensors (Recommended)**
1. Open DevTools (F12 or Cmd+Option+I)
2. Press ESC → Sensors tab
3. Location → Select city or enter custom coordinates
4. This emulates accurate GPS (5-10m accuracy)

**Option 2: Real Mobile Device**
- Use iPhone/Android with actual GPS
- Best for testing accuracy and real-world scenarios

**Option 3: Desktop** (Limited)
- macOS/Windows will use Wi-Fi/IP location
- Accuracy: 65-150 meters (not suitable for production testing)
- May fail if Wi-Fi network is unknown

### Common Issues

#### `POSITION_UNAVAILABLE` (Error code 2)
**Cause:** GPS signal not available (indoors, desktop without GPS)
**Solution:** Use Chrome DevTools Sensors emulation

#### `TIMEOUT` (Error code 3)
**Cause:** Position request took too long
**Solution:** Increase `timeout` parameter or use cached position

#### macOS CoreLocation Issues
**Symptom:** "CoreLocationProvider: CoreLocation framework reported a kCLErrorLocationUnknown failure"
**Cause:** macOS Location Services not working properly
**Solution:**
1. System Settings → Privacy & Security → Location Services
2. Toggle off → wait 10 seconds → toggle on
3. Ensure Chrome has "While Using" permission
4. Restart Chrome completely (Cmd+Q)
5. If still fails: Use Chrome DevTools Sensors

---

## Security & Privacy

### Permission Model
- **Explicit consent required**: User must click "Allow" in browser prompt
- **Stored in localStorage**: Permission state cached to avoid repeated prompts
- **Revocable**: User can revoke permission in browser settings anytime

### Data Handling
- **HTTPS only**: Geolocation API requires secure context
- **Worker data only**: Only tracks workers (status=1), not clients
- **Opt-out**: Workers can deny permission or disable in settings
- **Data retention**: Follow GDPR requirements - delete after retention period

### Best Practices
1. Clear privacy policy explaining location tracking
2. Allow workers to disable tracking in settings
3. Only track during work hours / active appointments
4. Encrypt location data in transit and at rest
5. Regular security audits

---

## Performance Considerations

### Battery Impact
- `watchPosition()` with `enableHighAccuracy: true` drains battery quickly
- **Current config**: `enableHighAccuracy: false` for balance
- **Recommendation**: For Trips, use `true` only during active navigation

### Network Usage
- Position updates sent every 30 seconds
- ~100 bytes per update
- ~120 KB per hour (acceptable for mobile data)

### Server Load
- Use WebSocket or Server-Sent Events for real-time updates
- Cache positions on client, batch send on interval
- Use PostGIS for efficient geospatial queries

---

## Monitoring & Analytics

### Metrics to Track
1. **Permission grant rate**: % of workers who allow location access
2. **Tracking reliability**: % of successful position updates
3. **Position accuracy**: Average accuracy in meters
4. **Error rates**: By error code (1=DENIED, 2=UNAVAILABLE, 3=TIMEOUT)
5. **Battery impact**: User feedback on battery drain

### Logs
```javascript
[useGeolocation] Starting tracking for appointment: abc123
[useGeolocation] ⚠️ Position unavailable (will keep trying): {code: 2, message: '...'}
[useGeolocation] ✅ Position update: {lat: 52.52, lon: 13.40, accuracy: 15m}
```

---

## References

- [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [W3C Geolocation Specification](https://www.w3.org/TR/geolocation/)
- [Chrome DevTools Sensors](https://developer.chrome.com/docs/devtools/sensors/)
- [GDPR Location Data Guidelines](https://gdpr.eu/gps-tracking-employees/)
