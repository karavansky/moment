import { NextResponse } from 'next/server'
import { getUserByEmail, createUserWithPassword } from '@/lib/users'
import { hashPassword } from '@/lib/password'
import { createVerificationToken } from '@/lib/verification-tokens'
import { sendEmailVerification } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await createUserWithPassword(name, email, passwordHash)

    const token = await createVerificationToken(user.userID, 'email_verify')

    const baseUrl = process.env.NEXTAUTH_URL || 'https://moment-lbs.app'
    const confirmUrl = `${baseUrl}/api/auth/confirm?token=${token}`

    await sendEmailVerification({ email, name, confirmUrl })

    return NextResponse.json({ message: 'Registration successful. Please check your email to verify your account.' })
  } catch (error) {
    console.error('[Register API] Error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
