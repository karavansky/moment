# Real-Time Worker Status Sync (Hybrid Architecture)

To allow the Director to understand exactly what is happening on a worker's device, we will build a hybrid synchronization architecture:

1. **Verify Push Connection:** A direct ping from the Director's dashboard that sends a real APNs/FCM push notification to the worker's device. If Apple/Google responds with a `410 Gone` (Token deleted/unsubscribed), we immediately delete the ghost token from our database and turn off the worker's signal flag.
2. **Aggressive Lazy-Sync:** A background script in the PWA that silently reports the current GPS status, Battery Level, and PWA Version to the backend whenever the worker opens or switches to the app.

## User Review Required

> [!NOTE]
> Are you okay with the following field additions to the `users` table?
>
> - `pwaVersion` (string)
> - `osVersion` (string)
> - `batteryLevel` (integer: 0-100)
> - `batteryStatus` (string: "charging", "unplugged")

## Proposed Changes

### Database Extensions

- Add `pwaVersion`, `osVersion`, `batteryLevel`, and `batteryStatus` to the `users` table.

### Backend APIs

#### [NEW] `app/api/staff/ping/route.ts`

- Creates an endpoint for the Director to press "Verify Push".
- Parses the worker's `push_subscriptions`.
- Triggers `webpush.sendNotification()` with a silent test payload.
- If it throws a `Wait/Gone` error, deletes the subscription and updates `users.pushNotificationsEnabled = false`.

#### [NEW] `app/api/staff/sync-device/route.ts`

- Creates an endpoint for the PWA to report its current system settings.
- Updates `users` table with the provided GPS, Battery, and PWA version data.
- Updates `lastLoginAt` timestamp.

### Frontend

#### [MODIFY] `hooks/useDeviceSync.ts` (New Hook)

- A background hook placed in `DienstplanView` that runs on mount and on `visibilitychange`.
- Reads `navigator.permissions.query({ name: 'geolocation' })`.
- Reads `navigator.getBattery()` (if available).
- Reports them to `POST /api/staff/sync-device`.

#### [MODIFY] `app/[lang]/staff/WorkerTechStatus.tsx`

- Adds the "Verify Push Connection" button next to the Push Notifications status.
- Adds new UI rows showing the Battery and PWA version.

## Verification Plan

### Automated Tests

- N/A

### Manual Verification

1. I will log in as Breeder on the iPad and let the background script run, verifying the database updates with the Battery and GPS metadata.
2. I will log in as the Director on the desktop and click "Verify Push" to see the success logic.
3. I will revoke Push Notifications on the iPad Safari settings, click "Verify Push" as the Director, and ensure the DB drops the token and marks it as disconnected.

---

# PWA Installation UX

The user noted that Chrome on Desktop does not proactively offer to install the Moment LBS application as a PWA, unlike Safari on iOS/Mac which often has a more accessible share menu.

**Why does this happen?**
Chrome requires specific `manifest.json` parameters (specifically icons with purpose `any`) to show the native ambient install badge. More importantly, modern best practices dictate that the application itself should catch the `beforeinstallprompt` event and present a custom UI banner to guide the user to install the app.

## Proposed Changes

### [MODIFY] `app/manifest.ts`

- Add an icon to the `icons` array with `purpose: 'any maskable'` so Chrome strictly flags the app as installable.

### [NEW] `contexts/PWAInstallContext.tsx`

- To allow the `SettingsPage` to trigger the install prompt even after the banner is dismissed or unmounted, the `deferredPrompt` state MUST live in a React Context at the root of the app.
- Contains the `beforeinstallprompt` listener and the logic for `installPWA` and `dismissPrompt`.
- This replaces the standalone hook file `hooks/usePWAInstall.ts`.

### [MODIFY] `components/Providers.tsx`

- Mount `PWAInstallProvider` wrapping the application (instead of just the UI banner).

### [MODIFY] `components/PWAInstallBanner.tsx`

- Now consumes `usePWAInstall()` from the Context Provider.
- Only shows up if `isInstallable === true` and `isDismissed === false`.

### [MODIFY] `app/[lang]/settings/page.tsx`

- Adds a new option block: "Install Application".
- Consumes `usePWAInstall()` from Context.
- Checks if `isInstallable === true` (meaning Chrome caught a prompt and it wasn't yet installed).
- Shows an "Install App" button which triggers the native popup. If it's already installed, it either won't render or will show "App is installed".

---

# All-Day Appointments Display

The user wants to separate "All-Day" appointments (appointments not bound to a specific time, recorded as `00:00`) from the regular hourly time grid in the Calendar (WeeklyView). Currently, they appear in the `00:00 - 01:00` slot, which means users have to scroll up to see them during the day.

## Proposed Changes

### [MODIFY] `components/scheduling/WeeklyView.tsx`

- Refactor the `appointmentsByHour` memo to split appointments into two groups: `hourlyGroups` (appointments parsed into hours > 0) and `allDayApps` (appointments where `getHours() === 0 && getMinutes() === 0`).
- Update rendering: keep the `hourlyGroups` mapping for the 24-hour grid inside `ScrollShadow`.
- Before the `ScrollShadow` (where the user added "Foo" at line 202), add a new container: if `allDayApps.length > 0`, `.map` through `allDayApps` and render an `AppointmentCard` for each. Since it is outside of the scroll container, it will remain visibly pinned at the top of the column for that specific day.
