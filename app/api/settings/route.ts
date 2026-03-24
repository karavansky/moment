import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userStatus = session.user.status
    const firmaID = session.user.firmaID

    if (!firmaID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admin/Director settings (status = 0 or null)
    if (userStatus === null || userStatus === 0) {
      const result = await pool.query(
        `SELECT
          u."pushNotificationsEnabled",
          u."geolocationEnabled",
          u."name",
          u."email",
          u."lang",
          u."country",
          u."citiesID",
          o."name" AS "organisationName",
          o."firmaID"
        FROM users u
        LEFT JOIN organisations o ON u."firmaID" = o."firmaID"
        WHERE u."userID" = $1`,
        [session.user.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json(result.rows[0])
    }

    // Worker settings (status = 1)
    if (userStatus === 1) {
      const result = await pool.query(
        `SELECT
          u."pushNotificationsEnabled",
          u."geolocationEnabled",
          u."name",
          u."email",
          u."lang",
          u."country",
          u."citiesID",
          o."name" AS "organisationName",
          o."firmaID",
          w."name" AS "workerName",
          w."surname" AS "workerSurname",
          w."email" AS "workerEmail"
        FROM users u
        LEFT JOIN organisations o ON u."firmaID" = o."firmaID"
        LEFT JOIN workers w ON u."userID" = w."userID" AND w."firmaID" = $1
        WHERE u."userID" = $2`,
        [firmaID, session.user.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json(result.rows[0])
    }

    // Sport Booking System (status = 7) and other statuses
    // Return basic user settings + organisation info
    const result = await pool.query(
      `SELECT
        u."pushNotificationsEnabled",
        u."geolocationEnabled",
        u."name",
        u."email",
        u."lang",
        u."country",
        u."citiesID",
        o."name" AS "organisationName",
        o."firmaID"
      FROM users u
      LEFT JOIN organisations o ON u."firmaID" = o."firmaID"
      WHERE u."userID" = $1`,
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
    const { pushNotificationsEnabled, geolocationEnabled, lang, country, citiesID } = body

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
    if (typeof lang === 'string') {
      setClauses.push(`"lang" = $${paramIndex++}`)
      values.push(lang)
    }
    // Only Director (status 0 or null) can update country and citiesID
    const isDirector = session.user.status === 0 || session.user.status === null || session.user.status === undefined
    if (isDirector) {
      if (typeof country === 'string') {
        setClauses.push(`"country" = $${paramIndex++}`)
        values.push(country)
      }
      if (Array.isArray(citiesID)) {
        setClauses.push(`"citiesID" = $${paramIndex++}`)
        values.push(citiesID.length > 0 ? citiesID : null)
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    values.push(session.user.id)
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE "userID" = $${paramIndex} RETURNING "pushNotificationsEnabled", "geolocationEnabled", "lang", "country", "citiesID"`

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Notify clients if this is a worker update
    const firmaID = session.user.firmaID
    if (firmaID) {
      try {
        const workerCheck = await pool.query(
          `SELECT "workerID" FROM workers WHERE "userID" = $1 LIMIT 1`,
          [session.user.id]
        )
        if (workerCheck.rows.length > 0) {
          await pool.query(
            `SELECT pg_notify($1, $2)`,
            [`scheduling_${firmaID}`, JSON.stringify({ type: 'worker_updated' })]
          )
        }
      } catch (notifyError) {
        console.error('[settings/PATCH] pgNotify error:', notifyError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[settings/PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
