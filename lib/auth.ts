import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import { createUser, getUserByEmail, updateUserToken } from './users'
import { sendNewUserNotification } from './email'

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

        // Пытаемся сохранить пользователя в базу данных
        try {
          if (user.email && user.name) {
            console.log('[JWT Callback] Checking if user exists in DB...')
            const existingUser = await getUserByEmail(user.email)

            if (existingUser) {
              console.log('[JWT Callback] User exists, updating token. UserID:', existingUser.userID)
              // Обновляем токен существующего пользователя
              if (account.access_token) {
                await updateUserToken(existingUser.userID, account.access_token)
              }
              token.userId = existingUser.userID
              token.isAdmin = existingUser.isAdmin
            } else {
              console.log('[JWT Callback] User does not exist, creating new user...')
              // Создаем нового пользователя
              const newUser = await createUser(
                user.name,
                user.email,
                account.access_token || '',
                account.provider
              )
              console.log('[JWT Callback] New user created. UserID:', newUser.userID)
              token.userId = newUser.userID
              token.isAdmin = newUser.isAdmin

              // Отправляем уведомление администратору о новом пользователе
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
                // Продолжаем регистрацию даже если отправка email не удалась
              }
            }
          } else {
            console.warn('[JWT Callback] Missing user.email or user.name:', { email: user.email, name: user.name })
          }
        } catch (error) {
          console.error('[JWT Callback] Error saving user to database:', error)
          // Продолжаем авторизацию даже если БД недоступна
        }
      }
      return token
    },
    async session({ session, token }) {
      // Добавляем информацию из токена в сессию
      if (session.user) {
        // Используем userId из токена если есть
        if (token.userId) {
          session.user.id = token.userId as string
        }
        if (token.provider) {
          session.user.provider = token.provider as string
        }
        if (token.isAdmin !== undefined) {
          session.user.isAdmin = token.isAdmin as boolean
        }
      }
      return session
    },
  },
})
