# Moment LBS Project - Architecture Overview

## Quick Reference

⚠️ **CRITICAL PATHS**:
- **Project source**: `/home/hronop/node/moment/`
- **Docker Compose**: `/home/hronop/mailserver/docker-compose.yml`
- **Nginx config**: `/etc/nginx/sites-available/default`

🐳 **Docker Commands**: ALWAYS run from `/home/hronop/mailserver/`
🔧 **Build**: Run `./ci.sh` from `/home/hronop/node/moment/`
🔀 **Two Backends**: Next.js (3002) + Vapor API (8080)

## Project Type
Full-stack logistics management system with GPS tracking, routing, and scheduling.

## Technology Stack

### Frontend
- **Framework**: Next.js 15+ (App Router, Turbopack)
- **UI Library**: HeroUI v3 RC-1 (React Aria Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js v5 (JWT strategy)
- **State**: React Context + hooks

### Backend (Dual Architecture)

⚠️ **IMPORTANT**: This project has **TWO separate backend services**:

#### 1. Next.js API Routes (Node.js)
- **Port**: 3002 (production), 3000/3001/3007 (dev variants)
- **Location**: `/app/api/**/*.ts`
- **Handles**:
  - Authentication (`/api/auth/*`)
  - Session management
  - Image conversion (`/api/convert-heic`)
  - SSE events (`/api/scheduling/events`, `/api/admin/sse-stats`)
  - Version endpoint (`/api/version`)
  - Photon geocoding proxy (`/api/photon`) with country filtering
  - Support tickets (`/api/support/tickets`)
  - Push notifications (`/api/staff/verify-push`)

#### 2. Vapor API (Swift)
- **Port**: 8080
- **Location**: `/vapor-api/Sources/App/**/*.swift`
- **Handles**:
  - Database CRUD operations (vehicles, drivers, routes, orders, tickets, etc.)
  - File storage (SeaweedFS proxy `/api/files/*`, `/api/seaweed-proxy/*`)
  - Routing calculations (`/api/routing`)
  - GPS tracking (`/api/vehicle-locations/*`)
  - Cities management (`/api/cities/*`)
  - User settings (`/api/settings`) - profile, preferences, regional settings
  - Most business logic

### Database
- **Type**: PostgreSQL
- **ORM**:
  - Next.js uses raw SQL queries via `db.ts`
  - Vapor uses Fluent ORM
- **Connection**: Docker Compose service

### Reverse Proxy (CRITICAL)

**Nginx** routes requests between Next.js and Vapor:

```nginx
# Specific Next.js routes (BEFORE catch-all)
location ^~ /api/auth/ { proxy_pass http://localhost:3002; }
location = /api/convert-heic { proxy_pass http://localhost:3002; }
location = /api/scheduling/events { proxy_pass http://localhost:3002; }
location = /api/admin/sse-stats { proxy_pass http://localhost:3002; }
location = /api/support/tickets { proxy_pass http://localhost:3002; }
location = /api/staff/verify-push { proxy_pass http://localhost:3002; }
location = /api/version { proxy_pass http://localhost:3002; }
location = /api/photon { proxy_pass http://localhost:3002; }

# Storage APIs (Vapor)
location ^~ /api/files/ { proxy_pass http://127.0.0.1:8080; }
location ^~ /api/seaweed-proxy/ { proxy_pass http://127.0.0.1:8080; }

# Catch-all: ALL other /api/* requests -> Vapor
location ^~ /api/ { proxy_pass http://127.0.0.1:8080; }

# SSR + Frontend -> Next.js
location / { proxy_pass http://localhost:3002/; }
```

**Key Points**:
- Order matters! Specific routes MUST come BEFORE `location ^~ /api/`
- If new Next.js API route is needed, add explicit `location =` block BEFORE catch-all
- Config file: `/etc/nginx/sites-available/default`
- Reload: `sudo systemctl reload nginx`
- Test: `sudo nginx -t`

### Deployment & Containerization

⚠️ **CRITICAL**: All Docker operations MUST be performed from `/home/hronop/mailserver/`

#### Docker Compose Location
```bash
# Main docker-compose.yml location (NOT in project directory!)
/home/hronop/mailserver/docker-compose.yml

# Project source code location
/home/hronop/node/moment/

# Build script location
/home/hronop/node/moment/ci.sh
```

#### Development
```bash
# From project directory
cd /home/hronop/node/moment
npm run dev  # Next.js on port 3000

# Vapor API (development)
cd /home/hronop/node/moment/vapor-api
swift run serve  # Port 8080
```

#### Production (Docker)

**Build and Deploy**:
```bash
# Step 1: Build Docker images (from project directory)
cd /home/hronop/node/moment
./ci.sh  # Builds moment:latest and vapor-api:latest

# Step 2: Deploy containers (from mailserver directory)
cd /home/hronop/mailserver
docker compose up -d moment vapor-api
docker compose logs -f moment vapor-api
```

**Important Docker Commands** (run from `/home/hronop/mailserver/`):
```bash
# View all services
docker compose ps

# View logs
docker compose logs moment
docker compose logs vapor-api
docker compose logs --tail=100 --follow moment

# Restart services
docker compose restart moment
docker compose restart vapor-api

# Rebuild and restart (full cycle)
cd /home/hronop/node/moment && ./ci.sh
cd /home/hronop/mailserver && docker compose up -d moment vapor-api

# Check service health
docker compose exec moment node -v
docker compose exec vapor-api /app/App --version

# Database access
docker compose exec postgres psql -U hronop -d moment
```

#### Docker Services (in docker-compose.yml)

**Main Application Stack**:
- `moment` - Next.js frontend/API (port 3002)
  - Image: `moment:latest`
  - Built from: `/home/hronop/node/moment/Dockerfile`
  - Exposed: `3002:3002`
  - Depends: postgres, redis, osrm

- `vapor-api` - Swift Vapor backend (port 8080)
  - Image: `vapor-api:latest`
  - Built from: `/home/hronop/node/moment/vapor-api/Dockerfile`
  - Exposed: `127.0.0.1:8080:8080` (localhost only, accessed via nginx)
  - Depends: postgres, seaweedfs, redis, osrm
  - Resources: 512MB RAM, 2 CPUs

**Data Services**:
- `postgres` - PostgreSQL 16 + PostGIS
  - Image: `postgis/postgis:16-3.4-alpine`
  - Container: `alpine`
  - Port: 5432
  - User: hronop
  - Database: moment
  - Volume: External persistent volume

- `redis` - Redis 7 (caching, pub/sub)
  - Port: 6379 (localhost only)
  - Max memory: 256MB (LRU eviction)
  - Resources: 512MB RAM, 1 CPU

- `seaweedfs` - Distributed file storage
  - Ports: 8333 (admin), 8888 (filer), 9333 (master)
  - All bound to localhost only
  - Volume: `./docker-data/seaweedfs`

**Geospatial Services**:
- `photon` - Geocoding API
  - Image: `rtuszik/photon-docker:latest`
  - Port: 2322
  - Region: Germany
  - Languages: en,de,es,fr,id,ja,pt,tr,uk,it,pl,ru
  - Volume: `./docker-data/photon`

- `osrm` - Routing engine
  - Image: `ghcr.io/project-osrm/osrm-backend`
  - Port: 5000
  - Algorithm: MLD (Multi-Level Dijkstra)
  - Data: `./docker-data/osrm/germany-latest.osrm`
  - Resources: 4GB RAM, 2 CPUs

**Admin Tools**:
- `pgadmin` - PostgreSQL web UI
  - Port: 5050 (localhost only, proxied via nginx at `/pgadmin/`)
  - Depends: postgres

- `mailserver` - Email server (separate project)
  - Ports: 25, 465, 587, 143, 993
  - Resources: 900MB RAM, 1.5 CPUs

**Other Services**:
- `blog` - Blog application (port 3000)
  - Image: `blog:latest`
  - Depends: postgres

#### Resource Limits

**Total VPS Resources**: 8GB RAM, 4 CPUs

**Allocation**:
- OSRM: 4GB RAM, 2 CPUs (largest consumer)
- Mailserver: 900MB RAM, 1.5 CPUs
- Vapor API: 512MB RAM, 2 CPUs
- Redis: 512MB RAM, 1 CPU
- Moment (Next.js): No explicit limit
- PostgreSQL: No explicit limit
- Other services: No explicit limits

#### Data Persistence

**Docker Volumes** (in `/home/hronop/mailserver/docker-data/`):
- `./docker-data/photon/` - Photon geocoding data
- `./docker-data/osrm/` - OSRM routing maps
- `./docker-data/seaweedfs/` - File storage
- `./docker-data/dms/` - Mail server data

**External Volumes**:
- `postgres-data` - PostgreSQL database (external named volume)
- `pgadmin-data` - pgAdmin settings (external named volume)
- `redis-data` - Redis persistence

#### Network Architecture

```
Internet (443/80)
    ↓
Nginx (/etc/nginx/sites-available/default)
    ├─→ moment-lbs.app/ → Next.js (moment:3002)
    ├─→ moment-lbs.app/api/auth/* → Next.js (moment:3002)
    ├─→ moment-lbs.app/api/version → Next.js (moment:3002)
    ├─→ moment-lbs.app/api/photon → Next.js (moment:3002)
    ├─→ moment-lbs.app/api/* → Vapor API (vapor-api:8080)
    ├─→ ws.moment-lbs.app → WebSocket server (3003)
    └─→ /pgadmin → pgAdmin (pgadmin:80)

Internal Docker Network:
    - moment → postgres:5432
    - moment → redis:6379
    - moment → osrm:5000
    - vapor-api → postgres:5432
    - vapor-api → seaweedfs:8888
    - vapor-api → redis:6379
    - vapor-api → osrm:5000
    - All services → photon:2322 (for geocoding)
```

#### Build Process (`./ci.sh`)

1. **Next.js Build**:
   ```bash
   docker build -t moment:latest .
   ```
   - Multi-stage build (builder + runner)
   - Standalone output mode
   - Includes package.json for APP_VERSION

2. **Vapor API Build**:
   ```bash
   cd vapor-api
   docker build -t vapor-api:latest .
   ```
   - Swift compilation in Docker
   - Release mode
   - Final image ~200MB

3. **Deploy**:
   ```bash
   cd /home/hronop/mailserver
   docker compose up -d moment vapor-api
   ```

### Regional Settings System

Users have regional preferences stored in database:
- `lang` - ISO 639-1 language code (de, en, fr, ru, uk, etc.)
- `country` - ISO 3166-1 alpha-2 country code (DE, FR, US, UA, etc.)
- `citiesID` - Allowed cities for this user (comma-separated IDs)

**Session Flow**:
1. User authenticates via NextAuth.js
2. JWT callback fetches `lang`, `country`, `citiesID` from database
3. Session includes these fields in `session.user.*`
4. Frontend components use `useAuth()` to access regional settings
5. API endpoints filter results by user's country/cities

**Important Files**:
- `lib/auth.ts` - NextAuth configuration with regional settings
- `components/AuthProvider.tsx` - React context for session
- `app/api/photon/route.ts` - Geocoding with country filter
- `vapor-api/Sources/App/Controllers/PhotonController.swift` - Vapor country filtering
- `docs/REGIONAL_SETTINGS.md` - Comprehensive documentation

### File Structure

```
/home/hronop/node/moment/
├── app/                    # Next.js App Router
│   ├── [lang]/            # Localized routes
│   ├── api/               # Next.js API routes (Node.js)
│   └── globals.css
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (auth, db, etc.)
├── vapor-api/            # Swift Vapor backend
│   └── Sources/App/
│       ├── Controllers/
│       ├── Models/
│       └── routes.swift
├── docs/                  # Architecture documentation
│   ├── BACKEND_ARCHITECTURE.md
│   ├── REGIONAL_SETTINGS.md
│   └── APP_VERSION_TOAST_FIX.md
├── .claude/              # Claude Code config
├── docker-compose.yml
├── Dockerfile
└── ci.sh                 # Production build script
```

## Important Conventions

### When Adding New API Endpoints

1. **Decide which backend**:
   - Node.js-specific (auth, SSE, image processing) → Next.js
   - Database CRUD, file storage → Vapor
   - Heavy computation, Swift performance → Vapor

2. **If Next.js**: Create `/app/api/[path]/route.ts`

3. **If Vapor**: Create controller in `vapor-api/Sources/App/Controllers/`

4. **Update nginx**: Add specific location block BEFORE catch-all if route should go to Next.js

### Common Pitfalls

❌ **Don't assume all `/api/*` goes to Next.js** - Most goes to Vapor!
❌ **Don't forget nginx routing** - New Next.js routes need explicit nginx config
❌ **Don't use sudo without checking** - User prefers minimal sudo usage
❌ **Don't add workarounds** - User wants root cause analysis and proper fixes
❌ **Don't run docker commands from `/home/hronop/node/moment/`** - Must use `/home/hronop/mailserver/`!
❌ **Don't look for docker-compose.yml in project directory** - It's in `/home/hronop/mailserver/`!

✅ **Do check which backend handles the endpoint**
✅ **Do test both localhost (dev) and production (nginx) routing**
✅ **Do understand architecture before suggesting changes**
✅ **Do read existing documentation in /docs/**
✅ **Do run all `docker compose` commands from `/home/hronop/mailserver/`**
✅ **Do build images from project dir, but deploy from mailserver dir**

## User Preferences

- **Language**: Mixed Russian/English (responds in both)
- **Approach**: Prefers understanding root causes over quick fixes
- **Sudo**: Minimizes sudo usage, provides scripts when needed
- **Documentation**: Values comprehensive docs with examples
- **Debugging**: Likes detailed logging and step-by-step analysis

## Domains

- **Production**: moment-lbs.app (port 443 via nginx)
- **Dev**: dev.moment-lbs.app
- **WebSocket**: ws.moment-lbs.app
- **Old domain**: quailbreeder.net (redirects to moment-lbs.app)

## Key External Services

- **Photon Geocoding**:
  - Local: http://photon:2322/api (Docker)
  - Fallback: https://photon.komoot.io/api/
- **OSRM Routing**: http://localhost:5000 (Docker)
- **SeaweedFS**: http://localhost:8888 (Docker)

## Recent Major Changes

1. **HeroUI v3 RC-1 Migration** (March 2026)
   - Migrated from HeroUI v2 to v3 beta
   - New toast behavior (no auto-deduplication)
   - Compound components pattern

2. **Regional Settings System** (March 2026)
   - Added lang/country/citiesID to users table
   - Country filtering in Photon API
   - Session-based regional preferences

3. **GPS Tracking with Road Snapping** (March 2026)
   - Real-time vehicle location tracking
   - OSRM road snapping
   - Interpolation for smooth movement

## Demo / Mock Data Mode

When user is **not authenticated**, the app loads mock data so visitors can explore a fully functional UI with pre-filled data.

### How It Works

1. **Detection**: `SchedulingContext` checks `authStatus` from NextAuth + user's `firmaID`/`status`
   - Authenticated with valid firma → **Live Mode** (API: `/api/scheduling`)
   - Otherwise → **Mock Mode** (local mock data)

2. **Entry Point**: Landing page (`app/[lang]/home/HomeClient.tsx`) has a "Try Demo" button → calls `startDemo()` from `DemoContext` → navigates to `/dispatcher`

3. **Data Loading** (`contexts/SchedulingContext.tsx`):
   - `loadMockData()` — calls `getAllSampleObjects()` from `lib/scheduling-mock-data.ts`
   - `loadLiveData()` — fetches from `/api/scheduling`
   - Decision made in `useEffect` watching `authStatus`

4. **Demo Notifications** (`components/DemoNotificationWorker.tsx`):
   - When `isDemoActive === true` && `isLiveMode === false`
   - Opens a demo appointment, shows 8 sequential notifications (every ~10s)

### Key Files

| File | Role |
|------|------|
| `contexts/SchedulingContext.tsx` | Central orchestrator — decides mock vs live, loads data |
| `contexts/DemoContext.tsx` | Tracks `isDemoActive` state (`startDemo()` / `stopDemo()`) |
| `lib/scheduling-mock-data.ts` | Scheduling mock data (workers, clients, appointments, services) |
| `lib/transport-mock-data.ts` | Transport mock data (vehicles, orders, routes — Cologne area) |
| `components/DemoNotificationWorker.tsx` | Shows demo notifications sequence |
| `app/[lang]/home/HomeClient.tsx` | "Try Demo" button entry point |

### Important

- Mock data uses hardcoded `firmaID`: `3Eoxlmzdr4uEJggFueFnB`
- Appointments have **dynamic dates** relative to current date
- Appointment state overrides are persisted in `sessionStorage` (survives HMR)
- ⚠️ Any fetch to backend APIs (e.g. `/api/push/subscribe`) must check `authStatus === 'authenticated'` first — otherwise returns 401

## Documentation Index

- Architecture: `docs/BACKEND_ARCHITECTURE.md`
- Regional Settings: `docs/REGIONAL_SETTINGS.md`
- Version Toast Fix: `docs/APP_VERSION_TOAST_FIX.md`
- GPS Tracking: `app/[lang]/driver/GPS_INTERPOLATION_ARCHITECTURE.md`
- Vapor API: `vapor-api/VAPOR-API.md`

---

## AI Agent Integration (MCP Servers)

This project is configured to work with AI coding agents through **Model Context Protocol (MCP)** servers.

### Available MCP Servers

#### 1. Next.js Built-in MCP (Next.js 16.2+)

**Endpoint**: `http://localhost:3007/_next/mcp`

**Status**: ✅ Active (built-in, no installation needed)

**Configuration** (`next.config.js`):
```javascript
logging: {
  browserToTerminal: true  // Client-side errors forwarded to terminal
}
```

**Capabilities**:
- 📁 Project structure and file organization
- 🛣️ All Next.js routes (pages and API endpoints)
- ⚛️ React DevTools integration
- 🔍 Next.js diagnostics and build info
- 🌳 Component trees, props, and hooks
- ⚠️ Browser console logs in terminal
- 🐛 Real-time error detection (build/runtime/type errors)

**Usage**: Active during `npm run dev` on port 3007

---

#### 2. HeroUI React MCP Server

**Package**: `@heroui/react-mcp`

**Status**: ✅ Active

**Run command**:
```bash
npm exec @heroui/react-mcp@latest
```

**Capabilities**:
- 📚 HeroUI v3 component documentation
- 🎨 Component props and API reference
- 💅 Styling and theming information
- 🔧 Usage examples and patterns
- 📖 Migration guides from v2 to v3

**When to use**:
- Working with HeroUI components
- Need component documentation
- Customizing themes
- Checking available props/variants

**Important**: This provides **v3 Beta documentation only** (not v2)

---

#### 3. Next.js DevTools MCP Server (Optional)

**Package**: `next-devtools-mcp`

**Status**: ✅ Installed globally

**Installation**:
```bash
npm install -g next-devtools-mcp@latest
# or
npx next-devtools-mcp@latest
```

**Capabilities** (extends built-in MCP):
- 📚 Search Next.js official documentation
- 🔄 Automated codemod execution for upgrades
- 🔍 Enhanced runtime diagnostics
- ⚠️ Advanced error detection and analysis
- 🛠️ Development tools for AI agents

**Usage**:
```bash
# Run the MCP server
next-devtools-mcp

# Or use via npx
npx next-devtools-mcp@latest
```

---

### How AI Agents Use MCP

```
AI Agent (Claude Code, Cursor, etc.)
    ↓
MCP Protocol (SSE/JSON-RPC)
    ↓
┌─────────────────────────────────────┐
│  Next.js Built-in MCP               │ → Project metadata, routes, errors
│  http://localhost:3007/_next/mcp    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  HeroUI React MCP                   │ → Component docs, examples
│  @heroui/react-mcp                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Next.js DevTools MCP (optional)    │ → Docs search, codemods
│  next-devtools-mcp                  │
└─────────────────────────────────────┘
```

### Benefits for AI Development

✅ **Better Context**: AI understands project structure automatically
✅ **Faster Development**: Direct access to documentation and diagnostics
✅ **Error Prevention**: Real-time error detection and suggestions
✅ **Accurate Suggestions**: Framework-aware code completions
✅ **Documentation Access**: Instant access to Next.js and HeroUI docs

### Debugging MCP Servers

**Check Next.js MCP endpoint**:
```bash
curl http://localhost:3007/_next/mcp
# Should return: {"jsonrpc":"2.0","error":{"code":-32000,...}}
# (Error is normal - requires SSE connection)
```

**Check running MCP processes**:
```bash
ps aux | grep -i mcp
# Should show: heroui-react-mcp and optionally next-devtools-mcp
```

**View browser logs in terminal**:
```bash
npm run dev
# Open browser → Console errors will appear in terminal
```

---

## Internationalization (i18n) Guide

### Architecture

- **Dictionary files**: `config/dictionaries/{lang}.json` (12 languages: de, en, ru, uk, es, fr, id, it, ja, pl, pt, tr)
- **Loader**: `config/dictionaries.ts` — uses `unstable_cache` with `revalidate: false` (permanent cache)
- **Hook**: `useTranslation()` from `components/Providers.tsx` — returns `{ t, dict }`
- **Usage**: `t('path.to.key', 'fallback')` — dot-notation path through JSON

### Step-by-step: Internationalize a Component

1. **Find hardcoded strings**:
   ```bash
   # Find Cyrillic strings
   grep -n "'[А-Яа-яЁё]" components/MyComponent.tsx
   # Find all quoted strings (manual review)
   grep -n ">[A-Z][a-z]" components/MyComponent.tsx
   ```

2. **Add `useTranslation` hook** (if not already present):
   ```tsx
   import { useTranslation } from '@/components/Providers'
   // Inside component:
   const { t } = useTranslation()
   ```

3. **Replace strings with `t()` calls**:
   ```tsx
   // Before:
   <p>Загрузка...</p>
   // After:
   <p>{t('myComponent.loading', 'Loading...')}</p>
   ```
   Always provide English fallback as second argument.

4. **Add keys to ALL 12 dictionaries** using batch script:
   ```bash
   cd config/dictionaries
   python3 << 'PYEOF'
   import json
   translations = {
       "de": {"loading": "Wird geladen..."},
       "en": {"loading": "Loading..."},
       "ru": {"loading": "Загрузка..."},
       "uk": {"loading": "Завантаження..."},
       "es": {"loading": "Cargando..."},
       "fr": {"loading": "Chargement..."},
       "id": {"loading": "Memuat..."},
       "it": {"loading": "Caricamento..."},
       "ja": {"loading": "読み込み中..."},
       "pl": {"loading": "Ładowanie..."},
       "pt": {"loading": "Carregando..."},
       "tr": {"loading": "Yükleniyor..."},
   }
   for lang, tr in translations.items():
       with open(f'{lang}.json', 'r') as f:
           data = json.load(f)
       data['myComponent'] = tr  # or data['existing']['newKey'] = tr['newKey']
       with open(f'{lang}.json', 'w') as f:
           json.dump(data, f, ensure_ascii=False, indent=2)
       print(f'{lang}: OK')
   PYEOF
   ```

5. **Clear cache and restart dev server**:
   ```bash
   rm -rf .next/cache && npm run dev
   ```
   ⚠️ `unstable_cache` with `revalidate: false` means dictionaries are cached permanently. New keys won't appear without cache clear!

### For non-React files (utilities, mock data)

Pass `t` function as parameter:
```tsx
// In utility file:
type TranslateFn = (key: string, fallback?: string) => string
export function myUtil(t?: TranslateFn) {
  const tr = (key: string, fallback: string) => t ? t(key, fallback) : fallback
  return { label: tr('myKey', 'English fallback') }
}

// In component:
const { t } = useTranslation()
const data = myUtil(t)
```

### Key Naming Conventions

- Top-level namespace = feature/component: `dispatcher.*`, `sidebar.*`, `appointment.*`
- Shared strings: `common.cancel`, `common.delete`, `common.save`
- Nested by context: `appointment.edit.deleteTitle`, `appointment.report.clientReview`
- Status enums: `dispatcher.status.CREATED`, `dispatcher.status.COMPLETED`

### Common Pitfalls

❌ **Don't forget to add keys to ALL 12 dictionaries** — missing key = console warning
❌ **Don't use `json.dump` carelessly** — it rewrites the entire file, verify structure after
❌ **Don't forget cache clear** — `rm -rf .next/cache` after changing dictionary files
❌ **Don't put `t()` in non-component functions** — pass `t` as parameter instead
✅ **Always provide fallback** — `t('key', 'English fallback')` for graceful degradation
✅ **Check existing keys first** — `grep -n "yourKey" config/dictionaries/de.json`
✅ **Verify after batch update** — `python3 -c "import json; d=json.load(open('de.json')); print(d['yourSection'])"` 

---

**When starting a new session, read this file first to understand the project architecture!**
