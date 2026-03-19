import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmaID = session.user.firmaID
    if (!firmaID) {
      return NextResponse.json({ error: 'No firmaID' }, { status: 403 })
    }

    const result = await pool.query(
      `SELECT id, city, "firmaID", "createdAt", "updatedAt" FROM cities WHERE "firmaID" = $1 ORDER BY city ASC`,
      [firmaID]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('[GET /api/cities] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Director can create cities
    if (session.user.status !== 0 && session.user.status !== null && session.user.status !== undefined) {
      return NextResponse.json({ error: 'Forbidden: Only directors can manage cities' }, { status: 403 })
    }

    const firmaID = session.user.firmaID
    if (!firmaID) {
      return NextResponse.json({ error: 'No firmaID' }, { status: 403 })
    }

    const body = await req.json()
    const { city } = body

    if (!city || typeof city !== 'string') {
      return NextResponse.json({ error: 'Invalid city name' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO cities (city, "firmaID") VALUES ($1, $2) RETURNING id, city, "firmaID", "createdAt", "updatedAt"`,
      [city.trim(), firmaID]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[POST /api/cities] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
