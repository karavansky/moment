import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pool.query(
      `SELECT "pushNotificationsEnabled", "geolocationEnabled" FROM users WHERE "userID" = $1`,
      [session.user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[settings/GET] Error:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pushNotificationsEnabled, geolocationEnabled } = body

    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (typeof pushNotificationsEnabled === 'boolean') {
      setClauses.push(`"pushNotificationsEnabled" = $${paramIndex++}`)
      values.push(pushNotificationsEnabled)
    }
    if (typeof geolocationEnabled === 'boolean') {
      setClauses.push(`"geolocationEnabled" = $${paramIndex++}`)
      values.push(geolocationEnabled)
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    values.push(session.user.id)
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE "userID" = $${paramIndex} RETURNING "pushNotificationsEnabled", "geolocationEnabled"`

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[settings/PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
