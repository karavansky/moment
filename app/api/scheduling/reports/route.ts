import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createReport, getReportsByFirmaID } from '@/lib/reports'

/**
 * GET /api/scheduling/reports
 * Lightweight endpoint — returns only reports (with photos).
 * Used by SSE refresh when an appointment is closed.
 */
export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmaID = session.user.firmaID!
    const reportsRaw = await getReportsByFirmaID(firmaID)

    const reports = reportsRaw.map(r => ({
      id: r.reportID,
      firmaID: r.firmaID,
      type: r.type,
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

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('[Scheduling Reports] GET error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const report = await createReport(session.user.firmaID!, body)
    return NextResponse.json(report)
  } catch (error) {
    console.error('[Scheduling Reports] POST error:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}
