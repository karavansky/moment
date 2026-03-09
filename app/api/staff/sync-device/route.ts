import { NextResponse } from 'next/server'
import { getAnySchedulingSession } from '../../scheduling/auth-check'
import { updateDeviceSyncStatus } from '@/lib/users'
import { decryptTelemetry } from '@/lib/telemetry-crypto'

export async function POST(req: Request) {
  try {
    const session = await getAnySchedulingSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Decrypt telemetry if encrypted
    let data
    if (body.encrypted) {
      const secret = process.env.TELEMETRY_SECRET
      if (!secret) {
        console.error('[POST /api/staff/sync-device] TELEMETRY_SECRET not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }
      data = await decryptTelemetry(body.encrypted, secret)
    } else {
      // Fallback for unencrypted (backward compatibility)
      data = body
    }

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
