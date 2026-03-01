import { NextResponse } from 'next/server'
import { getAnySchedulingSession } from '../../scheduling/auth-check'
import { updateDeviceSyncStatus } from '@/lib/users'

export async function POST(req: Request) {
  try {
    const session = await getAnySchedulingSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const {
      pwaVersion,
      osVersion,
      batteryLevel,
      batteryStatus,
      geolocationEnabled,
      pushNotificationsEnabled,
    } = data

    await updateDeviceSyncStatus(session.user.id, {
      pwaVersion,
      osVersion,
      batteryLevel,
      batteryStatus,
      geolocationEnabled,
      pushNotificationsEnabled,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/staff/sync-device] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
