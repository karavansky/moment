import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateReport } from '@/lib/reports'

type Params = { params: Promise<{ reportId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
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
  } catch (error) {
    console.error('[PATCH /api/reports/[reportId]] Error:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
