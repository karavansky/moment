import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import { createVerificationToken } from '@/lib/verification-tokens'
import { sendPasswordReset } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    // Всегда отвечаем успехом чтобы не раскрывать существование аккаунта
    if (!user || !user.passwordHash) {
      return NextResponse.json({ message: 'If this email exists, a reset link has been sent.' })
    }

    const token = await createVerificationToken(user.userID, 'password_reset')

    const baseUrl = process.env.NEXTAUTH_URL || 'https://moment-lbs.app'
    const resetUrl = `${baseUrl}/en/auth/reset-password?token=${token}`

    await sendPasswordReset({ email: user.email, name: user.name, resetUrl })

    return NextResponse.json({ message: 'If this email exists, a reset link has been sent.' })
  } catch (error) {
    console.error('[ForgotPassword API] Error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
