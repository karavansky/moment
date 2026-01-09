'use client'

import { usePathname } from 'next/navigation'
import { supportedLocales, defaultLocale, SupportedLocale } from '@/config/locales'
import { useServerLanguage } from '@/components/Providers'

export function useLanguage(): SupportedLocale {
  const pathname = usePathname()
  const serverLang = useServerLanguage()

  // Извлекаем язык из pathname (например, /de/about -> de)
  const segments = pathname?.split('/').filter(Boolean) || []
  const firstSegment = segments[0]

  // ПРИОРИТЕТ 1: Проверяем, является ли первый сегмент поддерживаемым языком
  if (firstSegment && supportedLocales.includes(firstSegment as SupportedLocale)) {
    return firstSegment as SupportedLocale
  }

  // ПРИОРИТЕТ 2: Для корневого маршрута "/" используем язык с сервера (SSR)
  // Это гарантирует, что сервер и клиент рендерят одинаковый язык
  if (serverLang && supportedLocales.includes(serverLang as SupportedLocale)) {
    return serverLang as SupportedLocale
  }

  // ПРИОРИТЕТ 3: возвращаем defaultLocale
  return defaultLocale
}
