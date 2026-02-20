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
      appointmentId,
      workerId,
      firmaID,
      openAt,
      openLatitude,
      openLongitude,
      openAddress,
      openDistanceToAppointment,
    } = await request.json()

    const report = await createReportSession(firmaID, {
      workerId,
      appointmentId,
      openAt: new Date(openAt),
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
