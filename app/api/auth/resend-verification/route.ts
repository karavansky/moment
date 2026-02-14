import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import { createVerificationToken } from '@/lib/verification-tokens'
import { sendEmailVerification } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    // Не раскрываем существует ли пользователь — всегда отвечаем "ок"
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: 'If this email is registered and not yet verified, a new link has been sent.' })
    }

    const token = await createVerificationToken(user.userID, 'email_verify')

    const baseUrl = process.env.NEXTAUTH_URL || 'https://moment-lbs.app'
    const confirmUrl = `${baseUrl}/api/auth/confirm?token=${token}`

    await sendEmailVerification({ email: user.email, name: user.name, confirmUrl })

    return NextResponse.json({ message: 'Verification email sent.' })
  } catch (error) {
    console.error('[Resend Verification API] Error:', error)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }
}
