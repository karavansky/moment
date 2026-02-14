import { NextResponse } from 'next/server'
import { getVerificationToken, markTokenUsed } from '@/lib/verification-tokens'
import { verifyUserEmail, getUserById } from '@/lib/users'
import { createSession } from '@/lib/sessions'
import { encode } from 'next-auth/jwt'

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, getBaseUrl()))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return redirectTo('/en/auth/signin?error=missing_token')
  }

  try {
    const verificationToken = await getVerificationToken(token)

    if (!verificationToken) {
      console.error('[Confirm API] Token not found or expired/used. Token (first 8 chars):', token.substring(0, 8))
      return redirectTo('/en/auth/signin?error=invalid_token')
    }

    if (verificationToken.type !== 'email_verify') {
      console.error('[Confirm API] Wrong token type:', verificationToken.type)
      return redirectTo('/en/auth/signin?error=invalid_token')
    }

    await verifyUserEmail(verificationToken.userID)
    await markTokenUsed(verificationToken.tokenID)

    const user = await getUserById(verificationToken.userID)
    if (!user) {
      return redirectTo('/en/auth/signin?error=user_not_found')
    }

    // Создаём DB-сессию
    const dbSession = await createSession(user.userID)

    // Имя cookie зависит от secure-режима (production использует __Secure- префикс)
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'

    // Создаём JWT-токен для автологина
    const jwtToken = await encode({
      token: {
        sub: user.userID,
        name: user.name,
        email: user.email,
        userId: user.userID,
        provider: 'credentials',
        isAdmin: user.isAdmin,
        sessionId: dbSession.sessionID,
      },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
    })

    // Редиректим в приложение с установленной cookie
    const response = redirectTo('/en/support')

    response.cookies.set(cookieName, jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error('[Confirm API] Error:', error)
    return redirectTo('/en/auth/signin?error=verification_failed')
  }
}
