// 🤖 Этот файл сгенерирован автоматически. НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ!
// Для обновления запустите: npm run generate:routes
//
// Маршруты берутся из секции "routes" в каждом словаре (config/dictionaries/*.json)

import { SupportedLocale } from './locales'

// Маппинг маршрутов для каждого языка
export const routeMapping: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'about': 'about',
    'getStarted': 'get-started',
    'privacyPolicy': 'privacy-policy',
    'termsOfUse': 'terms-of-use',
    'support': 'support',
  },
  de: {
    'about': 'ueber-uns',
    'getStarted': 'erste-schritte',
    'privacyPolicy': 'datenschutz',
    'termsOfUse': 'nutzungsbedingungen',
    'support': 'hilfe',
  },
  es: {
    'about': 'acerca-de',
    'getStarted': 'primeros-pasos',
    'privacyPolicy': 'politica-de-privacidad',
    'termsOfUse': 'terminos-de-uso',
    'support': 'ayuda',
  },
  fr: {
    'about': 'a-propos',
    'getStarted': 'demarrer',
    'privacyPolicy': 'politique-de-confidentialite',
    'termsOfUse': 'conditions-d-utilisation',
    'support': 'aide',
  },
  id: {
    'about': 'tentang',
    'getStarted': 'mulai',
    'privacyPolicy': 'kebijakan-privasi',
    'termsOfUse': 'ketentuan-penggunaan',
    'support': 'dukungan',
  },
  ja: {
    'about': 'about',
    'getStarted': 'get-started',
    'privacyPolicy': 'privacy-policy',
    'termsOfUse': 'terms-of-use',
    'support': 'support',
  },
  pt: {
    'about': 'sobre',
    'getStarted': 'primeiros-passos',
    'privacyPolicy': 'politica-de-privacidade',
    'termsOfUse': 'termos-de-utilizacao',
    'support': 'suporte',
  },
  tr: {
    'about': 'hakkinda',
    'getStarted': 'baslarken',
    'privacyPolicy': 'gizlilik-politikasi',
    'termsOfUse': 'kullanim-sartlari',
    'support': 'destek',
  },
  uk: {
    'about': 'pro-nas',
    'getStarted': 'start',
    'privacyPolicy': 'politika-konfidentsiynosti',
    'termsOfUse': 'umovi-vikoristannya',
    'support': 'pidtrymka',
  },
  it: {
    'about': 'informazioni',
    'getStarted': 'inizia',
    'privacyPolicy': 'politica-sulla-privacy',
    'termsOfUse': 'termini-di-utilizzo',
    'support': 'supporto',
  },
  pl: {
    'about': 'informacje',
    'getStarted': 'rozpocznij',
    'privacyPolicy': 'polityka-prywatnosci',
    'termsOfUse': 'warunki-uzytkowania',
    'support': 'wsparcie',
  },
  ru: {
    'about': 'o-nas',
    'getStarted': 'start',
    'privacyPolicy': 'politika-konfidencialnosti',
    'termsOfUse': 'usloviya-ispolzovaniya',
    'support': 'podderzhka',
  },
}

// Обратный маппинг: переведенный slug -> оригинальный slug
export const reverseRouteMapping: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'about': 'about',
    'get-started': 'getStarted',
    'privacy-policy': 'privacyPolicy',
    'terms-of-use': 'termsOfUse',
    'support': 'support',
  },
  de: {
    'ueber-uns': 'about',
    'erste-schritte': 'getStarted',
    'datenschutz': 'privacyPolicy',
    'nutzungsbedingungen': 'termsOfUse',
    'hilfe': 'support',
  },
  es: {
    'acerca-de': 'about',
    'primeros-pasos': 'getStarted',
    'politica-de-privacidad': 'privacyPolicy',
    'terminos-de-uso': 'termsOfUse',
    'ayuda': 'support',
  },
  fr: {
    'a-propos': 'about',
    'demarrer': 'getStarted',
    'politique-de-confidentialite': 'privacyPolicy',
    'conditions-d-utilisation': 'termsOfUse',
    'aide': 'support',
  },
  id: {
    'tentang': 'about',
    'mulai': 'getStarted',
    'kebijakan-privasi': 'privacyPolicy',
    'ketentuan-penggunaan': 'termsOfUse',
    'dukungan': 'support',
  },
  ja: {
    'about': 'about',
    'get-started': 'getStarted',
    'privacy-policy': 'privacyPolicy',
    'terms-of-use': 'termsOfUse',
    'support': 'support',
  },
  pt: {
    'sobre': 'about',
    'primeiros-passos': 'getStarted',
    'politica-de-privacidade': 'privacyPolicy',
    'termos-de-utilizacao': 'termsOfUse',
    'suporte': 'support',
  },
  tr: {
    'hakkinda': 'about',
    'baslarken': 'getStarted',
    'gizlilik-politikasi': 'privacyPolicy',
    'kullanim-sartlari': 'termsOfUse',
    'destek': 'support',
  },
  uk: {
    'pro-nas': 'about',
    'start': 'getStarted',
    'politika-konfidentsiynosti': 'privacyPolicy',
    'umovi-vikoristannya': 'termsOfUse',
    'pidtrymka': 'support',
  },
  it: {
    'informazioni': 'about',
    'inizia': 'getStarted',
    'politica-sulla-privacy': 'privacyPolicy',
    'termini-di-utilizzo': 'termsOfUse',
    'supporto': 'support',
  },
  pl: {
    'informacje': 'about',
    'rozpocznij': 'getStarted',
    'polityka-prywatnosci': 'privacyPolicy',
    'warunki-uzytkowania': 'termsOfUse',
    'wsparcie': 'support',
  },
  ru: {
    'o-nas': 'about',
    'start': 'getStarted',
    'politika-konfidencialnosti': 'privacyPolicy',
    'usloviya-ispolzovaniya': 'termsOfUse',
    'podderzhka': 'support',
  },
}

// Получить переведенный маршрут
export function getLocalizedRoute(route: string, locale: SupportedLocale): string {
  return routeMapping[locale]?.[route] || route
}

// Получить оригинальный маршрут из переведенного
export function getCanonicalRoute(localizedRoute: string, locale: SupportedLocale): string {
  return reverseRouteMapping[locale]?.[localizedRoute] || localizedRoute
}

// Генерация всех переведенных URL для страницы (для hreflang)
export function getAlternateUrls(route: string, baseUrl: string): Record<string, string> {
  const alternates: Record<string, string> = {}

  const locales: SupportedLocale[] = ["en","de","es","fr","id","ja","pt","tr","uk","it","pl","ru"]
  locales.forEach(locale => {
    const localizedRoute = getLocalizedRoute(route, locale)
    alternates[locale] = `${baseUrl}/${locale}/${localizedRoute}`
  })

  alternates['x-default'] = `${baseUrl}/en/${routeMapping.en[route] || route}`

  return alternates
}
