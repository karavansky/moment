/**
 * Utility functions for managing language preference in cookies
 */

import type { SupportedLocale } from '@/config/locales'

const LANGUAGE_COOKIE_NAME = 'preferred-language'

/**
 * Set the preferred language in cookies
 */
export function setLanguageCookie(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return

  // Set cookie for 1 year
  const maxAge = 365 * 24 * 60 * 60
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/**
 * Get the preferred language from cookies
 */
export function getLanguageCookie(): SupportedLocale | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  const languageCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${LANGUAGE_COOKIE_NAME}=`)
  )

  if (!languageCookie) return null

  const locale = languageCookie.split('=')[1]?.trim()
  return locale as SupportedLocale
}
