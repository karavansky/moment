'use server'

import { cookies } from 'next/headers'

const SIDEBAR_COOKIE_NAME = 'sidebar-expanded'

/**
 * Получить состояние Sidebar из cookie (серверная функция)
 */
export async function getSidebarState(): Promise<boolean> {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)

  // По умолчанию Sidebar развернут
  return sidebarCookie?.value === 'true' || sidebarCookie?.value === undefined
}

/**
 * Сохранить состояние Sidebar в cookie (серверная функция)
 */
export async function setSidebarState(isExpanded: boolean): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(SIDEBAR_COOKIE_NAME, String(isExpanded), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 год
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
