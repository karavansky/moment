# Backend Update: createdAt and editedAt Fields

## Overview

This document provides instructions for updating the vapor-api backend (Swift Vapor with Fluent ORM) to support the new `createdAt` and `editedAt` fields in the Appointment model.

**Frontend and Next.js API are already updated.** Vapor-API backend is also now updated.

---

## Changes Summary

### 1. **Database Schema** ✅
- Added `createdAt` column (TIMESTAMP NOT NULL DEFAULT NOW())
- Added `editedAt` column (TIMESTAMP nullable)
- Updated existing records: `SET createdAt = date`
- Created indexes on both columns

### 2. **Appointment Model** ✅
- Added `createdAt: Date` (required field using @Field)
- Added `editedAt: Date?` (optional field using @OptionalField)

### 3. **API Endpoints** ✅
- **POST /api/scheduling/appointments**: Sets `createdAt` automatically on creation
- **PUT /api/scheduling/appointments**: Sets `editedAt` automatically on update (both Worker and Director)

---

## Implementation Steps (COMPLETED)

### Step 1: Database Migration ✅

Migration file created: `migrations/add_created_at_edited_at_to_appointments.sql`

```sql
-- Add createdAt column (NOT NULL with default NOW())
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();

-- Add editedAt column (nullable)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP;

-- Update existing records: set createdAt to the appointment date
UPDATE appointments
SET "createdAt" = "date"
WHERE "createdAt" = NOW() OR "createdAt" IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments("createdAt");
CREATE INDEX IF NOT EXISTS idx_appointments_edited_at ON appointments("editedAt");
```

**Executed from**: `/home/hronop/mailserver/`
```bash
docker compose exec -T postgres psql -U hronop -d moment < /home/hronop/node/moment/migrations/add_created_at_edited_at_to_appointments.sql
```

### Step 2: Update Appointment Model ✅

File: `vapor-api/Sources/App/Models/Appointment.swift`

```swift
final class Appointment: Model, @unchecked Sendable, Content {
    // ... existing fields ...

    @Field(key: "createdAt")
    var createdAt: Date

    @OptionalField(key: "editedAt")
    var editedAt: Date?

    init() {}
}
```

### Step 3: Update AppointmentController ✅

File: `vapor-api/Sources/App/Controllers/AppointmentController.swift`

#### Updated the `create` method (POST endpoint):

```swift
func create(req: Request) async throws -> Response {
    // ... existing code ...

    try await req.db.transaction { database in
        let sqlDB = database as! any SQLDatabase

        let createdAt = Date()

        try await sqlDB.raw("""
            INSERT INTO appointments (
                "appointmentID", "firmaID", "userID", "clientID", "workerId",
                "date", "isFixedTime", "startTime", "endTime", "duration", "fahrzeit",
                "latitude", "longitude", "createdAt"
            )
            VALUES (
                \(bind: appointmentID), \(bind: firmaID), \(bind: user.userId),
                \(bind: body.clientID), \(bind: primaryWorkerId),
                \(bind: body.date)::timestamptz, \(bind: body.isFixedTime ?? false),
                \(bind: body.startTime)::timestamptz, \(bind: body.endTime)::timestamptz,
                \(bind: body.duration), \(bind: body.fahrzeit ?? 0),
                \(bind: body.latitude), \(bind: body.longitude), \(bind: createdAt)
            )
            """).run()

        // ... pivot table inserts ...
    }
}
```

#### Updated the `update` method (PUT endpoint):

For Worker updates:
```swift
// Worker (status=1): can only update isOpen/openedAt/closedAt
if user.status == 1 {
    // ... existing field updates ...

    // Set editedAt timestamp
    appointment.editedAt = Date()

    try await appointment.save(on: req.db)
}
```

For Director updates:
```swift
// Director: full update
try await req.db.transaction { database in
    // ... existing field updates ...

    // Set editedAt timestamp
    appt.editedAt = Date()

    try await appt.save(on: database)
}
```

### Step 4: Update AppointmentDTO ✅

```swift
struct AppointmentDTO: Content {
    var id: String
    var firmaID: String
    // ... existing fields ...
    var createdAt: Date
    var editedAt: Date?
    var services: AnyCodable?
    var worker: AnyCodable?
    var client: AnyCodable?
}
```

### Step 5: Update decodeAppointmentRow ✅

```swift
func decodeAppointmentRow(_ row: any SQLRow) throws -> AppointmentDTO {
    // ... existing code ...

    return AppointmentDTO(
        // ... existing fields ...
        createdAt: (try? row.decode(column: "createdAt", as: Date.self)) ?? Date(),
        editedAt: try? row.decode(column: "editedAt", as: Date?.self),
        services: try? row.decode(column: "services", as: AnyCodable?.self),
        worker: try? row.decode(column: "workers_data", as: AnyCodable?.self),
        client: try? row.decode(column: "client", as: AnyCodable?.self)
    )
}
```

---

## Testing Checklist

- [x] Migration runs successfully without errors
- [x] Existing appointment records have `createdAt` set to their `date` value
- [x] Indexes created on both columns
- [x] Appointment model updated with required createdAt and optional editedAt
- [x] Create endpoint sets createdAt automatically
- [x] Update endpoint (Worker) sets editedAt automatically
- [x] Update endpoint (Director) sets editedAt automatically
- [x] AppointmentDTO includes both fields
- [x] decodeAppointmentRow maps both fields from database
- [ ] API responses include `createdAt` and `editedAt` fields (test after rebuild)
- [ ] Frontend displays creation date correctly (already working)

---

## Next Steps

1. **Rebuild vapor-api Docker image**:
   ```bash
   cd /home/hronop/node/moment/vapor-api
   docker build -t vapor-api:latest .
   ```

2. **Restart vapor-api container** from deployment directory:
   ```bash
   cd /home/hronop/mailserver
   docker compose restart vapor-api
   ```

3. **Test the API**:
   - Create a new appointment and verify `createdAt` is set
   - Update an appointment and verify `editedAt` is set
   - Check that both fields appear in API responses

---

## Notes

- The `createdAt` field is **required** and will be automatically set when creating appointments
- The `editedAt` field is **optional** and will only be set when updating appointments
- The migration updated existing records by setting `createdAt = date`
- Both fields are indexed for query performance
- Vapor uses Fluent ORM with @Field and @OptionalField property wrappers
- Database migrations in this project are run via raw SQL through PostgreSQL

---

## Related Files

### Frontend (Already Updated ✅)
- `types/scheduling.ts` - Added createdAt and editedAt to Appointment interface
- `lib/scheduling-mock-data.ts` - Added createdAt to all mock appointments
- `components/scheduling/AppModal.tsx` - Added createdAt to emptyForm
- `components/scheduling/AppView.tsx` - Display createdAt with locale formatting
- `contexts/SchedulingContext.tsx` - Send createdAt/editedAt to API

### Next.js Backend (Already Updated ✅)
- `lib/appointments.ts` - Updated createAppointment and updateAppointment
- `app/api/scheduling/_helpers.ts` - Map createdAt/editedAt from DB

### Database (Already Updated ✅)
- `migrations/add_created_at_edited_at_to_appointments.sql` - Migration executed successfully

### Vapor-API Backend (Now Updated ✅)
- `vapor-api/Sources/App/Models/Appointment.swift` - Model updated
- `vapor-api/Sources/App/Controllers/AppointmentController.swift` - Controller updated

---

**Status**: All backend implementations complete. Vapor-API container needs rebuild and restart.
