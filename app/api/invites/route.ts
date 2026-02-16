import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createInvite, getInviteByToken } from '@/lib/invites'
import { getLocale } from '@/lib/get-locale'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.firmaID || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const inviteStatus = body.status as number

    // Валидация status: 1=работник, 2=клиент, 3=менеджер
    if (![1, 2, 3].includes(inviteStatus)) {
      return NextResponse.json({ error: 'Invalid status. Must be 1, 2, or 3' }, { status: 400 })
    }

    const { firmaID, id: userId } = session.user

    const invite = await createInvite(firmaID, userId, inviteStatus)

    const lang = await getLocale()
    const baseUrl = process.env.NEXTAUTH_URL || 'https://moment-lbs.app'
    const url = `${baseUrl}/${lang}/auth/register?invite=${invite.token}`

    return NextResponse.json({ token: invite.token, url })
  } catch (error) {
    console.error('[Invites API] POST error:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const invite = await getInviteByToken(token)

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
    }

    return NextResponse.json({
      firmaID: invite.firmaID,
      organisationName: invite.organisationName,
      status: invite.status,
    })
  } catch (error) {
    console.error('[Invites API] GET error:', error)
    return NextResponse.json({ error: 'Failed to get invite' }, { status: 500 })
  }
}
