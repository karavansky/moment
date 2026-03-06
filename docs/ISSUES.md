# Known Issues

## Backend (Vapor API)

### Issue 1: Missing authentication token on device sync

**Status:** 🔴 Open
**Priority:** High
**Affected endpoint:** `POST /api/staff/sync-device`

**Error:**
```
[ WARNING ] No authentication token found in cookies or headers
[ WARNING ] Abort.401: Missing authentication token
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_7...)
```

**Description:**
iPhone app sends request to `/api/staff/sync-device` without JWT token in headers or cookies.

**Root Cause:**
- Client-side: Not sending `Authorization: Bearer <token>` header
- OR Backend: Not checking correct auth header/cookie

**To Reproduce:**
1. Open PWA on iPhone (iOS 18.7)
2. App attempts to sync device on load
3. Request fails with 401

**Expected Behavior:**
- Client should include JWT token in request
- Backend should accept token from header or cookie

**Fix Priority:** High (blocks device sync on mobile)

---

### Issue 2: Duplicate push subscription error

**Status:** 🔴 Open
**Priority:** Medium
**Affected endpoint:** `POST /api/push/subscribe`

**Error:**
```
PSQLError: duplicate key value violates unique constraint "push_subscriptions_endpoint_key"
Constraint: push_subscriptions_endpoint_key
Table: push_subscriptions
Column: endpoint
```

**Description:**
When user re-subscribes to push notifications (e.g. after reinstalling PWA or clearing data), backend tries to INSERT a new subscription with existing `endpoint`, causing constraint violation.

**Root Cause:**
Backend uses `INSERT` instead of `UPSERT` (INSERT ... ON CONFLICT UPDATE).

**Current DB Schema:**
```sql
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  userID UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,  -- ⚠️ UNIQUE constraint
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  lastUsedAt TIMESTAMP DEFAULT NOW()
);
```

**To Reproduce:**
1. Subscribe to push notifications in PWA
2. Close PWA or clear browser data
3. Reopen PWA and subscribe again
4. Backend throws duplicate key error

**Expected Behavior:**
- If `endpoint` exists → UPDATE existing subscription
- If `endpoint` is new → INSERT new subscription

**Solution:**
Change PushController.swift to use UPSERT:

```swift
// Current (broken):
let subscription = PushSubscription(
  userID: user.id,
  endpoint: body.subscription.endpoint,
  p256dh: body.subscription.keys.p256dh,
  auth: body.subscription.keys.auth
)
try await subscription.create(on: req.db)

// Fixed (UPSERT):
try await req.db.raw("""
  INSERT INTO push_subscriptions (userID, endpoint, p256dh, auth, createdAt, lastUsedAt)
  VALUES (\(bind: user.id), \(bind: body.subscription.endpoint), \(bind: body.subscription.keys.p256dh), \(bind: body.subscription.keys.auth), NOW(), NOW())
  ON CONFLICT (endpoint)
  DO UPDATE SET
    userID = EXCLUDED.userID,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    lastUsedAt = NOW()
""").run()
```

**Fix Priority:** Medium (user can still receive notifications, just sees error in logs)

---

## Frontend

### Issue 3: Geolocation fails on iPhone (RESOLVED)

**Status:** ✅ Resolved
**Priority:** Critical

**Description:**
Geolocation stopped working on iPhone after migrating to Vapor API.

**Root Cause:**
Missing error logging in `getGeoData()` function made it impossible to diagnose failures.

**Fix:**
Added comprehensive logging to AppReport.tsx and AppointmentReport.tsx:
- Log when requesting position
- Log success with coordinates and accuracy
- Log errors with code and message

**Commit:** (current changes)

---

## Testing Notes

### Device Sync Issue
- Affects: iPhone iOS 18.7, Safari
- Does NOT affect: Desktop Chrome, Android
- Workaround: None (feature completely broken on iOS)

### Push Subscription Issue
- Affects: All platforms on re-subscribe
- Workaround: Delete old subscription from DB manually
- Frequency: Low (only happens on PWA reinstall)

---

## Priority Legend

- 🔴 **Critical**: Blocks core functionality, must fix ASAP
- 🟠 **High**: Important feature broken, fix soon
- 🟡 **Medium**: Minor issue, fix when possible
- 🟢 **Low**: Nice to have, low priority
- ✅ **Resolved**: Fixed and deployed
