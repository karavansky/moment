# GPS Noise Filter - Dynamic Acceleration-Based Algorithm

## Overview

The GPS noise filter protects against unrealistic GPS jumps (spikes/noise) while allowing legitimate high-speed movement. It uses **physics-based validation** instead of static distance thresholds.

## Problem with Static Thresholds

**Old approach (rejected)**:
```typescript
// ❌ Static: 50m in 2 seconds = max 90 km/h
const maxRealisticDist = 50

// Problem: Rejects legitimate highway speeds
// At 100 km/h: travel 55.56m in 2s → REJECTED
// At 130 km/h: travel 72.22m in 2s → REJECTED
```

This fails for:
- Highway driving (100+ km/h)
- Autobahn in Germany (150+ km/h is legal)
- Any scenario where vehicle accelerates quickly

## New Approach: Dynamic Acceleration Filter

**Key insight**: A vehicle cannot instantly change speed. It must accelerate or decelerate within **physical limits**.

### Physics Foundation

Maximum realistic acceleration:
- **Sports car**: 0-100 km/h in 3 seconds ≈ 9 m/s²
- **Emergency braking**: ~10 m/s²
- **Our generous limit**: 12 m/s² (accounts for GPS inaccuracy)

### Algorithm

```typescript
// 1. Get previous speed (from last GPS update)
const prevSpeedMs = (currentSpeed || 0) / 3.6 // km/h → m/s

// 2. Calculate maximum realistic distance using kinematic equation
// distance = v₀·t + ½·a·t²
const MAX_ACCELERATION = 12.0 // m/s²
const maxRealisticDist = (prevSpeedMs * timeElapsedSec) +
                         (0.5 * MAX_ACCELERATION * timeElapsedSec * timeElapsedSec)

// 3. Reject if actual distance exceeds this limit
if (dist > maxRealisticDist) {
  // This is GPS noise!
  return reject()
}
```

### Examples

**Scenario 1: Starting from rest (0 km/h)**
```
Previous speed: 0 km/h
Time elapsed: 2 seconds
Max distance: 0 + 0.5 × 12 × 4 = 24m
→ Allows acceleration up to 43 km/h ✅
```

**Scenario 2: Already moving at 100 km/h**
```
Previous speed: 100 km/h (27.78 m/s)
Time elapsed: 2 seconds
Max distance: 27.78 × 2 + 0.5 × 12 × 4 = 79.56m
→ Allows acceleration up to 143 km/h ✅
→ Blocks GPS spike of 150m (270 km/h) ❌
```

**Scenario 3: Moving at 150 km/h (Autobahn)**
```
Previous speed: 150 km/h (41.67 m/s)
Time elapsed: 2 seconds
Max distance: 41.67 × 2 + 0.5 × 12 × 4 = 107.33m
→ Allows cruising at 150 km/h ✅
→ Allows acceleration to 193 km/h ✅
→ Blocks GPS spike of 200m (360 km/h) ❌
```

**Scenario 4: GPS noise at low speed**
```
Previous speed: 5 km/h (1.39 m/s)
Time elapsed: 2 seconds
Max distance: 1.39 × 2 + 0.5 × 12 × 4 = 26.78m
GPS spike: 100m
→ REJECTED ❌ (would require 180 km/h instantly)
```

## Implementation

### Client-Side (Next.js)

File: [`app/[lang]/driver/page.tsx`](../app/[lang]/driver/page.tsx#L502-531)

```typescript
const MAX_ACCELERATION = 12.0 // m/s²

const prevSpeedMs = (currentSpeed || 0) / 3.6
const maxRealisticDist = (prevSpeedMs * timeElapsedSec) +
                         (0.5 * MAX_ACCELERATION * timeElapsedSec * timeElapsedSec)

if (dist > maxRealisticDist) {
  console.warn('🚫 GPS NOISE detected - unrealistic acceleration')
  return // Reject update
}
```

### Server-Side (Vapor API)

File: [`vapor-api/Sources/App/Controllers/VehicleLocationController.swift`](../vapor-api/Sources/App/Controllers/VehicleLocationController.swift#L200-221)

```swift
let MAX_ACCELERATION = 12.0 // m/s²

let prevSpeedKmh = (try? lastRow.decode(column: "currentSpeed", as: Double.self)) ?? 0.0
let prevSpeedMs = prevSpeedKmh / 3.6

let maxRealisticDist = (prevSpeedMs * timeDelta) +
                       (0.5 * MAX_ACCELERATION * timeDelta * timeDelta)

if dist > maxRealisticDist {
    throw Abort(.badRequest, reason: "Invalid GPS point: unrealistic acceleration")
}
```

## Database Changes

Added `currentSpeed` column to `vehicles` table:

```sql
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS "currentSpeed" DOUBLE PRECISION;
```

This stores the last calculated speed (km/h) for validation on the next update.

### Migration

Apply migration:
```bash
docker compose exec -T postgres psql -U hronop -d moment < vapor-api/migrations/001_add_current_speed_to_vehicles.sql
```

See: [`vapor-api/migrations/README.md`](../vapor-api/migrations/README.md)

## Benefits

✅ **Allows high-speed driving**: No artificial speed limits
✅ **Rejects GPS noise**: Impossible acceleration is blocked
✅ **Physics-based**: Uses real vehicle dynamics
✅ **Adaptive**: Works at any speed (0-300+ km/h)
✅ **Double validation**: Both client and server enforce the rule

## Tuning

The `MAX_ACCELERATION` constant (12 m/s²) can be adjusted:

- **More restrictive** (8 m/s²): Blocks some sports car acceleration
- **More permissive** (15 m/s²): Allows more GPS noise through
- **Current value** (12 m/s²): Good balance for production use

## Testing

Test cases to verify:
1. ✅ Low-speed GPS spike (5 km/h → 100m jump) → REJECTED
2. ✅ Highway cruising (100 km/h → 55m in 2s) → ACCEPTED
3. ✅ Autobahn speed (150 km/h → 83m in 2s) → ACCEPTED
4. ✅ Sports car acceleration (0 → 100 km/h in 3s) → ACCEPTED
5. ✅ Impossible acceleration (30 km/h → 200 km/h in 2s) → REJECTED

## References

- Kinematic equations: https://en.wikipedia.org/wiki/Equations_of_motion
- Vehicle acceleration data: https://www.zeroto60times.com/
- GPS accuracy: https://www.gps.gov/systems/gps/performance/accuracy/
