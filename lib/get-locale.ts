import { cookies, headers } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import { supportedLocales, allLocales, defaultLocale } from '@/config/locales'
import type { SupportedLocale } from '@/config/locales'

/**
 * Определяет текущую локаль из cookie preferred-language или Accept-Language header.
 * Для использования в API routes и server components.
 */
export async function getLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies()
  const headersList = await headers()

  const preferredLanguage = cookieStore.get('preferred-language')?.value
  const acceptLanguage = headersList.get('accept-language') || ''

  // ПРИОРИТЕТ 1: cookie preferred-language
  if (preferredLanguage && supportedLocales.includes(preferredLanguage as any)) {
    return preferredLanguage as SupportedLocale
  }

  // ПРИОРИТЕТ 2: Accept-Language header
  const negotiator = new Negotiator({
    headers: { 'accept-language': acceptLanguage },
  } as any)
  const languages = negotiator.languages()

  let matchedLocale: string
  try {
    matchedLocale = match(languages, [...allLocales], defaultLocale)
  } catch {
    matchedLocale = defaultLocale
  }

  if (!supportedLocales.includes(matchedLocale as any)) {
    return defaultLocale
  }

  return matchedLocale as SupportedLocale
}
