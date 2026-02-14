import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getUserByEmail, getAllUsers, updateUser, deleteUser } from '@/lib/users'
import { getUserSessions, deleteSession, deleteAllUserSessions } from '@/lib/sessions'
import { updateOrganisation } from '@/lib/organisations'

async function checkAdmin() {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: 'Unauthorized', status: 401 }
  }
  const user = await getUserByEmail(session.user.email)
  if (!user?.isAdmin) {
    return { error: 'Forbidden: Admin access required', status: 403 }
  }
  return null
}

export async function GET() {
  const authError = await checkAdmin()
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const users = await getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error('[Admin Users API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const authError = await checkAdmin()
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const { userID, organisationName, ...fields } = body

    if (!userID) {
      return NextResponse.json({ error: 'userID is required' }, { status: 400 })
    }

    // Обновить название организации если передано
    if (organisationName !== undefined && fields.firmaID) {
      await updateOrganisation(fields.firmaID, organisationName)
    }

    // Убираем firmaID из полей обновления user (он не меняется)
    delete fields.firmaID

    const updatedUser = await updateUser(userID, fields)
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('[Admin Users API] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authError = await checkAdmin()
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userID = searchParams.get('userID')
    const sessionID = searchParams.get('sessionID')
    const action = searchParams.get('action')

    if (action === 'delete-session' && sessionID) {
      await deleteSession(sessionID)
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete-all-sessions' && userID) {
      await deleteAllUserSessions(userID)
      return NextResponse.json({ ok: true })
    }

    if (userID) {
      const deleted = await deleteUser(userID)
      if (!deleted) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'userID is required' }, { status: 400 })
  } catch (error) {
    console.error('[Admin Users API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
