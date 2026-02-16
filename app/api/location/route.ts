import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude, appointmentId } = await request.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    // Find worker linked to this user
    const workerResult = await pool.query(
      `SELECT "workerID", "firmaID" FROM workers WHERE "userID" = $1 LIMIT 1`,
      [session.user.id]
    )

    if (workerResult.rows.length === 0) {
      return NextResponse.json({ error: 'No worker profile linked' }, { status: 404 })
    }

    const { workerID, firmaID } = workerResult.rows[0]

    // Update worker's current location
    await pool.query(
      `UPDATE workers SET "latitude" = $1, "longitude" = $2 WHERE "workerID" = $3 AND "firmaID" = $4`,
      [latitude, longitude, workerID, firmaID]
    )

    // Update appointment location if provided and appointment is open
    if (appointmentId) {
      await pool.query(
        `UPDATE appointments SET "latitude" = $1, "longitude" = $2 WHERE "appointmentID" = $3 AND "isOpen" = TRUE`,
        [latitude, longitude, appointmentId]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[location/POST] Error:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
