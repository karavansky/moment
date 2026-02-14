import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import Credentials from 'next-auth/providers/credentials'
import { headers } from 'next/headers'
import { createUser, getUserByEmail, updateUserToken } from './users'
import { sendNewUserNotification } from './email'
import { verifyPassword } from './password'
import { createSession, getSession, deleteSession } from './sessions'

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET_JWT!,
      authorization: {
        params: {
          scope: 'name email',
          response_mode: 'form_post',
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (!email || !password) return null

        const user = await getUserByEmail(email)
        if (!user) return null

        if (!user.passwordHash) {
          console.log('[Credentials] User has no password (OAuth-only account):', email)
          return null
        }

        if (!user.emailVerified) {
          console.log('[Credentials] Email not verified:', email)
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        const isValid = await verifyPassword(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.userID,
          name: user.name,
          email: user.email,
          provider: 'credentials',
          isAdmin: user.isAdmin,
        }
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/en/auth/signin', // Default to English, but each page handles its own lang
    signOut: '/en/auth/signout',
    error: '/en/auth/signin',
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // При первом входе добавляем информацию в токен и создаем/обновляем пользователя
      if (account && user) {
        console.log('[JWT Callback] User signing in:', { email: user.email, name: user.name, provider: account.provider })

        token.accessToken = account.access_token
        token.provider = account.provider

        if (account.provider === 'credentials') {
          // Credentials: user.id уже содержит userID из authorize()
          token.userId = user.id
          token.isAdmin = user.isAdmin
        } else {
          // OAuth: создаем/обновляем пользователя в БД
          try {
            if (user.email && user.name) {
              console.log('[JWT Callback] Checking if user exists in DB...')
              const existingUser = await getUserByEmail(user.email)

              if (existingUser) {
                console.log('[JWT Callback] User exists, updating token. UserID:', existingUser.userID)
                if (account.access_token) {
                  await updateUserToken(existingUser.userID, account.access_token)
                }
                token.userId = existingUser.userID
                token.isAdmin = existingUser.isAdmin
              } else {
                console.log('[JWT Callback] User does not exist, creating new user...')
                const newUser = await createUser(
                  user.name,
                  user.email,
                  account.access_token || '',
                  account.provider
                )
                console.log('[JWT Callback] New user created. UserID:', newUser.userID)
                token.userId = newUser.userID
                token.isAdmin = newUser.isAdmin

                try {
                  await sendNewUserNotification({
                    userEmail: newUser.email,
                    userName: newUser.name,
                    provider: newUser.provider,
                    date: newUser.date,
                  })
                  console.log('[JWT Callback] New user notification email sent')
                } catch (emailError) {
                  console.error('[JWT Callback] Failed to send new user notification:', emailError)
                }
              }
            } else {
              console.warn('[JWT Callback] Missing user.email or user.name:', { email: user.email, name: user.name })
            }
          } catch (error) {
            console.error('[JWT Callback] Error saving user to database:', error)
          }
        }

        // Создаём сессию в БД для всех провайдеров (с IP и User-Agent)
        try {
          if (token.userId) {
            let ip: string | undefined
            let userAgent: string | undefined
            try {
              const headersList = await headers()
              ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
                || headersList.get('x-real-ip')
                || undefined
              userAgent = headersList.get('user-agent') || undefined
            } catch {
              // headers() may not be available in some contexts
            }
            const session = await createSession(token.userId as string, userAgent, ip)
            token.sessionId = session.sessionID
          }
        } catch (error) {
          console.error('[JWT Callback] Error creating DB session:', error)
        }
      }

      // Проверяем валидность сессии в БД при каждом запросе
      if (token.sessionId) {
        try {
          const dbSession = await getSession(token.sessionId as string)
          if (!dbSession) {
            console.log('[JWT Callback] Session invalidated for userId:', token.userId)
            return { ...token, userId: undefined, isAdmin: undefined, sessionId: undefined }
          }
        } catch (error) {
          console.error('[JWT Callback] Error checking session:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.userId) {
          session.user.id = token.userId as string
        }
        if (token.provider) {
          session.user.provider = token.provider as string
        }
        if (token.isAdmin !== undefined) {
          session.user.isAdmin = token.isAdmin as boolean
        }
        if (token.sessionId) {
          session.user.sessionId = token.sessionId as string
        }
      }
      return session
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && message.token?.sessionId) {
        try {
          await deleteSession(message.token.sessionId as string)
          console.log('[SignOut Event] DB session deleted')
        } catch (error) {
          console.error('[SignOut Event] Error deleting session:', error)
        }
      }
    },
  },
})
