# Regional Settings System

## Overview

The regional settings system allows users to configure their language, country, and cities preferences. This affects:
- Interface language (UI localization)
- Address autocomplete filtering (Photon API)
- City selection for specific operations

## Database Schema

### Users Table

Added fields to the `users` table:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS lang VARCHAR(5) NOT NULL DEFAULT 'de',
ADD COLUMN IF NOT EXISTS country VARCHAR(2) NOT NULL DEFAULT 'de',
ADD COLUMN IF NOT EXISTS "citiesID" INTEGER[];
```

- **lang**: ISO 639-1 language code (e.g., 'de', 'en', 'fr')
- **country**: ISO 3166-1 alpha-2 country code (e.g., 'de', 'us', 'fr')
- **citiesID**: Array of city IDs (foreign keys to cities table)

### Cities Table

```sql
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    "firmaID" VARCHAR(21) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cities_firma FOREIGN KEY ("firmaID") REFERENCES organisations("firmaID") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cities_firmaid ON cities("firmaID");
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_citiesid ON users USING GIN("citiesID");
```

## Architecture

### 1. Registration Flow

When a new user registers:

1. **Language Detection** (`getLocale()`)
   - Priority 1: Cookie `preferred-language`
   - Priority 2: `Accept-Language` HTTP header
   - Default: `'en'`

2. **Country Detection** (`detectCountryByIP()`)
   - Uses ipapi.co API to detect country by IP address
   - Returns ISO 3166-1 alpha-2 code (lowercase)
   - Returns empty string `''` for:
     - Local/private IPs (127.x.x.x, 192.168.x.x, ::1)
     - Detection failures
     - Timeouts (3 second limit)

3. **User Creation**
   ```typescript
   await createUserWithPassword(
     name,
     email,
     passwordHash,
     firmaID,
     status,
     lang,     // Detected language
     country   // Detected country (may be '')
   )
   ```

### 2. Session Management

#### JWT Callback (`lib/auth.ts`)

Adds regional settings to JWT token:

```typescript
token.lang = user.lang
token.country = user.country
token.citiesID = user.citiesID
```

**Important**: Uses `!== undefined` check instead of truthiness to allow empty strings:

```typescript
// ✅ Correct - allows empty strings
if (token.lang !== undefined) {
  session.user.lang = token.lang as string
}
if (token.country !== undefined) {
  session.user.country = token.country as string
}

// ❌ Wrong - filters out empty strings
if (token.lang) { // '' would be false
  session.user.lang = token.lang as string
}
```

#### Session Object

The session object contains:

```typescript
interface Session {
  user: {
    id: string
    email: string
    name: string
    lang: string      // ISO 639-1 language code
    country: string   // ISO 3166-1 alpha-2 country code (may be '')
    citiesID?: number[]
    // ... other fields
  }
}
```

### 3. Photon API Integration

#### Backend Filtering (`/api/photon/route.ts`)

The Photon API proxy performs server-side country filtering:

```typescript
// Get country from query parameter
const country = searchParams.get('country')

// Request more results to account for filtering
if (limit && country) {
  photonUrl.searchParams.set('limit', String(Math.min(parseInt(limit) * 3, 50)))
}

// Fetch from Photon
const data = await fetch(photonUrl).then(r => r.json())

// Filter by country (Photon doesn't support 'country' parameter natively)
if (country && data.features) {
  const countryUpper = country.toUpperCase()
  data.features = data.features.filter((feature: any) => {
    const featureCountry = feature.properties?.countrycode?.toUpperCase()
    return featureCountry === countryUpper
  })

  // Trim to original limit
  if (limit) {
    data.features = data.features.slice(0, parseInt(limit))
  }
}
```

**Why backend filtering?**
- Photon API doesn't support `country` parameter
- Reduces data sent to client
- Consistent filtering across all API consumers

#### Frontend Usage (`AddressAutocomplete.tsx`)

```typescript
const { session } = useAuth()

// Add country filter if available
const params = new URLSearchParams({
  q: query,
  limit: '10',
  lang: photonLang,
})

if (session?.user?.country) {
  params.append('country', session.user.country.toUpperCase())
}

const response = await fetch(`/api/photon?${params}`)
```

### 4. Address Formatting

The `formatAddress` function handles both cities and streets:

```typescript
const formatAddress = (feature: PhotonFeature): string => {
  const p = feature.properties

  // For places (cities/towns), use name instead of street
  // For addresses (streets/buildings), use street + housenumber
  const addressPart = p.street
    ? [p.street, p.housenumber].filter(Boolean).join(' ')
    : p.name

  const parts = [
    addressPart,
    p.postcode,
    p.city,
    p.country,
  ].filter(Boolean)

  return parts.join(', ')
}
```

**Examples**:
- City: `"Burg Stargard, 17094, Deutschland"`
- Street: `"Burgstraße 156, 53177, Bonn, Deutschland"`
- District: `"Burgstall an der Murr, 71576, Burgstetten, Deutschland"`

## API Endpoints

### GET/PATCH `/api/settings`

Manage user regional settings.

**Authentication**: Required (NextAuth session)

**GET Response**:
```json
{
  "lang": "de",
  "country": "de",
  "citiesID": [1, 2, 3]
}
```

**PATCH Request**:
```json
{
  "lang": "en",
  "country": "us",
  "citiesID": [4, 5]
}
```

**Updates**:
1. Database (PostgreSQL users table)
2. Session (NextAuth JWT token via callback trigger)
3. Cookie `preferred-language` (for language only)

### GET/POST/DELETE `/api/cities`

Manage cities for an organization.

**Authentication**: Required

**GET Response**:
```json
[
  {
    "id": 1,
    "city": "Bonn",
    "firmaID": "RkGvXq9mizBv0c63zO1Hg",
    "createdAt": "2026-03-19T10:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
]
```

**POST Request**:
```json
{
  "city": "Cologne"
}
```

**DELETE** `/api/cities/[id]`

### GET `/api/photon`

Photon geocoding API proxy with country filtering.

**Parameters**:
- `q` (required): Search query
- `limit`: Max results (default: 10)
- `lang`: Language code (default: 'de')
- `country`: ISO 3166-1 alpha-2 country code (filters results)
- `osm_tag`: OSM tag filter (e.g., 'place', 'highway')

**Example**:
```
GET /api/photon?q=Burgstrasse&country=DE&limit=10
```

**Response**: Standard Photon GeoJSON format (filtered by country)

## Components

### `<CityAutocomplete>`

City search autocomplete using Photon API.

**Props**:
```typescript
interface CityAutocompleteProps {
  value: string
  onChange: (cityName: string) => void
  placeholder?: string
  countryCode: string  // Required! Must select country first
  'aria-label'?: string
}
```

**Features**:
- Filters cities by `osm_tag=place`
- Filters by country using `countryCode` prop
- Only shows cities, towns, villages, municipalities
- Debounced search (300ms)
- Minimum 2 characters

**Usage**:
```tsx
<CityAutocomplete
  value={cityName}
  onChange={setCityName}
  countryCode={session.user.country}
  placeholder="Search for a city..."
/>
```

### `<AddressAutocomplete>`

Full address autocomplete using Photon API.

**Props**:
```typescript
interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  placeholder?: string
  fullWidth?: boolean
  'aria-label'?: string
}
```

**Features**:
- Auto-filters by user's country from session
- Returns address with coordinates
- Handles both cities and street addresses
- Debounced search (300ms)
- Minimum 3 characters

**Usage**:
```tsx
<AddressAutocomplete
  value={address}
  onChange={(addr, lat, lng) => {
    setAddress(addr)
    setCoordinates({ lat, lng })
  }}
  placeholder="Enter address..."
/>
```

## Settings Page

Location: `/[lang]/settings/page.tsx`

**Features**:
1. Language selector (ISO 639-1 codes)
2. Country selector (ISO 3166-1 alpha-2 codes)
3. City multi-select with autocomplete
4. Real-time sync to database and session

**Workflow**:
1. User selects country → saves to DB → updates session
2. User can now search cities (filtered by selected country)
3. User adds cities → saves to DB → updates session
4. AddressAutocomplete automatically uses new country filter

## Language Switcher

**Important**: Only updates DB if user is authenticated.

```typescript
// Save language to database (only if user is authenticated)
const updateLanguageInDB = async () => {
  // Skip if user is not logged in
  if (!session?.user) {
    console.log('[LanguageSwitcher] Skipping DB update - user not authenticated')
    return
  }

  await fetch('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({ lang: effectiveLang }),
  })
}
```

**Prevents**: 401 errors during logout or when not authenticated.

## Photon API Details

### Local vs Remote

The system uses different Photon instances based on country:

```typescript
// lib/european-countries.ts
export function getGeocodingApiUrl(countryCode: string | undefined | null): string {
  return isEuropeanCountry(countryCode)
    ? '/api/photon'  // Local Photon instance (Europe data)
    : 'https://photon.komoot.io/api'  // Komoot public API (worldwide)
}
```

**Local Photon**:
- Docker container: `photon` (port 2322)
- Dataset: Europe only
- Faster response times
- No rate limits

**Komoot Photon**:
- Public API: `https://photon.komoot.io/api`
- Dataset: Worldwide
- Rate limited (free tier)

### Country Filtering

**Problem**: Photon API doesn't support `country` parameter natively.

**Solution**: Backend filtering in `/api/photon/route.ts`

**Allowed Photon parameters**:
```
include, location_bias_scale, debug, dedupe, bbox, lon, zoom,
layer, q, limit, osm_tag, suggest_addresses, geometry, exclude,
lang, lat
```

**Our implementation**:
1. Request 3x the limit to ensure enough results after filtering
2. Filter by `feature.properties.countrycode`
3. Trim to original limit

## Common Issues & Solutions

### Issue: Country not filtering addresses

**Symptoms**: Seeing addresses from other countries despite selecting a country

**Causes**:
1. User session doesn't contain `country`
2. Component not passing `country` parameter

**Solution**:
1. Check session: `console.log(session?.user?.country)`
2. If `undefined` or `null`: Go to Settings → Select country
3. Logout/login to refresh session
4. Verify API request includes `country=DE` parameter (Network tab)

### Issue: Cities showing as "17094, Deutschland"

**Cause**: `formatAddress` using `street` field for places (cities)

**Solution**: Updated to use `name` for places without streets:
```typescript
const addressPart = p.street
  ? [p.street, p.housenumber].filter(Boolean).join(' ')
  : p.name
```

### Issue: Session callback not including empty country

**Cause**: Using `if (token.country)` which treats `''` as falsy

**Solution**: Use `!== undefined` check:
```typescript
// ✅ Correct
if (token.country !== undefined) {
  session.user.country = token.country as string
}
```

### Issue: LanguageSwitcher 401 error on logout

**Cause**: Trying to update DB when user is not authenticated

**Solution**: Check session before API call:
```typescript
if (!session?.user) {
  return // Skip DB update
}
```

## Testing

### Test Country Filter

```bash
# Without country filter - returns international results
curl "http://localhost:3007/api/photon?q=Burgst&limit=10" | jq '.features[].properties | {name, country: .countrycode}'

# With country filter - returns only German results
curl "http://localhost:3007/api/photon?q=Burgst&country=DE&limit=10" | jq '.features[].properties | {name, country: .countrycode}'
```

### Test Local Photon

```bash
# Direct local Photon query
curl "http://localhost:2322/api/?q=Bonn&lang=de&limit=5" | jq
```

### Check User Settings in Database

```bash
cd /home/hronop/mailserver && docker compose exec -T postgres psql -U hronop -d moment -c "SELECT \"userID\", email, lang, country FROM users ORDER BY date DESC LIMIT 5;"
```

## Migration Guide

### From Old System (No Regional Settings)

Existing users will have default values:
- `lang`: 'de' (set during initial migration)
- `country`: 'de' (set during initial migration)
- `citiesID`: NULL

**Migration SQL**:
```sql
-- Already applied in migrations/002_add_regional_settings.sql
UPDATE users
SET lang = 'de', country = 'de'
WHERE lang IS NULL OR country IS NULL;
```

### First Login After Migration

1. User logs in
2. JWT callback loads `lang='de'` and `country='de'` from DB
3. Session contains default regional settings
4. User can update via Settings page

## Future Enhancements

### Potential Improvements

1. **Auto-detect timezone** from country
2. **Currency settings** based on country
3. **Date/time format** preferences
4. **Distance units** (metric vs imperial)
5. **City radius filtering** for service areas
6. **Multiple country support** per user
7. **Postal code validation** based on country

### Performance Optimizations

1. **Cache Photon results** (Redis/in-memory)
2. **Prefetch common cities** for each country
3. **Lazy load country list** in Settings
4. **Virtualized city list** for large selections

## References

- Photon Documentation: https://photon.komoot.io/
- ISO 639-1 Language Codes: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- ISO 3166-1 Country Codes: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
- NextAuth.js Documentation: https://next-auth.js.org/
- ipapi.co API: https://ipapi.co/api/
