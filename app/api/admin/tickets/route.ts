import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getUserByEmail } from '@/lib/users'

/**
 * GET /api/admin/tickets
 * Получить все тикеты (только для администратора)
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, является ли пользователь администратором
    const user = await getUserByEmail(session.user.email)

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Получаем все тикеты с информацией о пользователях
    const query = `
      SELECT
        t."ticketID",
        t."userID",
        t."subject",
        t."category",
        t."pripority",
        t."date",
        u."name" as "userName",
        u."email" as "userEmail",
        (SELECT COUNT(*)::int FROM messages WHERE "ticketID" = t."ticketID") as "messageCount",
        (SELECT COUNT(*)::int FROM messages WHERE "ticketID" = t."ticketID" AND "isAdmin" = FALSE AND "isRead" = FALSE) as "unreadCount"
      FROM ticket t
      JOIN users u ON t."userID" = u."userID"
      ORDER BY t."date" DESC
    `

    const result = await pool.query(query)

    return NextResponse.json({
      success: true,
      tickets: result.rows,
    })
  } catch (error) {
    console.error('[GET /api/admin/tickets] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
