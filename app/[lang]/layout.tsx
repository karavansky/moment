import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getDictionary, hasLocale } from '@/config/dictionaries'
import { notFound } from 'next/navigation'
import { Providers } from '@/components/Providers'
import { LayoutClient } from '@/components/LayoutClient'
import { supportedLocales } from '@/config/locales'
import { WebVitals } from '@/components/WebVitals'
import { GoogleAnalytics } from '@next/third-parties/google'
import { getSidebarState } from '@/lib/sidebar-actions'
import { PushNotificationBanner } from '@/components/PushNotificationBanner'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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
  //       icon: '/web-app-manifest-192x192.png',

  return {
    metadataBase: new URL(baseUrl),
    title: 'Reliable time and location tracking for care & field services.',
    description:
      'Moment LBS: The smartest way to manage your mobile workforce. Instantly track time and GPS location for care workers and field staff via your browser. No installation required — start optimizing your business operations in seconds.',
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
      siteName: 'Moment LBS',
      title: 'Reliable time and location tracking for care & field services.',
      description:
        'Moment LBS: The smartest way to manage your mobile workforce. Instantly track time and GPS location for care workers and field staff via your browser. No installation required — start optimizing your business operations in seconds.',
      images: [
        {
          url: '/web-app-manifest-192x192.png',
          width: 200,
          height: 200,
          alt: 'Moment LBS Application Interface',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Moment LBS - Reliable time and location tracking for care & field services.',
      description:
        'Moment LBS: The smartest way to manage your mobile workforce. Instantly track time and GPS location for care workers and field staff via your browser. No installation required — start optimizing your business operations in seconds.',
      images: ['/web-app-manifest-192x192.png'],
    },
    keywords: [
      'Field staff tracking app',
      'Home care time tracking',
      'Location-based service for mobile workers',
      'Visit verification app',
      'Transport services log',
      'Mobile workforce management',
      'staff location tracking',
    ],
    authors: [{ name: 'Serhii Karavanskyi' }],
    creator: 'Moment LBS',
    publisher: 'Moment LBS',
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
      title: 'Moment LBS',
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

  // Читаем начальное состояние Sidebar из cookie (SSR)
  const initialSidebarExpanded = await getSidebarState()

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Content-Language meta tag */}
        <meta httpEquiv="content-language" content={lang} />

        {/* Google Analytics */}
        {isProduction && <GoogleAnalytics gaId="G-HB6BYNFW9F" />}
      </head>
      <body
        suppressHydrationWarning
        className="h-dvh overflow-hidden antialiased md:subpixel-antialiased"
      >
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
          lang={lang}
          initialSidebarExpanded={initialSidebarExpanded}
        >
          <div className="flex h-dvh overflow-hidden">
            <LayoutClient>
              <main className="flex-1 overflow-auto pt-16">
                <PushNotificationBanner />
                {children}
              </main>
            </LayoutClient>
          </div>
        </Providers>
      </body>
    </html>
  )
}
