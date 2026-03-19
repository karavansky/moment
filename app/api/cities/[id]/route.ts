import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Director can delete cities
    if (session.user.status !== 0 && session.user.status !== null && session.user.status !== undefined) {
      return NextResponse.json({ error: 'Forbidden: Only directors can manage cities' }, { status: 403 })
    }

    const { id } = await params
    const cityId = parseInt(id)

    if (isNaN(cityId)) {
      return NextResponse.json({ error: 'Invalid city ID' }, { status: 400 })
    }

    // Verify the city belongs to the user's organization
    const result = await pool.query(
      `DELETE FROM cities WHERE id = $1 AND "firmaID" = $2 RETURNING id`,
      [cityId, session.user.firmaID]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'City not found or unauthorized' }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(`[DELETE /api/cities/${(await params).id}] Error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
