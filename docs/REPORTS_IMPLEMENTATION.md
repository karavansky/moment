# Reports CRUD Implementation — Resumption Guide

This document describes a pending feature implementation. If context runs out, use this as the starting point for a new session.

## Problem Being Solved

- Reports are only stored in frontend context (never persisted to DB)
- `/api/reports/save` only moves S3 files, never writes to `reports` or `report_photos` tables
- UI has a single notes text area with Save/Cancel buttons — needs to be replaced by per-session rows

## What Needs to Be Built

**Each appointment has many "report sessions" (work periods). Each session:**
- Created when worker presses **Start** → `openAt` + worker GPS + reverse-geocoded address + distance to client
- Closed when worker presses **Finish** → `closeAt` + worker GPS + reverse-geocoded address + distance to client
- Has editable `notes` (saved via floppy disk icon)
- Has multiple photos (uploaded on-the-fly, auto-saved to DB)

**Goal:** Detect forgotten-finish cases by checking `closeAt IS NULL` but `openAt IS NOT NULL` on a report.

---

## DB Schema Changes

Run `scripts/add-report-timestamps.sql` against PostgreSQL (file to be created):

```sql
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS "openAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "closeAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "openLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "openLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "openAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "openDistanceToAppointment" INTEGER,
  ADD COLUMN IF NOT EXISTS "closeLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "closeLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "closeAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "closeDistanceToAppointment" INTEGER;
```

---

## Files to Create/Modify

### NEW files:
| File | Purpose |
|------|---------|
| `scripts/add-report-timestamps.sql` | DB migration |
| `app/api/photon/reverse/route.ts` | Reverse geocoding proxy (Photon) |
| `app/api/reports/route.ts` | POST — create report session |
| `app/api/reports/[reportId]/route.ts` | PATCH — update session (closeAt, notes, closeGeo) |
| `app/api/reports/photos/[photoId]/route.ts` | DELETE — remove photo from report_photos |

### MODIFIED files:
| File | Change |
|------|--------|
| `types/scheduling.ts` | Add 10 fields to `Report` interface |
| `lib/reports.ts` | Add `createReportSession`, `updateReport`, `addPhotoToReport`, `removePhotoFromReport` |
| `app/api/reports/save/route.ts` | Change to single-photo save + write to `report_photos` DB |
| `app/api/scheduling/route.ts` | Map new fields in reports section (~line 142) |
| `components/scheduling/AppointmentReport.tsx` | Major UI rewrite |

---

## Type Changes (`types/scheduling.ts`)

Add to `Report` interface:
```typescript
openAt?: Date
closeAt?: Date
openLatitude?: number
openLongitude?: number
openAddress?: string
openDistanceToAppointment?: number
closeLatitude?: number
closeLongitude?: number
closeAddress?: string
closeDistanceToAppointment?: number
```

---

## DB Library Changes (`lib/reports.ts`)

Update `ReportRecord` interface with all new fields (same as above but Date types).

### New function: `createReportSession`
```typescript
export async function createReportSession(
  firmaID: string,
  data: {
    workerId: string
    appointmentId: string
    openAt: Date
    openLatitude?: number
    openLongitude?: number
    openAddress?: string
    openDistanceToAppointment?: number
  }
): Promise<ReportRecord> {
  const reportID = generateId(20)
  const result = await pool.query(`
    INSERT INTO reports ("reportID", "firmaID", "workerId", "appointmentId", "openAt",
      "openLatitude", "openLongitude", "openAddress", "openDistanceToAppointment")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [reportID, firmaID, data.workerId, data.appointmentId, data.openAt,
     data.openLatitude ?? null, data.openLongitude ?? null,
     data.openAddress ?? null, data.openDistanceToAppointment ?? null]
  )
  return result.rows[0]
}
```

### New function: `updateReport`
```typescript
export async function updateReport(
  reportID: string, firmaID: string,
  data: {
    closeAt?: Date; notes?: string
    closeLatitude?: number; closeLongitude?: number
    closeAddress?: string; closeDistanceToAppointment?: number
  }
): Promise<ReportRecord | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let idx = 1
  if (data.closeAt !== undefined)   { setClauses.push(`"closeAt" = $${idx++}`); values.push(data.closeAt) }
  if (data.notes !== undefined)     { setClauses.push(`"notes" = $${idx++}`); values.push(data.notes) }
  if (data.closeLatitude !== undefined) { setClauses.push(`"closeLatitude" = $${idx++}`); values.push(data.closeLatitude) }
  if (data.closeLongitude !== undefined){ setClauses.push(`"closeLongitude" = $${idx++}`); values.push(data.closeLongitude) }
  if (data.closeAddress !== undefined)  { setClauses.push(`"closeAddress" = $${idx++}`); values.push(data.closeAddress) }
  if (data.closeDistanceToAppointment !== undefined) { setClauses.push(`"closeDistanceToAppointment" = $${idx++}`); values.push(data.closeDistanceToAppointment) }
  if (setClauses.length === 0) return null
  values.push(reportID, firmaID)
  const result = await pool.query(
    `UPDATE reports SET ${setClauses.join(', ')} WHERE "reportID" = $${idx++} AND "firmaID" = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] ?? null
}
```

### New functions: `addPhotoToReport`, `removePhotoFromReport`
```typescript
export async function addPhotoToReport(reportID: string, photoId: string, data: { url: string; note: string }): Promise<void> {
  await pool.query(
    `INSERT INTO report_photos ("photoID","reportID","url","note") VALUES ($1,$2,$3,$4)`,
    [photoId, reportID, data.url, data.note]
  )
}

export async function removePhotoFromReport(photoID: string): Promise<void> {
  await pool.query(`DELETE FROM report_photos WHERE "photoID" = $1`, [photoID])
}
```

---

## New API Routes

### `app/api/photon/reverse/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat'), lon = searchParams.get('lon'), lang = searchParams.get('lang') || 'de'
  if (!lat || !lon) return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  // Photon's /reverse endpoint is on same host as /api, strip /api suffix
  const baseUrl = (process.env.PHOTON_URL || 'https://photon.komoot.io/api/').replace(/\/api\/?$/, '')
  const url = new URL(`${baseUrl}/reverse`)
  url.searchParams.set('lat', lat); url.searchParams.set('lon', lon); url.searchParams.set('lang', lang)
  try {
    const res = await fetch(url.toString())
    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json({ features: [], error: err.message }, { status: 500 })
  }
}
```

### `app/api/reports/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createReportSession } from '@/lib/reports'
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  const { appointmentId, workerId, firmaID, openAt, openLatitude, openLongitude, openAddress, openDistanceToAppointment } = await request.json()
  const report = await createReportSession(firmaID, {
    workerId, appointmentId, openAt: new Date(openAt),
    openLatitude, openLongitude, openAddress, openDistanceToAppointment
  })
  return NextResponse.json({ report })
}
```

### `app/api/reports/[reportId]/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateReport } from '@/lib/reports'
type Params = { params: Promise<{ reportId: string }> }
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  const { reportId } = await params
  const data = await request.json()
  const report = await updateReport(reportId, session.user.firmaID!, {
    closeAt: data.closeAt ? new Date(data.closeAt) : undefined,
    notes: data.notes,
    closeLatitude: data.closeLatitude,
    closeLongitude: data.closeLongitude,
    closeAddress: data.closeAddress,
    closeDistanceToAppointment: data.closeDistanceToAppointment,
  })
  return NextResponse.json({ report })
}
```

### `app/api/reports/photos/[photoId]/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { removePhotoFromReport } from '@/lib/reports'
type Params = { params: Promise<{ photoId: string }> }
export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  const { photoId } = await params
  await removePhotoFromReport(photoId)
  return NextResponse.json({ success: true })
}
```

---

## Updated `app/api/reports/save/route.ts`

Replace entirely with single-photo save:
```typescript
import { NextResponse } from 'next/server'
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/s3'
import { auth } from '@/lib/auth'
import { addPhotoToReport } from '@/lib/reports'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  const { reportId, photo } = await request.json()
  // photo: { id: string, url: string, note: string }

  let finalUrl = photo.url
  if (photo.url?.includes('/buckets/temp/')) {
    const key = photo.url.split('/buckets/temp/')[1]
    try {
      await s3Client.send(new CopyObjectCommand({ Bucket: 'images', Key: key, CopySource: `/temp/${key}` }))
      await s3Client.send(new DeleteObjectCommand({ Bucket: 'temp', Key: key }))
      finalUrl = photo.url.replace('/buckets/temp/', '/buckets/images/')
    } catch (err) {
      console.error('[reports/save] Failed to move file:', err)
    }
  }

  await addPhotoToReport(reportId, photo.id, { url: finalUrl, note: photo.note || '' })
  return NextResponse.json({ photo: { ...photo, url: finalUrl } })
}
```

---

## Updated `app/api/scheduling/route.ts`

In the reports mapping section (around line 142), replace the current mapping with:
```typescript
const reports = reportsRaw.map(r => ({
  id: r.reportID,
  firmaID: r.firmaID,
  workerId: r.workerId,
  appointmentId: r.appointmentId,
  notes: r.notes,
  date: r.date,
  openAt: r.openAt,
  closeAt: r.closeAt,
  openLatitude: r.openLatitude,
  openLongitude: r.openLongitude,
  openAddress: r.openAddress,
  openDistanceToAppointment: r.openDistanceToAppointment,
  closeLatitude: r.closeLatitude,
  closeLongitude: r.closeLongitude,
  closeAddress: r.closeAddress,
  closeDistanceToAppointment: r.closeDistanceToAppointment,
  photos: (r.photos || []).map((p: any) => ({
    id: p.photoID,
    url: p.url,
    note: p.note || '',
  })),
}))
```

---

## Component Changes (`components/scheduling/AppointmentReport.tsx`)

### Imports to add:
```typescript
import { MapPin } from 'lucide-react'  // optional, for geo indicator
```

### Context destructuring (line 56) — add `reports: allReports`:
```typescript
const { updateAppointment, user, openAppointment, closeAppointment, appointments, reports: allReports } = useScheduling()
```

### Replace state (remove `reportNote`, `reportId`; add new):
```typescript
const [reportSessions, setReportSessions] = useState<Report[]>([])
const [currentReportId, setCurrentReportId] = useState<string>('')
const [photos, setPhotos] = useState<Photo[]>([])
const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({})
const [dirtyNotes, setDirtyNotes] = useState<Record<string, boolean>>({})
const [isSavingNotes, setIsSavingNotes] = useState<Record<string, boolean>>({})
const [isStarting, setIsStarting] = useState(false)
```

### Replace useEffect (lines 80-101) with:
```typescript
React.useEffect(() => {
  if (isOpen && appointment) {
    const sessions = (allReports || [])
      .filter(r => r.appointmentId === appointment.id)
      .sort((a, b) => new Date(a.openAt || a.date).getTime() - new Date(b.openAt || b.date).getTime())
    setReportSessions(sessions)
    const active = [...sessions].reverse().find(r => !r.closeAt)
    if (active) {
      setCurrentReportId(active.id)
      setPhotos(active.photos || [])
    } else {
      setCurrentReportId('')
      setPhotos([])
    }
    const notes: Record<string, string> = {}
    sessions.forEach(s => { notes[s.id] = s.notes || '' })
    setSessionNotes(notes)
    setDirtyNotes({})
    setIsSavingNotes({})
  }
}, [isOpen, appointment?.id])
```

### Replace useEffect (lines 104-110) with:
```typescript
React.useEffect(() => {
  if (!isOpen) {
    setReportSessions([])
    setCurrentReportId('')
    setPhotos([])
    setSessionNotes({})
    setDirtyNotes({})
  }
}, [isOpen])
```

### Add helpers above `return`:
```typescript
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

async function getGeoData(clientLat?: number, clientLon?: number) {
  return new Promise<{lat?: number; lon?: number; address?: string; distance?: number}>(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({})
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude
        let address: string | undefined, distance: number | undefined
        try {
          const r = await fetch(`/api/photon/reverse?lat=${lat}&lon=${lon}&lang=de`)
          const d = await r.json()
          const p = d.features?.[0]?.properties
          if (p) address = [p.street, p.housenumber, p.postcode, p.city].filter(Boolean).join(' ')
        } catch {}
        if (clientLat != null && clientLon != null) distance = haversineMeters(lat, lon, clientLat, clientLon)
        resolve({ lat, lon, address, distance })
      },
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}

const formatSessionDuration = (openAt?: Date, closeAt?: Date) => {
  if (!openAt) return ''
  const mins = Math.floor(((closeAt ? new Date(closeAt) : new Date()).getTime() - new Date(openAt).getTime()) / 60000)
  if (mins < 60) return `${mins} ${t('appointment.report.min')}`
  const h = Math.floor(mins / 60), m = mins % 60
  return m === 0 ? `${h} ${t('appointment.report.hour')}` : `${h} ${t('appointment.report.hour')} ${m} ${t('appointment.report.min')}`
}

const formatDistance = (meters: number) =>
  meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`
```

### Add `handleStart` (replaces direct `openAppointment` call):
```typescript
const handleStart = async () => {
  if (!appointment || !user?.myWorkerID) return
  setIsStarting(true)
  try {
    const { lat, lon, address, distance } = await getGeoData(
      appointment.client?.latitude, appointment.client?.longitude
    )
    const openAt = new Date()
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: appointment.id,
        workerId: user.myWorkerID,
        firmaID: user.firmaID,
        openAt,
        openLatitude: lat,
        openLongitude: lon,
        openAddress: address,
        openDistanceToAppointment: distance,
      }),
    })
    const { report } = await res.json()
    const newSession: Report = {
      id: report.reportID,
      firmaID: user.firmaID,
      workerId: user.myWorkerID,
      appointmentId: appointment.id,
      photos: [],
      date: openAt,
      openAt,
      openLatitude: lat,
      openLongitude: lon,
      openAddress: address,
      openDistanceToAppointment: distance,
    }
    const updatedSessions = [...reportSessions, newSession]
    setReportSessions(updatedSessions)
    setCurrentReportId(report.reportID)
    setPhotos([])
    setSessionNotes(prev => ({ ...prev, [report.reportID]: '' }))
    openAppointment(appointment.id, user.myWorkerID)
    updateAppointment({ ...appointment, reports: updatedSessions }, true)
  } catch (err) {
    console.error('[handleStart] Error:', err)
  } finally {
    setIsStarting(false)
  }
}
```

### Add `handleFinish` (replaces direct `closeAppointment` call for Finish button):
```typescript
const handleFinish = async () => {
  if (!appointment || !currentReportId) return
  const { lat, lon, address, distance } = await getGeoData(
    appointment.client?.latitude, appointment.client?.longitude
  )
  const closeAt = new Date()
  await fetch(`/api/reports/${currentReportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      closeAt,
      closeLatitude: lat,
      closeLongitude: lon,
      closeAddress: address,
      closeDistanceToAppointment: distance,
    }),
  })
  const updatedSessions = reportSessions.map(s =>
    s.id === currentReportId
      ? { ...s, closeAt, closeLatitude: lat, closeLongitude: lon, closeAddress: address, closeDistanceToAppointment: distance }
      : s
  )
  setReportSessions(updatedSessions)
  closeAppointment(appointment.id)
  updateAppointment({ ...appointment, reports: updatedSessions }, true)
}
```

### Add `handleSaveNotes`:
```typescript
const handleSaveNotes = async (reportId: string) => {
  setIsSavingNotes(prev => ({ ...prev, [reportId]: true }))
  try {
    const notes = sessionNotes[reportId] || ''
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    const updatedSessions = reportSessions.map(s => s.id === reportId ? { ...s, notes } : s)
    setReportSessions(updatedSessions)
    setDirtyNotes(prev => ({ ...prev, [reportId]: false }))
    updateAppointment({ ...appointment!, reports: updatedSessions }, true)
  } finally {
    setIsSavingNotes(prev => ({ ...prev, [reportId]: false }))
  }
}
```

### Update `handleFileUpload` — after getting `data.photoId` and `data.url`:
```typescript
// After successful upload, before setPhotos:
let activeReportId = currentReportId
if (!activeReportId) {
  const wId = user?.myWorkerID || appointment?.workerId || ''
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointmentId: appointment!.id,
      workerId: wId,
      firmaID: user!.firmaID,
      openAt: new Date(),
    }),
  })
  const { report } = await res.json()
  activeReportId = report.reportID
  const newSession: Report = {
    id: activeReportId,
    firmaID: user!.firmaID,
    workerId: wId,
    appointmentId: appointment!.id,
    photos: [],
    date: new Date(),
  }
  setCurrentReportId(activeReportId)
  setReportSessions(prev => [...prev, newSession])
  setSessionNotes(prev => ({ ...prev, [activeReportId]: '' }))
}

// Save photo to DB + move to permanent:
const saveRes = await fetch('/api/reports/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportId: activeReportId,
    photo: { id: data.photoId, url: data.url, note: '' },
  }),
})
const { photo: savedPhoto } = await saveRes.json()

// Replace: setPhotos(prev => [...prev, newPhoto])  with:
setPhotos(prev => [...prev, savedPhoto])
scrollOnNextUpdate.current = true

// Update session photos and context:
setReportSessions(prev => {
  const updated = prev.map(s =>
    s.id === activeReportId
      ? { ...s, photos: [...(s.photos || []), savedPhoto] }
      : s
  )
  updateAppointment({ ...appointment!, reports: updated }, true)
  return updated
})
```

### Update `handleRemovePhoto`:
```typescript
const handleRemovePhoto = (id: string) => {
  setPhotos(prev => prev.filter(p => p.id !== id))
  // Fire-and-forget delete from DB
  fetch(`/api/reports/photos/${id}`, { method: 'DELETE' }).catch(console.error)
  setReportSessions(prev => {
    const updated = prev.map(s =>
      s.id === currentReportId
        ? { ...s, photos: (s.photos || []).filter(p => p.id !== id) }
        : s
    )
    updateAppointment({ ...appointment!, reports: updated }, true)
    return updated
  })
}
```

### Replace Report Section UI (lines 452-465):
```tsx
{/* Report Sessions */}
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <FileText className="w-5 h-5 text-primary" />
    <h3 className="text-lg font-semibold">{t('appointment.report.report')}</h3>
  </div>
  <div className="space-y-2">
    {reportSessions.map(session => (
      <div key={session.id} className="p-3 bg-default-50 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-sm min-w-[130px]">
            <p className="font-medium">
              {session.openAt && formatTime(new Date(session.openAt))}
              {session.closeAt && ` → ${formatTime(new Date(session.closeAt))}`}
            </p>
            <p className="text-xs text-default-400">{formatSessionDuration(session.openAt, session.closeAt)}</p>
            {session.openAddress && <p className="text-xs text-default-500 mt-0.5">▶ {session.openAddress}</p>}
            {session.openDistanceToAppointment != null && (
              <p className="text-xs text-default-400">▶ {formatDistance(session.openDistanceToAppointment)}</p>
            )}
            {session.closeAddress && <p className="text-xs text-default-500">■ {session.closeAddress}</p>}
            {session.closeDistanceToAppointment != null && (
              <p className="text-xs text-default-400">■ {formatDistance(session.closeDistanceToAppointment)}</p>
            )}
          </div>
          <div className="flex-1 flex items-start gap-1">
            <TextArea
              rows={2}
              value={sessionNotes[session.id] || ''}
              placeholder={t('appointment.report.notesPlaceholder')}
              onChange={e => {
                setSessionNotes(prev => ({ ...prev, [session.id]: e.target.value }))
                setDirtyNotes(prev => ({ ...prev, [session.id]: true }))
              }}
            />
            {dirtyNotes[session.id] && (
              <button
                onClick={() => handleSaveNotes(session.id)}
                disabled={isSavingNotes[session.id]}
                className="p-1 text-primary hover:text-primary/80"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    ))}
    {reportSessions.length === 0 && (
      <p className="text-sm text-default-400 italic">{t('appointment.report.noSessions')}</p>
    )}
  </div>
</div>
```

### Start button — change `onPress`:
```tsx
onPress={handleStart}
isDisabled={appointment?.isOpen || isStarting}
```

### Finish button — change `onPress`:
```tsx
onPress={handleFinish}
```
(Pause button stays as `onPress={() => closeAppointment(appointment.id)}`)

### Remove `Modal.Footer` block from main modal (lines 540-548):
Delete the entire `<Modal.Footer>...</Modal.Footer>` block.

### Remove Cancel/Save from fullscreen viewer footer (lines 589-597):
Delete those two `<Button>` elements from the fullscreen modal's `<Modal.Footer>`.

### Remove `handleSave` function entirely.

---

## Translation Keys

Add to all locale files (`public/locales/de/common.json`, `en/common.json`, `ru/common.json`):

**DE:**
```json
"appointment": {
  "report": {
    "hour": "Stunde",
    "noSessions": "Keine Sitzungen"
  }
}
```

**EN:**
```json
"hour": "hour",
"noSessions": "No sessions"
```

**RU:**
```json
"hour": "час",
"noSessions": "Нет сессий"
```

---

## Verification Checklist

1. [ ] Run `scripts/add-report-timestamps.sql` migration
2. [ ] Restart dev server
3. [ ] Open appointment report modal as worker (today's date)
4. [ ] Click **Start** → browser permission → session row appears with time + address + distance from client
5. [ ] Upload photo → `report_photos` table has new row with permanent URL (`/buckets/images/`)
6. [ ] Edit notes → floppy disk icon appears → click → saved to DB, icon disappears
7. [ ] Click **Finish** → closeAt + close geo saved, duration shows in row
8. [ ] Close and reopen modal → sessions still there (from `context.reports`)
9. [ ] Click **Start** again → second session row appears
10. [ ] Verify DB: `SELECT * FROM reports WHERE "appointmentId" = '...'`
11. [ ] Verify no Cancel/Save buttons in modal footer
