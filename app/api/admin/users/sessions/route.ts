import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import { getUserSessions } from '@/lib/sessions'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const adminUser = await getUserByEmail(session.user.email)
  if (!adminUser?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userID = searchParams.get('userID')

  if (!userID) {
    return NextResponse.json({ error: 'userID is required' }, { status: 400 })
  }

  try {
    const sessions = await getUserSessions(userID)
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('[Admin Sessions API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
