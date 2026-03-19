# APP_VERSION Toast Issue - Root Cause Analysis and Fix

## Problem Description

After migrating to HeroUI v3 RC-1, users started seeing the "Доступно обновление" toast on every page reload, even though there was no actual update available.

**Console Error:**
```
[PWA Update] Local version 0.1.42 is outdated. Server is on 1.0.0 (Vapor)
```

## Root Cause Analysis

### 1. Nginx Routing Issue (Primary Cause)

In production, nginx configuration had a **catch-all route** that proxied ALL `/api/*` requests to Vapor API, except for explicitly whitelisted Next.js routes:

```nginx
# Specific Next.js routes (whitelisted)
location ^~ /api/auth/ { proxy_pass http://localhost:3002; }
location = /api/convert-heic { proxy_pass http://localhost:3002; }
# ... other specific routes ...

# Catch-all: ALL other /api/* requests -> Vapor API
location ^~ /api/ {
    proxy_pass http://127.0.0.1:8080;  # Vapor API
}
```

**The Problem:**
- `/api/version` was NOT in the whitelist
- Therefore it was routed to Vapor API (port 8080)
- Vapor API returns `{"version": "1.0.0 (Vapor)"}`
- Next.js client expected `{"version": "0.1.42"}` from package.json
- Version mismatch = toast appears

### 2. HeroUI v3 Toast Behavior Change (Secondary Cause)

After migrating from HeroUI v2 to v3 RC-1, the toast component behavior changed:

**HeroUI v2:**
- Had built-in deduplication
- Same toast wouldn't appear multiple times

**HeroUI v3 RC-1:**
- No automatic deduplication
- Each `toast.info()` call creates a new toast
- `useAppVersion` hook calls `checkVersion()` on:
  - Component mount
  - Window `visibilitychange` event
  - Window `focus` event
  - Every page navigation

**Result:** Toast appeared on EVERY reload because version check happened frequently and always found a "mismatch".

### 3. Version Check Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Client (Browser)                                                │
│                                                                 │
│  hooks/useAppVersion.ts                                         │
│  ├─ currentVersion = process.env.APP_VERSION (0.1.42)          │
│  │  (set at BUILD TIME via next.config.js)                     │
│  │                                                              │
│  └─ Fetches: /api/version                                       │
│                                                                 │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ HTTPS Request
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Nginx (Reverse Proxy)                                           │
│                                                                 │
│  BEFORE FIX:                                                    │
│  /api/version -> Catch-all /api/ -> Vapor (8080) ❌             │
│                                                                 │
│  AFTER FIX:                                                     │
│  location = /api/version -> Next.js (3002) ✅                   │
│                                                                 │
└─────────────┬───────────────────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌─────────┐      ┌────────────┐
│ Next.js │      │ Vapor API  │
│ :3002   │      │ :8080      │
│         │      │            │
│ Returns │      │ Returns    │
│ 0.1.42  │      │ 1.0.0      │
│ ✅      │      │ ❌         │
└─────────┘      └────────────┘
```

## Solution

### Primary Fix: Nginx Configuration

Added explicit route for `/api/version` to proxy to Next.js BEFORE the catch-all Vapor route:

**File:** `/etc/nginx/sites-available/default`

**Location:** After `/api/staff/verify-push`, before `# 2. Storage APIs - Vapor` comment

```nginx
location = /api/version {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Why this works:**
- Nginx processes location blocks in order of specificity
- `location =` (exact match) has highest priority
- `/api/version` now goes to Next.js (3002) instead of Vapor (8080)
- Client gets correct version from package.json
- No version mismatch = no toast

### Deployment

1. **Test Configuration:**
```bash
sudo nginx -t
```

2. **Reload Nginx:**
```bash
sudo systemctl reload nginx
```

Or use the helper script:
```bash
./reload-nginx.sh
```

3. **Verify Fix:**
```bash
# Should return Next.js version
curl https://moment-lbs.app/api/version
# Expected: {"version":"0.1.42"}

# Vapor API still returns its own version
curl http://localhost:8080/api/version
# Expected: {"version":"1.0.0 (Vapor)"}
```

### Secondary Fixes (Defense in Depth)

These were also implemented to prevent duplicate toasts even if routing breaks:

**1. Dockerfile - Ensure package.json is available at runtime:**

```dockerfile
# Copy package.json for APP_VERSION env variable
COPY --from=builder /app/package.json ./package.json
```

**Note:** This doesn't actually affect runtime because `APP_VERSION` is set at BUILD TIME in `next.config.js` and becomes a string literal in the compiled code. But it's good practice.

**2. useAppVersion Hook - Toast Deduplication:**

```typescript
const hasShownToast = useRef(false)

// Only show toast once per session
if (hasShownToast.current) {
  console.log('[PWA Update] Toast already shown this session, skipping')
  return
}

hasShownToast.current = true
toast.info('🎉 Доступно обновление', { ... })
```

**3. Session Storage - Prevent toast after manual reload:**

```typescript
// Skip check immediately after user clicked "Обновить"
const justReloaded = sessionStorage.getItem('app-just-reloaded')
if (justReloaded) {
  sessionStorage.removeItem('app-just-reloaded')
  return
}

// Set flag before reload
sessionStorage.setItem('app-just-reloaded', 'true')
window.location.href = window.location.href
```

## Verification

### Before Fix:
```bash
$ curl https://moment-lbs.app/api/version
{"version":"1.0.0 (Vapor)"}  # ❌ Wrong!
```

### After Fix:
```bash
$ curl https://moment-lbs.app/api/version
{"version":"0.1.42"}  # ✅ Correct!
```

### Browser Console:
```
[PWA Update] Checking for app updates...
[PWA Update] Current version: 0.1.42
[PWA Update] Server version: 0.1.42
[PWA Update] App is up to date
```

## Why This Happened Now

1. **Regional Settings Implementation:** Large refactor increased reload frequency during testing
2. **HeroUI v3 RC-1 Migration:** Changed toast behavior (no auto-deduplication)
3. **Increased Visibility Events:** More tab switching during development triggered version checks
4. **Nginx Catch-All Route:** Existing misconfiguration only became visible with new toast behavior

## Lessons Learned

1. **Be explicit with nginx routing:** Don't rely on catch-all routes for critical endpoints
2. **Test API routing in production:** Development (localhost:3002) works differently than production (nginx proxy)
3. **Version checks should be idempotent:** Implement client-side deduplication regardless of backend behavior
4. **Document routing architecture:** Clear documentation prevents future regressions

## Related Files

- [/etc/nginx/sites-available/default](/etc/nginx/sites-available/default) - Nginx configuration
- [hooks/useAppVersion.ts](../hooks/useAppVersion.ts) - Version check hook
- [next.config.js](../next.config.js) - APP_VERSION environment variable
- [package.json](../package.json) - Source of version number
- [Dockerfile](../Dockerfile) - Production build configuration

## Testing Checklist

- [ ] `curl https://moment-lbs.app/api/version` returns `{"version":"0.1.42"}`
- [ ] No toast appears on page reload
- [ ] Console shows `[PWA Update] App is up to date`
- [ ] Changing package.json version and rebuilding triggers toast (when actually needed)
- [ ] Toast has "Обновить" button that clears cache and reloads
- [ ] After clicking "Обновить", no duplicate toast appears

## References

- [REGIONAL_SETTINGS.md](./REGIONAL_SETTINGS.md) - Related system documentation
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Nginx + Vapor + Next.js architecture
