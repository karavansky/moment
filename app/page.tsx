import DienstplanPage from './[lang]/dienstplan/page'
import { getDictionary } from '@/config/dictionaries'
import { Providers } from '@/components/Providers'
import { LayoutClient } from '@/components/LayoutClient'
import { supportedLocales } from '@/config/locales'
import { WebVitals } from '@/components/WebVitals'
import { GoogleAnalytics } from '@next/third-parties/google'
import { getSidebarState } from '@/lib/sidebar-actions'
import { headers, cookies } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import { allLocales, defaultLocale } from '@/config/locales'
import type { SupportedLocale } from '@/config/locales'
import type { Metadata } from 'next'

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'

function getLocale(preferredLanguage: string | undefined, acceptLanguage: string): SupportedLocale {
  // ПРИОРИТЕТ 1: Проверяем cookie preferred-language (установлен пользователем)
  if (preferredLanguage && supportedLocales.includes(preferredLanguage as any)) {
    return preferredLanguage as SupportedLocale
  }

  // ПРИОРИТЕТ 2: Определяем язык по заголовку Accept-Language браузера
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
    return defaultLocale as SupportedLocale
  }

  return matchedLocale as SupportedLocale
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const cookieStore = await cookies()
  const acceptLanguage = headersList.get('accept-language') || ''
  const preferredLanguage = cookieStore.get('preferred-language')?.value
  const detectedLang = getLocale(preferredLanguage, acceptLanguage)

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
    uk: 'uk_UA',
  }

  // Генерируем объект languages для hreflang тегов
  const languages: Record<string, string> = {}
  supportedLocales.forEach(locale => {
    languages[locale] = `${baseUrl}/${locale}`
  })
  // x-default указывает на корневой URL (универсальная страница)
  languages['x-default'] = `${baseUrl}/`

  return {
    metadataBase: new URL(baseUrl),
    title: 'Data Analysis and Decision Support Tool for Quail Farming',
    description: 'Take control of your business with poultry management software',
    alternates: {
      canonical: `${baseUrl}/`,
      languages,
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      ],
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      locale: localeMap[detectedLang] || 'en_US',
      url: baseUrl,
      siteName: 'QuailBreeder',
      title: 'Data Analysis and Decision Support Tool for Quail Farming',
      description:
        'Take control of your business with poultry management software. Track incubation, hatching, brooding, feeding, and selling processes.',
      images: [
        {
          url: '/hatching-quail-icon-200.webp',
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
      images: ['/hatching-quail-icon-200.webp'],
    },
    keywords: [
      'quail breeding',
      'poultry management',
      'incubation tracking',
      'farm management',
      'quail farm software',
      'hatching management',
      'brooding tracking',
    ],
    authors: [{ name: 'Serhii Karavanskyi' }],
    creator: 'QuailBreeder',
    publisher: 'QuailBreeder',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {},
    appleWebApp: {
      capable: true,
      title: 'QuailBreeder',
      statusBarStyle: 'default',
    },
  }
}

export default async function RootPage() {
  const isProduction = process.env.NODE_ENV === 'production'
  const headersList = await headers()
  const cookieStore = await cookies()
  const acceptLanguage = headersList.get('accept-language') || ''
  const preferredLanguage = cookieStore.get('preferred-language')?.value
  const detectedLang = getLocale(preferredLanguage, acceptLanguage)

  const dictionary = await getDictionary(detectedLang)

  // Читаем начальное состояние Sidebar из cookie (SSR)
  const initialSidebarExpanded = await getSidebarState()

  return (
    <html lang={detectedLang} suppressHydrationWarning>
      <head>
        {/* Content-Language meta tag */}
        <meta httpEquiv="content-language" content={detectedLang} />

        {/* Google Analytics */}
        {isProduction && <GoogleAnalytics gaId="G-3SPK1FFQN1" />}
      </head>
      <body suppressHydrationWarning className="h-dvh overflow-hidden">
        {/* Blocking script to prevent flash - executes BEFORE any rendering */}
        <script
          // Без defer/async - блокирующий скрипт, выполнится немедленно
          dangerouslySetInnerHTML={{
            __html: `
              const theme = localStorage.getItem('theme') || 'dark';
              document.documentElement.classList.add(theme);

              // Читаем состояние из localStorage (приоритет) или используем SSR значение
              const sidebarExpanded = localStorage.getItem('sidebar-expanded');
              const initialExpanded = ${JSON.stringify(initialSidebarExpanded)};

              // Если в localStorage нет значения, используем SSR cookie
              const isExpanded = sidebarExpanded !== null
                ? sidebarExpanded === 'true'
                : initialExpanded;

              // Применяем класс если sidebar свернут
              if (!isExpanded) {
                document.documentElement.classList.add('sidebar-collapsed');
              }
            `,
          }}
        />
        <WebVitals />
        <Providers
          themeProps={{
            attribute: 'class',
            defaultTheme: 'dark',
            enableSystem: false,
            storageKey: 'theme',
          }}
          dictionary={dictionary}
          lang={detectedLang}
          initialSidebarExpanded={initialSidebarExpanded}
        >
          <div className="flex h-dvh overflow-hidden">
            <LayoutClient>
              <main className="flex-1 overflow-auto pt-16">
                <DienstplanPage />
              </main>
            </LayoutClient>
          </div>
        </Providers>
      </body>
    </html>
  )
}
