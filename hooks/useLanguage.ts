'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supportedLocales, defaultLocale, SupportedLocale, localeMapping } from '@/config/locales'

export function useLanguage(): SupportedLocale {
  const pathname = usePathname()
  const [browserLang, setBrowserLang] = useState<SupportedLocale | null>(null)

  // Извлекаем язык из pathname (например, /de/about -> de)
  const segments = pathname?.split('/').filter(Boolean) || []
  const firstSegment = segments[0]

  // На клиенте определяем язык браузера один раз
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lang = navigator.language.split('-')[0]
      const mapped = localeMapping[lang] || defaultLocale
      setBrowserLang(mapped as SupportedLocale)
    }
  }, [])

  // Проверяем, является ли первый сегмент поддерживаемым языком
  if (firstSegment && supportedLocales.includes(firstSegment as SupportedLocale)) {
    //console.log('[useLanguage] Extracted from pathname:', { pathname, firstSegment })
    return firstSegment as SupportedLocale
  }

  // Если pathname = "/" (корневой маршрут), используем язык браузера вместо дефолтного
  if (pathname === '/' && browserLang) {
    //console.log('[useLanguage] Root path, using browser language:', { pathname, browserLang })
    return browserLang
  }

  //console.log('[useLanguage] Using default locale:', { pathname, firstSegment, defaultLocale })
  return defaultLocale
}
