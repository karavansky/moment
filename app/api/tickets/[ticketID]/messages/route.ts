import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import {
  createMessage,
  getMessagesWithAccessCheck,
  markTicketMessagesAsRead,
  checkTicketAccess,
} from '@/lib/messages'

/**
 * GET /api/tickets/[ticketID]/messages
 * Получить все сообщения тикета
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketID: string }> }
) {
  const { ticketID } = await params

  if (ticketID === '12345') {
    return NextResponse.json({
      success: true,
      messages: [
        {
          messageID: '1',
          ticketID: ticketID,
          userID: 'demo-user',
          message: 'Is there an Android or Web version available?',
          isAdmin: false,
          date: '2024-01-01 12:00:00',
          dateRead: null,
        },
        {
          messageID: '2',
          ticketID: ticketID,
          userID: 'admin-user',
          message:
            'QuailBreeder is available exclusively for iOS. You can download it directly from the Apple App Store for your iPhone or iPad. We chose iOS to provide a high-performance, native experience optimized specifically for the Apple ecosystem.',
          isAdmin: true,
          date: '2024-01-01 13:00:00',
          dateRead: null,
        },
      ],
    })
  }
  if (ticketID === '12346') {
    return NextResponse.json({
      success: true,
      messages: [
        {
          messageID: '1',
          ticketID: ticketID,
          userID: 'demo-user',
          message: 'What types of equipment can I manage?',
          isAdmin: false,
          date: '2024-01-01 12:00:00',
          dateRead: null,
        },
        {
          messageID: '2',
          ticketID: ticketID,
          userID: 'admin-user',
          message:
            'You can configure and track three distinct types of equipment: Incubators, Brooders, and Cages. The system provides a visual display of the current load for each type, helping you optimize your batch scheduling.',
          isAdmin: true,
          date: '2024-01-01 13:00:00',
          dateRead: null,
        },
        {
          messageID: '3',
          ticketID: ticketID,
          userID: 'admin-user',
          message:
            'Detailed instructions on how to set up equipment directories can be found at https://moment-lbs.app/get-started',
          isAdmin: true,
          date: '2024-01-01 13:00:00',
          dateRead: null,
        },
      ],
    })
  }
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Получаем сообщения с проверкой доступа (оптимизированный запрос)
    const messages = await getMessagesWithAccessCheck(ticketID, user.userID, user.isAdmin)

    if (messages === null) {
      // Тикет не найден или нет доступа
      return NextResponse.json({ error: 'Ticket not found or access denied' }, { status: 404 })
    }

    // Помечаем сообщения как прочитанные
    await markTicketMessagesAsRead(ticketID, user.userID)

    return NextResponse.json({
      success: true,
      messages,
    })
  } catch (error) {
    console.error('[GET /api/tickets/:ticketID/messages] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/tickets/[ticketID]/messages
 * Отправить сообщение в тикет
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketID: string }> }
) {
  try {
    const session = await auth()
    const { ticketID } = await params

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем доступ к тикету (оптимизированная проверка)
    const hasAccess = await checkTicketAccess(ticketID, user.userID, user.isAdmin)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Ticket not found or access denied' }, { status: 404 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Создаем сообщение
    const newMessage = await createMessage(ticketID, user.userID, message.trim(), user.isAdmin)

    return NextResponse.json(
      {
        success: true,
        message: newMessage,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/tickets/:ticketID/messages] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
