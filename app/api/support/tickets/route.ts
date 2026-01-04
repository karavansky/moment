import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { createTicket } from '@/lib/tickets'
import { getUserByEmail } from '@/lib/users'
import { createMessage } from '@/lib/messages'
import { sendTicketConfirmation } from '@/lib/email'

// Маппинг категорий в числа
const categoryMap: Record<string, number> = {
  technical: 1,
  billing: 2,
  feature: 3,
  data: 4,
  other: 5,
}

// Маппинг приоритетов в числа
const priorityMap: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await auth()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, category, priority, description } = body
    //console.log('Received ticket data:', body)
    // Validate required fields
    if (!subject || !category || !priority || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Получаем пользователя из базы данных
    const user = await getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Конвертируем категорию и приоритет в числа
    const categoryInt = categoryMap[category] || 5
    const priorityInt = priorityMap[priority] || 2

    // Создаем тикет в базе данных
    const ticket = await createTicket(user.userID, subject, categoryInt, priorityInt)

    // Создаем первое сообщение с описанием проблемы
    await createMessage(ticket.ticketID, user.userID, description, false)

    console.log('New support ticket created:', ticket)

    // Send email confirmation to user
    try {
      await sendTicketConfirmation({
        ticketID: ticket.ticketID,
        userEmail: session.user.email,
        userName: session.user.name || undefined,
        subject,
        category,
        priority,
        description,
      })
      console.log('Email confirmation sent to:', session.user.email)
    } catch (emailError) {
      console.error('Failed to send email confirmation:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Ticket created successfully',
        ticketId: ticket.ticketID,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
