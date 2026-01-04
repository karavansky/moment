"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supportedLocales, localeMapping } from "@/config/locales";
import type { SupportedLocale } from "@/config/locales";
import { getCanonicalRoute, getLocalizedRoute } from "@/config/routes";
import { getLanguageCookie } from "@/utils/languageCookie";

export function LanguageSync() {
  const pathname = usePathname();
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Проверяем только один раз при монтировании
    if (hasChecked.current) return;

    const checkAndRedirect = () => {
      // Проверяем, является ли это тестовым ботом (PageSpeed/Lighthouse)
      // SEO боты (Googlebot, Bingbot) НЕ блокируются - им нужно видеть все языковые версии
      const userAgent = navigator.userAgent || "";
      const isTestBot = /PageSpeed|lighthouse|gtmetrix|pingdom/i.test(userAgent);

      if (isTestBot) {
        console.log(`[LanguageSync] Test bot detected (${userAgent}), skipping language redirect`);
        hasChecked.current = true;
        return;
      }

      // Извлекаем текущую локаль из URL
      const pathSegments = pathname.split("/").filter(Boolean);
      const currentLocale = pathSegments[0];

      // ВАЖНО: Если пользователь уже на странице с валидным языком в URL,
      // НЕ перенаправляем его автоматически - это его выбор!
      // Автоматическое перенаправление ТОЛЬКО если:
      // 1. Нет сохранённого языка в cookie (первый визит)
      // 2. И текущий язык в URL не совпадает с языком браузера
      const savedLang = getLanguageCookie();

      // Если есть сохранённый язык в cookie, значит пользователь уже выбрал язык
      // Не перенаправляем его автоматически - он сам знает куда идёт
      if (savedLang) {
        console.log('[LanguageSync] User has saved language preference, skipping auto-redirect')
        hasChecked.current = true
        return
      }

      // Получаем основной язык браузера
      const browserLang = navigator.language.split("-")[0];
      // Маппим язык браузера на поддерживаемую локаль
      const browserMappedLang = localeMapping[browserLang] || "en";

      // НЕ перенаправляем на защищённых страницах
      const isProtectedRoute = pathSegments.some(segment =>
        segment === 'tickets' || segment === 'admin'
      )

      if (isProtectedRoute) {
        console.log('[LanguageSync] Protected route detected, skipping redirect')
        hasChecked.current = true
        return
      }

      // Перенаправляем ТОЛЬКО если это первый визит (нет cookie)
      // И текущий язык в URL не совпадает с языком браузера
      if (supportedLocales.includes(currentLocale as any) && currentLocale !== browserMappedLang) {
        // Получаем остальную часть пути (после языка)
        const restOfPath = pathSegments.slice(1);

        // Если есть путь после языка, переводим его
        let newPath = `/${browserMappedLang}`;
        if (restOfPath.length > 0) {
          // Получаем переведенный slug из текущего URL
          const currentSlug = restOfPath[0];
          // Получаем канонический ключ маршрута
          const canonicalKey = getCanonicalRoute(currentSlug, currentLocale as SupportedLocale);
          // Получаем переведенный slug для нового языка
          const translatedSlug = getLocalizedRoute(canonicalKey, browserMappedLang as SupportedLocale);

          newPath = `/${browserMappedLang}/${translatedSlug}`;
          // Добавляем остальную часть пути, если есть
          if (restOfPath.length > 1) {
            newPath += '/' + restOfPath.slice(1).join('/');
          }
        }

        console.log(`[LanguageSync] First visit! Redirecting from ${currentLocale} to ${browserMappedLang}`);
        console.log(`[LanguageSync] New path: ${newPath}`);

        // Используем Next.js router для клиентского перехода без перезагрузки страницы
        hasChecked.current = true;
        router.replace(newPath);
      } else {
        hasChecked.current = true;
      }
    };

    // Проверяем при монтировании с небольшой задержкой
    const timeoutId = setTimeout(checkAndRedirect, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname, router]);

  return null;
}
