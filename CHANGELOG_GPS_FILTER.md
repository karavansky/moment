# GPS Noise Filter Update - Dynamic Acceleration-Based Algorithm

## Summary

Replaced static distance threshold (50m) with **physics-based acceleration filter** that:
- ✅ Allows high-speed driving (100+ km/h, even 150+ km/h on Autobahn)
- ✅ Rejects GPS noise/spikes based on impossible acceleration
- ✅ Uses vehicle dynamics: max 12 m/s² acceleration (sports car level)

## Changes Made

### 1. Database Schema

**New column**: `vehicles.currentSpeed` (DOUBLE PRECISION)
- Stores last calculated speed in km/h
- Used for dynamic validation on next GPS update

**Migration**: [`vapor-api/migrations/001_add_current_speed_to_vehicles.sql`](vapor-api/migrations/001_add_current_speed_to_vehicles.sql)

### 2. Backend (Vapor API)

**Modified files**:
- [`vapor-api/Sources/App/Controllers/VehicleLocationController.swift`](vapor-api/Sources/App/Controllers/VehicleLocationController.swift#L170-230)
  - Added `currentSpeed` to SELECT query
  - Implemented dynamic acceleration filter
  - Save speed on UPDATE

- [`vapor-api/Sources/App/Models/Vehicle.swift`](vapor-api/Sources/App/Models/Vehicle.swift)
  - Added `currentSpeed` field to model
  - Added `currentSpeed` to VehicleDTO

### 3. Frontend (Next.js)

**Modified files**:
- [`app/[lang]/driver/page.tsx`](app/[lang]/driver/page.tsx#L502-531)
  - Replaced static threshold with dynamic acceleration filter
  - Uses `currentSpeed` state for validation

- [`types/transport.ts`](types/transport.ts)
  - Added `currentSpeed?: number | null` to Vehicle interface
  - Added to VehicleDB interface

### 4. Documentation

**New files**:
- [`docs/GPS_NOISE_FILTER.md`](docs/GPS_NOISE_FILTER.md) - Detailed algorithm explanation
- [`vapor-api/migrations/README.md`](vapor-api/migrations/README.md) - Migration instructions

## Deployment Steps

### 1. Apply Database Migration

```bash
# Start database if not running
docker compose up -d postgres

# Apply migration
docker compose exec -T postgres psql -U hronop -d moment < vapor-api/migrations/001_add_current_speed_to_vehicles.sql

# Verify column was added
docker compose exec -T postgres psql -U hronop -d moment -c "\d vehicles"
```

Expected output should show `currentSpeed | double precision |`

### 2. Rebuild and Restart Vapor API

```bash
# Rebuild Docker image
docker compose build vapor-api

# Restart service
docker compose up -d vapor-api

# Check logs
docker compose logs -f vapor-api
```

### 3. Restart Next.js (Development)

```bash
# No build needed in development
# Just refresh browser or restart dev server if needed
npm run dev
```

### 4. Testing

Test the following scenarios:

**Test 1: Low-speed GPS spike (should be rejected)**
```
1. Start Test Route (speed: 5 km/h)
2. Manually inject GPS point 100m away
3. Expected: Console shows "🚫 GPS NOISE detected - unrealistic acceleration"
```

**Test 2: Highway speed (should be accepted)**
```
1. Load test route with 100 km/h speed
2. Check console logs
3. Expected: "✅ GPS position validated"
```

**Test 3: Real GPS on highway**
```
1. Use real device GPS on highway (100+ km/h)
2. Monitor console logs
3. Expected: No rejections for legitimate movement
```

## Algorithm Details

**Old (rejected)**:
```typescript
const maxRealisticDist = 50 // meters (static)
// Problem: Rejects 100+ km/h speeds
```

**New (accepted)**:
```typescript
// Dynamic based on previous speed + max acceleration
const MAX_ACCELERATION = 12.0 // m/s² (sports car)
const prevSpeedMs = (currentSpeed || 0) / 3.6
const maxRealisticDist = (prevSpeedMs * timeElapsedSec) +
                         (0.5 * MAX_ACCELERATION * timeElapsedSec * timeElapsedSec)
```

### Example Calculations

| Previous Speed | Time | Max Distance | Max New Speed | Status |
|---------------|------|--------------|---------------|--------|
| 0 km/h | 2s | 24m | 43 km/h | ✅ Realistic |
| 5 km/h | 2s | 26.78m | 48 km/h | ✅ Realistic |
| 100 km/h | 2s | 79.56m | 143 km/h | ✅ Realistic |
| 150 km/h | 2s | 107.33m | 193 km/h | ✅ Realistic |
| 5 km/h | 2s | 100m (spike) | 180 km/h | ❌ GPS noise |

## Rollback Plan

If issues occur, revert to previous algorithm:

```typescript
// Rollback: Use static threshold
const maxRealisticDist = 80 // meters (allows 144 km/h)
```

No need to drop the `currentSpeed` column - it won't cause issues.

## Performance Impact

- ✅ No performance impact (simple math operations)
- ✅ Slightly more accurate filtering
- ✅ Better user experience at high speeds

## Future Improvements

Potential enhancements:
1. **Adaptive MAX_ACCELERATION**: Different limits for city vs highway
2. **Speed-based smoothing**: More aggressive filtering at low speeds
3. **Historical tracking**: Use last 3-5 speeds for better validation
4. **GPS accuracy consideration**: Adjust threshold based on GPS accuracy value

## References

- Full documentation: [`docs/GPS_NOISE_FILTER.md`](docs/GPS_NOISE_FILTER.md)
- Migration guide: [`vapor-api/migrations/README.md`](vapor-api/migrations/README.md)
