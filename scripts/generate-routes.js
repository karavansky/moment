#!/usr/bin/env node

/**
 * Скрипт для автоматической генерации конфигурации маршрутов из словарей
 *
 * Читает все JSON-словари из config/dictionaries/ и извлекает секцию "routes",
 * затем генерирует:
 * 1. config/routes.generated.ts - маппинги маршрутов для использования в коде
 * 2. config/rewrites.generated.js - rewrites для next.config.js
 */

const fs = require('fs');
const path = require('path');

// Пути
const DICTIONARIES_DIR = path.join(__dirname, '../config/dictionaries');
const ROUTES_OUTPUT = path.join(__dirname, '../config/routes.generated.ts');
const REWRITES_OUTPUT = path.join(__dirname, '../config/rewrites.generated.js');

// Получаем список всех поддерживаемых локалей из locales.ts
const localesContent = fs.readFileSync(path.join(__dirname, '../config/locales.ts'), 'utf-8');
const supportedLocalesMatch = localesContent.match(/supportedLocales\s*=\s*\[(.*?)\]/s);
if (!supportedLocalesMatch) {
  console.error('❌ Не удалось найти supportedLocales в config/locales.ts');
  process.exit(1);
}

const supportedLocales = supportedLocalesMatch[1]
  .split(',')
  .map(s => s.trim().replace(/['"]/g, ''))
  .filter(Boolean);

console.log('📋 Поддерживаемые локали:', supportedLocales);

// Читаем routes из всех словарей
const routesData = {};
const allRouteKeys = new Set();

supportedLocales.forEach(locale => {
  const dictPath = path.join(DICTIONARIES_DIR, `${locale}.json`);

  if (!fs.existsSync(dictPath)) {
    console.warn(`⚠️  Словарь для ${locale} не найден: ${dictPath}`);
    return;
  }

  try {
    const dict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));

    if (dict.routes) {
      routesData[locale] = dict.routes;
      Object.keys(dict.routes).forEach(key => allRouteKeys.add(key));
      console.log(`✅ Загружены routes для ${locale}:`, Object.keys(dict.routes).length, 'маршрутов');
    } else {
      console.warn(`⚠️  В словаре ${locale} нет секции "routes"`);
    }
  } catch (error) {
    console.error(`❌ Ошибка при чтении ${dictPath}:`, error.message);
  }
});

if (Object.keys(routesData).length === 0) {
  console.error('❌ Не найдено ни одного маршрута ни в одном словаре!');
  process.exit(1);
}

console.log('\n📝 Найдено уникальных ключей маршрутов:', allRouteKeys.size);
console.log('   Ключи:', Array.from(allRouteKeys).join(', '));

// Генерируем routes.generated.ts
function generateRoutesTS() {
  const lines = [];

  lines.push('// 🤖 Этот файл сгенерирован автоматически. НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ!');
  lines.push('// Для обновления запустите: npm run generate:routes');
  lines.push('//');
  lines.push('// Маршруты берутся из секции "routes" в каждом словаре (config/dictionaries/*.json)');
  lines.push('');
  lines.push('import { SupportedLocale } from \'./locales\'');
  lines.push('');

  // routeMapping
  lines.push('// Маппинг маршрутов для каждого языка');
  lines.push('export const routeMapping: Record<SupportedLocale, Record<string, string>> = {');

  supportedLocales.forEach(locale => {
    lines.push(`  ${locale}: {`);
    if (routesData[locale]) {
      Object.entries(routesData[locale]).forEach(([key, value]) => {
        lines.push(`    '${key}': '${value}',`);
      });
    }
    lines.push('  },');
  });

  lines.push('}');
  lines.push('');

  // reverseRouteMapping
  lines.push('// Обратный маппинг: переведенный slug -> оригинальный slug');
  lines.push('export const reverseRouteMapping: Record<SupportedLocale, Record<string, string>> = {');

  supportedLocales.forEach(locale => {
    lines.push(`  ${locale}: {`);
    if (routesData[locale]) {
      Object.entries(routesData[locale]).forEach(([key, value]) => {
        lines.push(`    '${value}': '${key}',`);
      });
    }
    lines.push('  },');
  });

  lines.push('}');
  lines.push('');

  // Helper functions
  lines.push('// Получить переведенный маршрут');
  lines.push('export function getLocalizedRoute(route: string, locale: SupportedLocale): string {');
  lines.push('  return routeMapping[locale]?.[route] || route');
  lines.push('}');
  lines.push('');

  lines.push('// Получить оригинальный маршрут из переведенного');
  lines.push('export function getCanonicalRoute(localizedRoute: string, locale: SupportedLocale): string {');
  lines.push('  return reverseRouteMapping[locale]?.[localizedRoute] || localizedRoute');
  lines.push('}');
  lines.push('');

  lines.push('// Генерация всех переведенных URL для страницы (для hreflang)');
  lines.push('export function getAlternateUrls(route: string, baseUrl: string): Record<string, string> {');
  lines.push('  const alternates: Record<string, string> = {}');
  lines.push('');
  lines.push('  const locales: SupportedLocale[] = ' + JSON.stringify(supportedLocales));
  lines.push('  locales.forEach(locale => {');
  lines.push('    const localizedRoute = getLocalizedRoute(route, locale)');
  lines.push('    alternates[locale] = `${baseUrl}/${locale}/${localizedRoute}`');
  lines.push('  })');
  lines.push('');
  lines.push('  alternates[\'x-default\'] = `${baseUrl}/en/${routeMapping.en[route] || route}`');
  lines.push('');
  lines.push('  return alternates');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// Генерируем rewrites.generated.js
function generateRewritesJS() {
  const lines = [];

  lines.push('// 🤖 Этот файл сгенерирован автоматически. НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ!');
  lines.push('// Для обновления запустите: npm run generate:routes');
  lines.push('//');
  lines.push('// Rewrites для Next.js, чтобы переведенные URL работали правильно');
  lines.push('');
  lines.push('module.exports = function getGeneratedRewrites() {');
  lines.push('  return [');

  // Используем английский как reference для физических папок
  const enRoutes = routesData['en'] || {};

  // Генерируем rewrites для всех локалей кроме английского
  supportedLocales.forEach(locale => {
    if (locale === 'en') return; // Английский не нуждается в rewrite

    if (routesData[locale]) {
      lines.push(`    // ${locale.toUpperCase()} маршруты`);
      Object.entries(routesData[locale]).forEach(([key, localizedSlug]) => {
        // Берем английский slug как destination (это физическая папка)
        const enSlug = enRoutes[key];
        if (enSlug && localizedSlug !== enSlug) {
          lines.push('    {');
          lines.push(`      source: '/${locale}/${localizedSlug}',`);
          lines.push(`      destination: '/${locale}/${enSlug}',`);
          lines.push('    },');
        }
      });
    }
  });

  lines.push('  ]');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// Записываем файлы
try {
  const routesContent = generateRoutesTS();
  fs.writeFileSync(ROUTES_OUTPUT, routesContent, 'utf-8');
  console.log(`\n✅ Сгенерирован: ${ROUTES_OUTPUT}`);

  const rewritesContent = generateRewritesJS();
  fs.writeFileSync(REWRITES_OUTPUT, rewritesContent, 'utf-8');
  console.log(`✅ Сгенерирован: ${REWRITES_OUTPUT}`);

  console.log('\n🎉 Готово! Теперь импортируйте эти файлы в:');
  console.log('   - config/routes.ts (вместо ручного маппинга)');
  console.log('   - next.config.js (в rewrites() функции)');
} catch (error) {
  console.error('❌ Ошибка при записи файлов:', error.message);
  process.exit(1);
}
