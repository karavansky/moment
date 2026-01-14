import { MetadataRoute } from 'next'
import { supportedLocales } from '@/config/locales'
import { getLocalizedRoute } from '@/config/routes'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://moment-lbs.app'

  // Current date for lastModified
  const currentDate = new Date()

  // Страницы сайта (используем ключи из словарей routes - camelCase)
  // Пустая строка '' означает главную страницу для каждого языка
  const pages = [
    { route: '', priority: 1.0, changeFrequency: 'monthly' as const }, // Главная страница
    { route: 'privacyPolicy', priority: 0.5, changeFrequency: 'yearly' as const },
    { route: 'termsOfUse', priority: 0.5, changeFrequency: 'yearly' as const },
    { route: 'about', priority: 0.5, changeFrequency: 'monthly' as const },
    { route: 'getStarted', priority: 0.5, changeFrequency: 'monthly' as const },
    { route: 'support', priority: 0.8, changeFrequency: 'weekly' as const },
  ]

  // Генерируем URL для всех языков и страниц
  const sitemapEntries: MetadataRoute.Sitemap = []

  // Добавляем корневую страницу / как универсальную (x-default)
  const rootLanguages: Record<string, string> = {}
  supportedLocales.forEach(lang => {
    rootLanguages[lang] = `${baseUrl}/${lang}`
  })
  rootLanguages['x-default'] = `${baseUrl}/` // x-default указывает на корневую страницу

  sitemapEntries.push({
    url: baseUrl + '/',
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 1.0,
    alternates: {
      languages: rootLanguages,
    },
  })

  // Генерируем записи для всех языковых версий
  supportedLocales.forEach(locale => {
    pages.forEach(page => {
      // Получаем переведенный маршрут для текущего языка
      const localizedRoute = page.route ? getLocalizedRoute(page.route, locale) : ''
      const pageUrl = `${baseUrl}/${locale}${localizedRoute ? '/' + localizedRoute : ''}`

      // Генерируем объект languages с переведенными маршрутами и x-default
      const languages: Record<string, string> = {}

      // Добавляем все поддерживаемые языки с их переведенными маршрутами
      supportedLocales.forEach(lang => {
        const translatedRoute = page.route ? getLocalizedRoute(page.route, lang) : ''
        languages[lang] = `${baseUrl}/${lang}${translatedRoute ? '/' + translatedRoute : ''}`
      })

      // x-default: для главной страницы языков указывает на корень (/), для подстраниц на /en версию
      if (page.route === '') {
        // Для языковых версий главной страницы x-default указывает на корень
        languages['x-default'] = `${baseUrl}/`
      } else {
        // Для подстраниц x-default указывает на английскую версию
        const enRoute = getLocalizedRoute(page.route, 'en')
        languages['x-default'] = `${baseUrl}/en/${enRoute}`
      }

      sitemapEntries.push({
        url: pageUrl,
        lastModified: currentDate,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages,
        },
      })
    })
  })

  return sitemapEntries
}
