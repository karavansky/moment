import { Metadata } from 'next'
import { supportedLocales } from '@/config/locales'
import { getLocalizedRoute } from '@/config/routes'
import type { SupportedLocale } from '@/config/locales'

// Базовые настройки OpenGraph
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://moment-lbs.app'

// Маппинг языков в локали OpenGraph (ISO 639-1 + ISO 3166-1)
const localeMap: Record<string, string> = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  fr: 'fr_FR',
  id: 'id_ID',
  ja: 'ja_JP',
  pt: 'pt_PT',
  ru: 'ru_RU',
  tr: 'tr_TR',
  uk: 'uk_UA', // Ukrainian
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'QuailBreeder - Accounting for Quail Breeding',
    template: '%s | QuailBreeder',
  },
  description: 'Take control of your business with poultry management software',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'QuailBreeder',
    title: 'QuailBreeder - Accounting for Quail Breeding',
    description:
      'Take control of your business with poultry management software. Track incubation, hatching, brooding, feeding, and selling processes.',
    images: [
      {
        url: '/hatching-quail-icon.webp',
        width: 200,
        height: 200,
        alt: 'QuailBreeder Application Interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuailBreeder - Accounting for Quail Breeding',
    description:
      'Take control of your business with poultry management software. Track incubation, hatching, brooding, feeding, and selling processes.',
    images: ['/flow_map_quail_breeder_sm.webp'],
  },
}

// JSON-LD структурированные данные
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'QuailBreeder',
    url: baseUrl,
    logo: `${baseUrl}/hatching-quail-icon.webp`,
    description: 'Poultry management software for quail breeding operations',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'quailbreeding@gmail.com',
      contactType: 'Customer Service',
    },
  }
}

export function generateWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'QuailBreeder',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'iOS',
    offers: {
      '@type': 'Offer',
      price: '5',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      reviewCount: '77',
    },
    description:
      'Comprehensive quail farm management system for tracking incubation, hatching, brooding, feeding, and sales.',
    screenshot: `${baseUrl}/quail-background.webp`,
    featureList: [
      'Unlimited incubators support',
      'Visual equipment load display',
      'External calendar integration',
      'Mortality tracking',
      'Automated batch archiving',
      'Customizable invoice templates',
    ],
  }
}

// Хелпер для создания метаданных для конкретных страниц с поддержкой локализации
export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  lang: string = 'en',
  image?: string
): Metadata {
  // Убираем язык из пути если он там есть и слеш в начале
  const cleanPath = path.startsWith('/en') || path.startsWith('/de') ? path.substring(3) : path
  const routeKey = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath

  // Для главной страницы (пустой routeKey) не добавляем дополнительный слеш
  const isHomePage = !routeKey

  // Получаем переведенный маршрут для текущего языка
  const localizedRoute = isHomePage ? '' : getLocalizedRoute(routeKey, lang as SupportedLocale)
  const canonicalUrl = isHomePage ? `${baseUrl}/${lang}` : `${baseUrl}/${lang}/${localizedRoute}`

  // Генерируем объект languages для hreflang тегов с переведенными маршрутами
  // routeKey уже является каноническим ключом (например, 'get-started')
  const languages: Record<string, string> = {}
  supportedLocales.forEach(locale => {
    const translatedRoute = isHomePage ? '' : getLocalizedRoute(routeKey, locale)
    languages[locale] = isHomePage
      ? `${baseUrl}/${locale}`
      : `${baseUrl}/${locale}/${translatedRoute}`
  })
  // x-default: для главной страницы указывает на корень (/), для остальных на /en версию
  languages['x-default'] = isHomePage
    ? `${baseUrl}/`
    : `${baseUrl}/en/${getLocalizedRoute(routeKey, 'en')}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      locale: localeMap[lang] || 'en_US',
      images: image ? [{ url: image }] : defaultMetadata.openGraph?.images,
    },
    twitter: {
      title,
      description,
      images: image ? [image] : defaultMetadata.twitter?.images,
    },
  }
}
