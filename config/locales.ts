// Централизованная конфигурация локалей

import { it } from "node:test";

// Локали, для которых есть словари (реально поддерживаемые)
// Список соответствует файлам в config/dictionaries/*.json
export const supportedLocales = ["en", "de", "es", "fr", "id", "ja", "pt", "tr", "uk", "it", "pl", "ru"] as const;

// Дефолтная локаль
export const defaultLocale = "en" as const;

// Все возможные локали браузеров (для автоопределения)
export const allLocales = ["en", "de", "fr", "es", "ru", "pt", "tr", "ja", "id", "uk", "ua", "it", "pl"] as const;

// Тип для поддерживаемых локалей
export type SupportedLocale = (typeof supportedLocales)[number];

// Маппинг локалей браузера на поддерживаемые локали
export const localeMapping: Record<string, SupportedLocale> = {
  en: "en",
  de: "de",
  es: "es",
  fr: "fr",
  id: "id",
  ja: "ja",
  pt: "pt",
  ru: "ru",
  tr: "tr",
  uk: "uk", // Ukrainian (ISO 639-1 standard code)
  ua: "uk", // Redirect old ua code to uk
  it: "it",
  pl: "pl",
};
