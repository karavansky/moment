import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getUserByEmail } from '@/lib/users'

/**
 * GET /api/tickets/my
 * Получить все тикеты текущего пользователя с количеством непрочитанных сообщений
 */
export async function GET() {
  try {
    console.log('[GET /api/tickets/my] Starting request')
    const session = await auth()
    console.log('[GET /api/tickets/my] Session:', session ? 'exists' : 'null')

    if (!session || !session.user?.email) {
      console.log('[GET /api/tickets/my] No session or email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GET /api/tickets/my] User email:', session.user.email)
    const user = await getUserByEmail(session.user.email)
    console.log('[GET /api/tickets/my] User from DB:', user ? user.userID : 'not found')

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Получаем все тикеты пользователя с количеством сообщений
    const query = `
      SELECT
        t."ticketID",
        t."subject",
        t."category",
        t."pripority",
        t."date",
        (SELECT COUNT(*)::int FROM messages WHERE "ticketID" = t."ticketID") as "messageCount",
        (SELECT COUNT(*)::int FROM messages WHERE "ticketID" = t."ticketID" AND "isAdmin" = TRUE AND "isRead" = FALSE) as "unreadCount"
      FROM ticket t
      WHERE t."userID" = $1
      ORDER BY t."date" DESC
    `

    const result = await pool.query(query, [user.userID])

    return NextResponse.json({
      success: true,
      tickets: result.rows,
    })
  } catch (error) {
    console.error('[GET /api/tickets/my] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
