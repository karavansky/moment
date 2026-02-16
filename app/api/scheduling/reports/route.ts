import { NextResponse } from 'next/server'
import { getSchedulingSession } from '../auth-check'
import { createReport } from '@/lib/reports'

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
