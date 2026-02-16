import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getVerificationToken, markTokenUsed } from '@/lib/verification-tokens'
import { verifyUserEmail, getUserById } from '@/lib/users'
import { createSession } from '@/lib/sessions'
import { getOrganisationById } from '@/lib/organisations'
import { getLocale } from '@/lib/get-locale'
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
  const lang = await getLocale()

  if (!token) {
    return redirectTo(`/${lang}/auth/confirm?status=invalid`)
  }

  try {
    const verificationToken = await getVerificationToken(token)

    if (!verificationToken) {
      console.error('[Confirm API] Token not found or expired/used. Token (first 8 chars):', token.substring(0, 8))
      return redirectTo(`/${lang}/auth/confirm?status=expired`)
    }

    if (verificationToken.type !== 'email_verify') {
      console.error('[Confirm API] Wrong token type:', verificationToken.type)
      return redirectTo(`/${lang}/auth/confirm?status=invalid`)
    }

    await verifyUserEmail(verificationToken.userID)
    await markTokenUsed(verificationToken.tokenID)

    const user = await getUserById(verificationToken.userID)
    if (!user) {
      return redirectTo(`/${lang}/auth/confirm?status=invalid`)
    }

    // Создаём DB-сессию с IP и User-Agent
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || null
    const userAgent = headersList.get('user-agent') || null
    const dbSession = await createSession(user.userID, userAgent ?? undefined, ip ?? undefined)

    // Имя cookie зависит от secure-режима (production использует __Secure- префикс)
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'

    // Загружаем организацию
    let organisationName: string | undefined
    if (user.firmaID) {
      const org = await getOrganisationById(user.firmaID)
      organisationName = org?.name
    }

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
        firmaID: user.firmaID ?? undefined,
        organisationName,
        status: user.status,
      },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
    })

    // Редиректим на страницу подтверждения с установленной cookie
    const response = redirectTo(`/${lang}/auth/confirm?status=success`)

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
    const fallbackLang = await getLocale().catch(() => 'en')
    return redirectTo(`/${fallbackLang}/auth/confirm?status=error`)
  }
}
