import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createReportSession } from '@/lib/reports'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const {
      reportID,
      type,
      appointmentId,
      workerId,
      firmaID,
      openLatitude,
      openLongitude,
      openAddress,
      openDistanceToAppointment,
    } = await request.json()

    // openAt is set by the DB server via NOW() — not accepted from client
    const report = await createReportSession(firmaID, {
      reportID,
      type,
      workerId,
      appointmentId,
      openLatitude,
      openLongitude,
      openAddress,
      openDistanceToAppointment,
    })

    return NextResponse.json({ report })
  } catch (error) {
    console.error('[POST /api/reports] Error:', error)
    return NextResponse.json({ error: 'Failed to create report session' }, { status: 500 })
  }
}
