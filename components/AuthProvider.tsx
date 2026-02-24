'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSession, signIn as nextAuthSignIn } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session } from 'next-auth'

interface SignInWithCredentialsResult {
  error?: string
  ok?: boolean
}

interface AuthContextType {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signIn: (provider: 'google' | 'apple', callbackUrl?: string) => Promise<void>
  signInWithCredentials: (email: string, password: string, callbackUrl?: string) => Promise<SignInWithCredentialsResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🎨 AuthProvider RENDER')
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  // КРИТИЧНО: Используем useRef для pathname чтобы избежать пересоздания callbacks
  const pathnameRef = useRef(pathname)
  const routerRef = useRef(router)

  useEffect(() => {
    pathnameRef.current = pathname
    routerRef.current = router
  }, [pathname, router])

  // Стабильные callbacks - НЕ зависят от pathname напрямую
  const signIn = useCallback(async (provider: 'google' | 'apple', callbackUrl?: string) => {
    try {
      const segments = pathnameRef.current?.split('/').filter(Boolean) || []
      const locale = segments[0] || 'en'
      // Use provided callbackUrl or default to support page
      const redirectUrl = callbackUrl || `/${locale}/support`
      await nextAuthSignIn(provider, { callbackUrl: redirectUrl })
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }, [])

  const signInWithCredentials = useCallback(async (email: string, password: string, callbackUrl?: string): Promise<SignInWithCredentialsResult> => {
    try {
      const segments = pathnameRef.current?.split('/').filter(Boolean) || []
      const locale = segments[0] || 'en'
      const redirectUrl = callbackUrl || `/${locale}/support`

      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        return { error: result.error }
      }

      if (result?.ok) {
        routerRef.current.push(redirectUrl)
        routerRef.current.refresh()
        return { ok: true }
      }

      return { error: 'Unknown error' }
    } catch (error) {
      console.error('Credentials sign in error:', error)
      return { error: 'Sign in failed' }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      const segments = pathnameRef.current?.split('/').filter(Boolean) || []
      const locale = segments[0] || 'en'
      // Redirect to localized signout page
      routerRef.current.push(`/${locale}/auth/signout`)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }, [])

  // Мемоизируем value чтобы избежать лишних ре-рендеров
  const value = useMemo(() => ({
    session,
    status,
    signIn,
    signInWithCredentials,
    signOut,
  }), [session, status, signIn, signInWithCredentials, signOut])

  // Всегда рендерим Provider, но передаем isClient флаг в контекст если нужно
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Return safe defaults when used outside AuthProvider
    return {
      session: null,
      status: 'unauthenticated' as const,
      signIn: async (_provider: 'google' | 'apple', _callbackUrl?: string) => {},
      signInWithCredentials: async (_email: string, _password: string, _callbackUrl?: string) => ({ error: 'Not available' }),
      signOut: async (_callbackUrl?: string) => {},
    }
  }
  return context
}
