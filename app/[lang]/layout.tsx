import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import Footer from '@/components/Footer'
import { getDictionary, hasLocale } from '@/config/dictionaries'
import { notFound } from 'next/navigation'
import { Providers } from '@/components/Providers'
import { LayoutClient } from '@/components/LayoutClient'
import { supportedLocales } from '@/config/locales'
import { WebVitals } from '@/components/WebVitals'
import { GoogleAnalytics } from '@next/third-parties/google'

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'

// Экспорт viewport отдельно (требование Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'auto',
}

// Генерация статических параметров для всех поддерживаемых языков
export async function generateStaticParams() {
  return supportedLocales.map(lang => ({ lang }))
}

// Функция для генерации metadata с учетом языка
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  console.log('lang in layout metadata:', lang)
  // Validate locale before proceeding
  if (!hasLocale(lang)) {
    notFound()
  }

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
  //       icon: '/hatching-quail-icon.webp',

  return {
    metadataBase: new URL(baseUrl),
    title: 'Data Analysis and Decision Support Tool for Quail Farming',
    description: 'Take control of your business with poultry management software',
    alternates: {
      canonical: `${baseUrl}/${lang}`,
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
      locale: localeMap[lang] || 'en_US',
      url: `${baseUrl}/${lang}`,
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
    verification: {
      // google: 'your-google-verification-code',
      // yandex: 'your-yandex-verification-code',
    },
    appleWebApp: {
      capable: true,
      title: 'QuailBreeder',
      statusBarStyle: 'default',
    },
  }
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const isProduction = process.env.NODE_ENV === 'production'
  const { lang } = await params
  console.log('Layout lang param:', lang)

  // Если язык не поддерживается, показываем 404
  // (proxy.ts должен перенаправлять на поддерживаемые языки)
  if (!hasLocale(lang)) {
    notFound()
  }

  const dictionary = await getDictionary(lang as any)

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Content-Language meta tag */}
        <meta httpEquiv="content-language" content={lang} />

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
      <body suppressHydrationWarning className="h-dvh overflow-hidden">
        <WebVitals />
        <Providers
          themeProps={{
            attribute: 'class',
            defaultTheme: 'dark',
            enableSystem: false,
            storageKey: 'theme',
          }}
          dictionary={dictionary}
          lang={lang}
        >
          <div className="flex h-dvh overflow-hidden">
            <LayoutClient>
              <main className="flex-1 overflow-auto pt-16">
                {children}
              </main>
            </LayoutClient>
          </div>
        </Providers>
      </body>
    </html>
  )
}
