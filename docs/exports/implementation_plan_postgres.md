# Fix Language Reset on Logout

The issue occurs because the `signOut` function in `AuthProvider.tsx` ignores any parameters passed to it and attempts to extract the locale from `window.location.pathname`. On paths where the locale is omitted from the URL (like the root `/` path), it defaults to `en` and routes the user to `/en/auth/signout`.

## User Review Required
No critical concerns. The changes only affect the locale determination during the logout flow.

## Proposed Changes

### AuthProvider and LoginLogout
We will update `AuthProvider.tsx` to accept a `callbackUrl` parameter in its `signOut` function, extract the locale from it if available, and fallback to the URL parsing if not. We will also update `LoginLogout.tsx` to always pass the correct `callbackUrl` string incorporating the current localized language.

#### [MODIFY] [AuthProvider.tsx](file:///home/hronop/node/moment/components/AuthProvider.tsx)
- Change `signOut` signature to accept `callbackUrl?: string`.
- Update the locale extraction logic to prefer the locale found in `callbackUrl` if it exists.

#### [MODIFY] [LoginLogout.tsx](file:///home/hronop/node/moment/components/LoginLogout.tsx)
- Update `handleStaff` to call `signOut(\`/${lang}/auth/signin\`)` instead of just `signOut()`, matching the behavior in `handleAdmin` and `handleAuth`.

## Verification Plan

### Manual Verification
1. Log into the application as a `staff` member, an `admin`, and a regular user.
2. Next, ensure the language is set to DE (German).
3. Open the user dropdown menu and click "Log Out".
4. Observe the redirect flow. The user should be redirected to `/de/auth/signin` rather than `/en/auth/signin`. 
5. The language should securely remain DE over the course of the logout action.
