import { headers } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import { allLocales, supportedLocales, defaultLocale } from '@/config/locales'
import type { SupportedLocale } from '@/config/locales'
import { getDictionary } from '@/config/dictionaries'
import { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HomeClient from './[lang]/HomeClient'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import { LanguageSync } from '@/components/LanguageSync'
import { WebVitals } from '@/components/WebVitals'
import { generateMetadata as generateRootMetadata } from '@/app/[lang]/layout'
import { LayoutClient } from '@/components/LayoutClient'
import DienstplanPage from './[lang]/dienstplan/page'
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quailbreeder.net'

// Маппинг языков в локали OpenGraph
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

function getLocaleFromHeaders(acceptLanguage: string): SupportedLocale {
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
// Генерация статических параметров для всех поддерживаемых языков
export async function generateStaticParams() {
  return supportedLocales.map(lang => ({ lang }))
}
export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = await generateRootMetadata({ params: Promise.resolve({ lang: 'en' }) })
  return {
    ...baseMetadata,
    alternates: {
      ...baseMetadata.alternates,
      canonical: `${baseUrl}/`,
    },
  }
}

/*
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const detectedLang = getLocaleFromHeaders(acceptLanguage)

  const dict = await getDictionary(detectedLang)

  // Генерируем hreflang для всех языков
  const languages: Record<string, string> = {}
  supportedLocales.forEach(locale => {
    languages[locale] = `${baseUrl}/${locale}`
  })
  languages['x-default'] = `${baseUrl}/`

  return {
    metadataBase: new URL(baseUrl),
    title: dict.seo.home.title,
    description: dict.seo.home.description,
    alternates: {
      canonical: `${baseUrl}/`, // Self-referencing canonical - корневая страница каноническая для себя
      languages,
    },
    icons: {
      favicon: '/favicon.ico',
      icon: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' }],
      shortcut: '/favicon.ico',
      apple: '/hatching-quail-icon.webp',
      appleTouchIcon: '/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      locale: localeMap[detectedLang] || 'en_US',
      url: baseUrl,
      siteName: 'QuailBreeder',
      title: dict.seo.home.title,
      description: dict.seo.home.description,
      images: [
        {
          url: '/flow_map_quail_breeder_sm.webp',
          width: 1200,
          height: 630,
          alt: 'QuailBreeder Application Interface',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.seo.home.title,
      description: dict.seo.home.description,
      images: ['/flow_map_quail_breeder_sm.webp'],
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
        appleWebApp: {
      capable: true,
      title: 'QuailBreeder',
      statusBarStyle: 'default',
    },
  }
}
*/
export default async function RootPage() {
  const isProduction = process.env.NODE_ENV === 'production'
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const detectedLang = getLocaleFromHeaders(acceptLanguage)

  const dictionary = await getDictionary(detectedLang)

  return (
    <html lang={detectedLang} suppressHydrationWarning>
      <head>
        {/* Content-Language meta tag */}
        <meta httpEquiv="content-language" content={detectedLang} />

        {/* Prevent theme flash - apply theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />

        {/* Google Analytics */}
        {isProduction && <GoogleAnalytics gaId="G-3SPK1FFQN1" />}
      </head>
      <body suppressHydrationWarning>
        <WebVitals />
        <Providers
          themeProps={{
            attribute: 'class',
            defaultTheme: 'dark',
            enableSystem: false,
            storageKey: 'theme',
          }}
          dictionary={dictionary}
        >
          <LanguageSync />
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
