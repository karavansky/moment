import { NextResponse } from 'next/server'
import { getAnySchedulingSession } from '../../scheduling/auth-check'
import pool from '@/lib/db'
// @ts-expect-error -- web-push has no type declarations
import webpush from 'web-push'

function ensureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) throw new Error('VAPID keys missing')

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@moment-lbs.app',
    publicKey,
    privateKey
  )
}

export async function POST(req: Request) {
  try {
    const session = await getAnySchedulingSession()
    if (!session?.user?.isAdmin && session?.user?.status !== 0 && session?.user?.status !== 3) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins/directors can verify tokens.' },
        { status: 403 }
      )
    }

    const { targetUserID } = await req.json()
    if (!targetUserID) {
      return NextResponse.json({ error: 'Missing targetUserID' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT * FROM push_subscriptions WHERE "userID" = $1 ORDER BY "lastUsedAt" DESC NULLS LAST LIMIT 1`,
      [targetUserID]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        reason: 'Device is completely completely disconnected from the Backend.',
      })
    }

    const sub = result.rows[0]

    try {
      ensureWebPush()
    } catch {
      return NextResponse.json({ error: 'Server VAPID incorrectly configured.' }, { status: 500 })
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: 'System Ping',
          body: 'Direct verification ping from Director. Connection is stable.',
          tag: 'ping',
        })
      )

      // Update last used at
      await pool.query(`UPDATE push_subscriptions SET "lastUsedAt" = NOW() WHERE id = $1`, [sub.id])

      return NextResponse.json({ success: true })
    } catch (pushError: any) {
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        // Ghost / Dead Token -> Prune it
        await pool.query(`DELETE FROM push_subscriptions WHERE "endpoint" = $1`, [sub.endpoint])
        // Optionally map the user row
        await pool.query(
          `UPDATE users SET "pushNotificationsEnabled" = FALSE WHERE "userID" = $1`,
          [targetUserID]
        )

        return NextResponse.json({
          success: false,
          reason: 'Token was revoked by the device or Safari. Device disconnected.',
        })
      }

      return NextResponse.json({ success: false, reason: `APNs/FCM error: ${pushError.message}` })
    }
  } catch (error) {
    console.error('[POST /api/staff/verify-push] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
