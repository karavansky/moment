'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSession, signIn as nextAuthSignIn } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session } from 'next-auth'

interface AuthContextType {
  session: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signIn: (provider: 'google' | 'apple', callbackUrl?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [isClient, setIsClient] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

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
    signOut,
  }), [session, status, signIn, signOut])

  // Предотвращаем гидратацию на стороне сервера
  if (!isClient) {
    return <>{children}</>
  }

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
      signOut: async () => {},
    }
  }
  return context
}
