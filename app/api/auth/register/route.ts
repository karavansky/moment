import { NextResponse } from 'next/server'
import { getUserByEmail, createUserWithPassword, updatePassword } from '@/lib/users'
import { hashPassword } from '@/lib/password'
import { createVerificationToken } from '@/lib/verification-tokens'
import { sendEmailVerification, sendNewUserNotification } from '@/lib/email'
import { createOrganisation } from '@/lib/organisations'
import { getInviteByToken } from '@/lib/invites'
import { createWorker } from '@/lib/workers'
import { createClient } from '@/lib/clients'

export async function POST(request: Request) {
  try {
    const { name, email, password, organisation, turnstileToken, inviteToken } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    // Organisation обязательна только без invite
    if (!inviteToken && !organisation) {
      return NextResponse.json({ error: 'Organisation is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Verify Cloudflare Turnstile CAPTCHA
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'CAPTCHA verification required' }, { status: 400 })
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
      })

      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        console.error('[Register API] Turnstile verification failed:', verifyData)
        return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 400 })
      }
    }

    const passwordHash = await hashPassword(password)
    const existingUser = await getUserByEmail(email)

    let user
    let isResend = false

    if (existingUser) {
      if (existingUser.emailVerified) {
        // Уже подтверждённый аккаунт — нельзя перерегистрировать
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }

      // Не подтверждён — обновляем пароль и отправляем новый токен
      await updatePassword(existingUser.userID, passwordHash)
      user = existingUser
      isResend = true
    } else if (inviteToken) {
      // Регистрация по invite — берём firmaID и status из invite
      const invite = await getInviteByToken(inviteToken)
      if (!invite) {
        return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
      }
      user = await createUserWithPassword(name, email, passwordHash, invite.firmaID, invite.status)

      // Создаём запись в workers/clients в зависимости от роли
      if (invite.status === 1) {
        await createWorker({ userID: user.userID, firmaID: invite.firmaID, name, email })
      } else if (invite.status === 2) {
        await createClient({ userID: user.userID, firmaID: invite.firmaID, name, email })
      }
    } else {
      // Обычная регистрация — создаём организацию, status=0 (директор)
      const org = await createOrganisation(organisation)
      user = await createUserWithPassword(name, email, passwordHash, org.firmaID, 0)
    }

    const token = await createVerificationToken(user.userID, 'email_verify')

    const baseUrl = process.env.NEXTAUTH_URL || 'https://moment-lbs.app'
    const confirmUrl = `${baseUrl}/api/auth/confirm?token=${token}`

    await sendEmailVerification({ email, name, confirmUrl })

    // Уведомление администратору только при первой регистрации
    if (!isResend) {
      try {
        await sendNewUserNotification({
          userEmail: email,
          userName: name,
          organisation: organisation || 'via invite',
          provider: 'credentials',
          date: user.date,
        })
      } catch (emailError) {
        console.error('[Register API] Failed to send admin notification:', emailError)
      }
    }

    return NextResponse.json({ message: 'Registration successful. Please check your email to verify your account.' })
  } catch (error) {
    console.error('[Register API] Error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
