# useVisibilityRefresh Fix - Stale Closure Problem

> **Problem**: `useVisibilityRefresh` stopped working (callback not executing with fresh values)

---

## 🐛 Root Cause: Stale Closure

### What Happened:

**Before** ([page.tsx:229-244](./page.tsx#L229-L244)):
```typescript
// ❌ WRONG: Inline function creates NEW closure on every render
useVisibilityRefresh(() => {
  console.log('👁️ App returned to foreground - checking GPS tracking')

  // These values are captured from the FIRST render!
  if (myVehicle && !isTracking) {
    console.log('🔄 GPS tracking stopped - restarting...')
    requestPermission().then((granted) => {
      if (granted) {
        startTracking(myVehicle.id) // ❌ Uses OLD myVehicle!
      }
    })
  }
})
```

**Why it broke**:
1. Callback функция создаётся **на каждый render**
2. `callbackRef.current` обновляется в `useVisibilityRefresh` (lines 22-24)
3. **НО** callback closure захватывает значения `myVehicle`, `isTracking` **из первого рендера**
4. Когда приложение возвращается из фона → callback вызывается с **устаревшими** значениями!

---

## ✅ Solution: useCallback with Dependencies

**After** ([page.tsx:230-255](./page.tsx#L230-L255)):
```typescript
// ✅ CORRECT: useCallback creates stable reference with fresh dependencies
const handleForegroundRefresh = useCallback(() => {
  console.log('[Driver] 👁️ App returned to foreground - checking GPS tracking', {
    hasVehicle: !!myVehicle,
    isTracking,
    vehicleID: myVehicle?.id,
  })

  // These values are ALWAYS fresh from latest render!
  if (myVehicle && !isTracking) {
    console.log('[Driver] 🔄 GPS tracking stopped - restarting...', myVehicle.id)
    requestPermission().then((granted) => {
      if (granted) {
        console.log('[Driver] ✅ GPS permission granted, restarting tracking...')
        startTracking(myVehicle.id) // ✅ Uses CURRENT myVehicle!
      } else {
        console.log('[Driver] ❌ GPS permission denied')
      }
    })
  } else if (isTracking) {
    console.log('[Driver] ✅ GPS tracking still active')
  } else if (!myVehicle) {
    console.log('[Driver] ⚠️ No vehicle assigned to driver')
  }
}, [myVehicle, isTracking, requestPermission, startTracking])

useVisibilityRefresh(handleForegroundRefresh)
```

**Why it works**:
1. `useCallback` создаёт **стабильную** функцию reference
2. Когда зависимости меняются ([myVehicle, isTracking, ...]) → callback **перecоздаётся** с новыми значениями
3. `callbackRef.current` в `useVisibilityRefresh` обновляется на новый callback (lines 22-24)
4. Когда приложение возвращается из фона → callback имеет **актуальные** значения! ✅

---

## 🔍 Enhanced Logging

### Hook Logging ([useVisibilityRefresh.ts:27-63](../../hooks/useVisibilityRefresh.ts#L27-L63))

Added detailed logging to debug visibility events:

```typescript
console.log('[useVisibilityRefresh] Hook initialized')
console.log('[useVisibilityRefresh] visibilityState:', document.visibilityState)
console.log('[useVisibilityRefresh] 👁️ App became visible!')
console.log('[useVisibilityRefresh] ✅ Calling onForegroundRefresh callback')
console.log('[useVisibilityRefresh] Event listeners attached')
```

### Callback Logging ([page.tsx:231-252](./page.tsx#L231-L252))

Added detailed state logging:

```typescript
console.log('[Driver] 👁️ App returned to foreground - checking GPS tracking', {
  hasVehicle: !!myVehicle,
  isTracking,
  vehicleID: myVehicle?.id,
})

console.log('[Driver] 🔄 GPS tracking stopped - restarting...', myVehicle.id)
console.log('[Driver] ✅ GPS permission granted, restarting tracking...')
console.log('[Driver] ❌ GPS permission denied')
console.log('[Driver] ✅ GPS tracking still active')
console.log('[Driver] ⚠️ No vehicle assigned to driver')
```

---

## 🧪 How to Test

### Test Scenario 1: App goes to background

1. Open `/driver` page
2. Start GPS tracking (should see vehicle on map)
3. Open DevTools Console
4. Filter by: `[Driver]` or `[useVisibilityRefresh]`
5. **Switch to another tab** (e.g., open new tab)
6. Wait 5 seconds
7. **Switch back** to `/driver` tab

**Expected Console Output**:
```
[useVisibilityRefresh] visibilityState: hidden
... (other logs while in background)
[useVisibilityRefresh] visibilityState: visible
[useVisibilityRefresh] 👁️ App became visible!
[useVisibilityRefresh] ✅ Calling onForegroundRefresh callback
[Driver] 👁️ App returned to foreground - checking GPS tracking {
  hasVehicle: true,
  isTracking: true,
  vehicleID: "abc-123-..."
}
[Driver] ✅ GPS tracking still active
```

### Test Scenario 2: GPS tracking stopped while in background

1. Open `/driver` page
2. Start GPS tracking
3. Open DevTools Console
4. **Stop GPS tracking** manually (toggle switch OFF)
5. **Switch to another tab**
6. Wait 5 seconds
7. **Switch back** to `/driver` tab

**Expected Console Output**:
```
[useVisibilityRefresh] 👁️ App became visible!
[useVisibilityRefresh] ✅ Calling onForegroundRefresh callback
[Driver] 👁️ App returned to foreground - checking GPS tracking {
  hasVehicle: true,
  isTracking: false,      ← GPS stopped!
  vehicleID: "abc-123-..."
}
[Driver] 🔄 GPS tracking stopped - restarting... abc-123-...
[Driver] ✅ GPS permission granted, restarting tracking...
```

**Result**: GPS tracking should **automatically restart**! ✅

### Test Scenario 3: No vehicle assigned

1. Open `/driver` page **without assigned vehicle**
2. Open DevTools Console
3. Switch tabs and return

**Expected Console Output**:
```
[Driver] 👁️ App returned to foreground - checking GPS tracking {
  hasVehicle: false,
  isTracking: false,
  vehicleID: undefined
}
[Driver] ⚠️ No vehicle assigned to driver
```

---

## 📊 Debugging Checklist

Filter console by `[Driver]` or `[useVisibilityRefresh]` and check:

- [ ] `[useVisibilityRefresh] Hook initialized` - hook установлен
- [ ] `[useVisibilityRefresh] Event listeners attached` - listeners добавлены
- [ ] `visibilityState: hidden` - при переключении на другую вкладку
- [ ] `visibilityState: visible` - при возврате на вкладку
- [ ] `👁️ App became visible!` - событие обработано
- [ ] `✅ Calling onForegroundRefresh callback` - callback вызван
- [ ] `[Driver] 👁️ App returned to foreground` - callback выполнился
- [ ] `hasVehicle`, `isTracking`, `vehicleID` - **актуальные** значения (не undefined!)
- [ ] GPS перезапускается если `isTracking: false`

---

## 🔗 Related Files

- [page.tsx:230-255](./page.tsx#L230-L255) - Fixed callback with useCallback
- [useVisibilityRefresh.ts](../../hooks/useVisibilityRefresh.ts) - Hook with enhanced logging
- [useGeolocation.ts](../../hooks/useGeolocation.ts) - GPS tracking hook

---

## 📝 Why This Matters

**Проблема**: PWA приложения теряют Server-Sent Events (SSE) и WebSocket соединения при переходе в фоновый режим.

**Решение**: `useVisibilityRefresh` автоматически обнаруживает возврат из фона и перезапускает GPS tracking.

**Критично для**:
- Driver interface (реал-тайм GPS)
- Dispatcher interface (реал-тайм updates)
- Любые long-lived connections (SSE, WebSocket)

---

**Last updated:** 2026-03-18
**Status:** ✅ Fixed - useCallback with proper dependencies
