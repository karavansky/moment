'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Dropdown, Button, Link } from '@heroui/react'
import { supportedLocales } from '@/config/locales'
import type { SupportedLocale } from '@/config/locales'
import { setLanguageCookie } from '@/utils/languageCookie'
import { getLocalizedRoute, getCanonicalRoute } from '@/config/routes'
import * as flags from 'country-flag-icons/react/3x2'
import type { Selection } from '@heroui/react'
import { linkVariants } from '@heroui/react'
import NextLink from 'next/link'

// ... (оставьте languageNames и flagComponents как есть) ...
const languageNames: Record<SupportedLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  pt: 'Português',
  tr: 'Türkçe',
  uk: 'Українська',
  it: 'Italiano',
  pl: 'Polski',
  ru: 'Русский',
}

const flagComponents: Record<SupportedLocale, React.ComponentType<{ className?: string }>> = {
  en: flags.GB,
  de: flags.DE,
  es: flags.ES,
  fr: flags.FR,
  id: flags.ID,
  ja: flags.JP,
  pt: flags.PT,
  tr: flags.TR,
  uk: flags.UA,
  it: flags.IT,
  pl: flags.PL,
  ru: flags.RU,
}

interface LanguageSwitcherProps {
  currentLang: string
}

export default function LanguageSwitcher({ currentLang }: LanguageSwitcherProps) {
  const pathname = usePathname()
  const effectiveLang = currentLang as SupportedLocale
  const CurrentFlagIcon = flagComponents[effectiveLang]
  const [selected, setSelected] = useState<Selection>(new Set([effectiveLang]))
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Mount effect - runs once on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync selected language with current language from URL
  useEffect(() => {
    setSelected(new Set([effectiveLang]))
  }, [effectiveLang])

  // Sync cookie with current language (only on client)
  useEffect(() => {
    console.log('[LanguageSwitcher] Setting language cookie:', effectiveLang)
    setLanguageCookie(effectiveLang)
    // Verify cookie was set
    const savedCookie = document.cookie.split(';').find(c => c.trim().startsWith('preferred-language='))
    console.log('[LanguageSwitcher] Cookie after set:', savedCookie)
  }, [effectiveLang])

  // Функция расчета пути (Memoized для производительности)
  // Вычисляет пути для ВСЕХ языков сразу, чтобы вставить их в href
  const localizedPaths = useMemo(() => {
    if (!pathname) return {} as Record<SupportedLocale, string>

    const paths = {} as Record<SupportedLocale, string>

    // Парсим текущий путь
    const pathParts = pathname.split('/').filter(Boolean)
    // Убираем текущую локаль из пути, если она там есть
    if (pathParts.length > 0 && supportedLocales.includes(pathParts[0] as SupportedLocale)) {
      pathParts.shift()
    }
    const currentRouteSlug = pathParts.join('/')

    // Получаем канонический ключ текущей страницы
    const canonicalKey = getCanonicalRoute(currentRouteSlug, effectiveLang)

    supportedLocales.forEach(locale => {
      let newPath = `/${locale}`

      if (canonicalKey) {
        // Если есть перевод маршрута
        const localizedRoute = getLocalizedRoute(canonicalKey, locale)
        if (localizedRoute) {
          newPath += `/${localizedRoute}`
        }
      } else if (currentRouteSlug) {
        // Fallback: если перевода маршрута нет, оставляем слаг как есть
        newPath += `/${currentRouteSlug}`
      }

      paths[locale] = newPath
    })

    return paths
  }, [pathname, effectiveLang])

  const slots = linkVariants({ underline: 'none' })

  // Don't render until mounted on client to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="w-22 h-10" suppressHydrationWarning>
        {/* Placeholder to prevent layout shift */}
      </div>
    )
  }

  return (
    <div suppressHydrationWarning>
      <Dropdown>
        <Button aria-label="Language Switcher" variant="tertiary" size="md">
          <CurrentFlagIcon className="rounded-sm" />
          {effectiveLang.toUpperCase()}
        </Button>
        <Dropdown.Popover>
        <Dropdown.Menu
          aria-label="Language selection"
          selectedKeys={selected}
          selectionMode="single"
          onSelectionChange={keys => {
            const path = localizedPaths[Array.from(keys)[0] as SupportedLocale]
            router.push(path)
          }}
        >
          {supportedLocales.map(locale => {
            const FlagIcon = flagComponents[locale]
            const isSelected = locale === effectiveLang
            const href = localizedPaths[locale] || `/${locale}`

            return (
              <Dropdown.Item key={locale} id={locale}>
                <Dropdown.ItemIndicator />
                <NextLink href={href} className={slots.base()}>
                  <Link.Icon>
                    <FlagIcon className="w-10 h-4 rounded-xl pr-2" />
                  </Link.Icon>
                  {languageNames[locale]}
                </NextLink>
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
    </div>
  )
}

/*
                <a href={href} className="link link--underline-none link--offset-2">
                  {languageNames[locale]}
                </a>
                <NextLink href={href} className={slots.base()}>
                  <Link.Icon>
                    <FlagIcon className="w-10 h-4 rounded-xl pr-2" />
                  </Link.Icon>
                  {languageNames[locale]}
                </NextLink>

              <FlagIcon className='w-5 h-4 rounded-sm'/>
              <Label>{languageNames[locale]}</Label>
              <Dropdown.ItemIndicator />


            <Dropdown.Item
              key={locale}
              // 3. ИСПОЛЬЗУЕМ href (SEO + Accessibility)
              href={href}
              // Заставляем HeroUI использовать Next.js Link для SPA-перехода без перезагрузки
              as="a"
              startContent={
                <div className="w-5 h-4 flex items-center justify-center">
                  <FlagIcon className="w-full h-full object-cover rounded-sm" />
                </div>
              }
              endContent={isSelected ? '✓' : null}
              className={
                isSelected ? 'bg-gray-300! dark:bg-gray-700! text-sand-50! dark:text-white!' : ''
              }
            >
              {languageNames[locale]}
            </Dropdown.Item>
*/
