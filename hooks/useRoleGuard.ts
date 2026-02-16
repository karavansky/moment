'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/hooks/useLanguage'

/**
 * Редирект для ограниченных ролей (worker, client) на /dienstplan.
 * Разрешает только /dienstplan и /auth/* маршруты.
 */
export function useRoleGuard() {
  const { session, status: authStatus } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const lang = useLanguage()

  useEffect(() => {
    if (authStatus !== 'authenticated') return

    const userStatus = session?.user?.status
    // Только worker (1) и client (2) ограничены
    if (userStatus !== 1 && userStatus !== 2) return

    // Разрешённые маршруты
    const dienstplanPath = `/${lang}/dienstplan`
    const authPrefix = `/${lang}/auth`

    if (pathname === `/${lang}` || pathname === `/${lang}/`) {
      // Home → redirect to dienstplan
      router.replace(dienstplanPath)
      return
    }

    if (pathname.startsWith(dienstplanPath) || pathname.startsWith(authPrefix)) {
      return // Разрешено
    }

    // Все остальные маршруты → redirect
    router.replace(dienstplanPath)
  }, [authStatus, session, pathname, router, lang])

  // Возвращаем информацию о роли для использования в компонентах
  const userStatus = session?.user?.status
  const isRestricted = authStatus === 'authenticated' && (userStatus === 1 || userStatus === 2)

  // Пока auth загружается — не знаем роль, скрываем Sidebar чтобы избежать мигания
  const isLoading = authStatus === 'loading'

  return { isRestricted, isLoading }
}
