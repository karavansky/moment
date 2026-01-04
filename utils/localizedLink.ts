import { getLocalizedRoute } from '@/config/routes'
import type { SupportedLocale } from '@/config/locales'

/**
 * Генерирует локализованную ссылку
 * @param route - каноничный ключ маршрута (например, 'about', 'get-started')
 * @param lang - язык
 * @returns локализованная ссылка (например, '/de/ueber-uns')
 */
export function localizedLink(route: string, lang: SupportedLocale): string {
  if (!route) return `/${lang}`

  const localizedRoute = getLocalizedRoute(route, lang)
  return `/${lang}/${localizedRoute}`
}
