import { NextResponse } from 'next/server'
import { getVerificationToken, markTokenUsed } from '@/lib/verification-tokens'
import { updatePassword } from '@/lib/users'
import { hashPassword } from '@/lib/password'
import { deleteAllUserSessions } from '@/lib/sessions'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const verificationToken = await getVerificationToken(token)

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (verificationToken.type !== 'password_reset') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    await updatePassword(verificationToken.userID, passwordHash)
    await markTokenUsed(verificationToken.tokenID)

    // Инвалидируем все существующие сессии для безопасности
    await deleteAllUserSessions(verificationToken.userID)

    return NextResponse.json({ message: 'Password has been reset successfully. Please sign in with your new password.' })
  } catch (error) {
    console.error('[ResetPassword API] Error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
