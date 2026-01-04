import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

const dictionaries = {
  en: () => import('@/config/dictionaries/en.json').then((module) => module.default),
  de: () => import('@/config/dictionaries/de.json').then((module) => module.default),
  ru: () => import('@/config/dictionaries/ru.json').then((module) => module.default),
  fr: () => import('@/config/dictionaries/fr.json').then((module) => module.default),
  es: () => import('@/config/dictionaries/es.json').then((module) => module.default),
  uk: () => import('@/config/dictionaries/uk.json').then((module) => module.default),
  pt: () => import('@/config/dictionaries/pt.json').then((module) => module.default),
  tr: () => import('@/config/dictionaries/tr.json').then((module) => module.default),
  ja: () => import('@/config/dictionaries/ja.json').then((module) => module.default),
  id: () => import('@/config/dictionaries/id.json').then((module) => module.default),
  it: () => import('@/config/dictionaries/it.json').then((module) => module.default),
  pl: () => import('@/config/dictionaries/pl.json').then((module) => module.default),
}

export type Locale = keyof typeof dictionaries

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries

// Внутренняя функция загрузки словаря с долгосрочным кэшированием
const loadDictionary = unstable_cache(
  async (locale: Locale) => {
    console.log(`[loadDictionary] Loading dictionary for locale: ${locale}`);
    return dictionaries[locale]();
  },
  ['dictionary'], // cache key prefix
  {
    tags: ['dictionary'], // для revalidation при необходимости
    revalidate: false, // кэш никогда не истекает (словари статичные)
  }
);

// Дополнительное кэширование на уровне React request
// Это гарантирует, что один и тот же словарь загружается только один раз за request
export const getDictionary = cache(async (locale: Locale) => {
  return loadDictionary(locale);
});