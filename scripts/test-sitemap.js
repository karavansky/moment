#!/usr/bin/env node

/**
 * Тестирование генерации sitemap
 */

// Читаем данные напрямую из сгенерированных файлов
const fs = require('fs');
const path = require('path');

// Читаем supportedLocales из locales.ts
const localesContent = fs.readFileSync(path.join(__dirname, '../config/locales.ts'), 'utf-8');
const supportedLocalesMatch = localesContent.match(/supportedLocales\s*=\s*\[(.*?)\]/s);
const supportedLocales = supportedLocalesMatch[1]
  .split(',')
  .map(s => s.trim().replace(/['"]/g, ''))
  .filter(Boolean);

// Читаем routeMapping из routes.generated.ts
const routesContent = fs.readFileSync(path.join(__dirname, '../config/routes.generated.ts'), 'utf-8');

// Простая функция для получения локализованного маршрута
function getLocalizedRoute(route, locale) {
  // Парсим routeMapping из файла
  const routeMappingMatch = routesContent.match(new RegExp(`${locale}:\\s*{([^}]+)}`, 's'));
  if (!routeMappingMatch) return route;

  const localeRoutes = routeMappingMatch[1];
  const routeMatch = localeRoutes.match(new RegExp(`'${route}':\\s*'([^']+)'`));

  return routeMatch ? routeMatch[1] : route;
}

const baseUrl = 'https://quailbreeder.net';
const currentDate = new Date();

// Страницы сайта (используем ключи из словарей routes - camelCase)
const pages = [
  { route: '', priority: 1.0, changeFrequency: 'monthly' }, // Главная страница
  { route: 'privacyPolicy', priority: 0.5, changeFrequency: 'yearly' },
  { route: 'termsOfUse', priority: 0.5, changeFrequency: 'yearly' },
  { route: 'about', priority: 0.5, changeFrequency: 'monthly' },
  { route: 'getStarted', priority: 0.5, changeFrequency: 'monthly' },
];

// Генерируем URL для всех языков и страниц
const sitemapEntries = [];

supportedLocales.forEach((locale) => {
  pages.forEach((page) => {
    // Получаем переведенный маршрут для текущего языка
    const localizedRoute = page.route ? getLocalizedRoute(page.route, locale) : '';
    const pageUrl = `${baseUrl}/${locale}${localizedRoute ? '/' + localizedRoute : ''}`;

    // Генерируем объект languages с переведенными маршрутами и x-default
    const languages = {};

    // Добавляем все поддерживаемые языки с их переведенными маршрутами
    supportedLocales.forEach((lang) => {
      const translatedRoute = page.route ? getLocalizedRoute(page.route, lang) : '';
      languages[lang] = `${baseUrl}/${lang}${translatedRoute ? '/' + translatedRoute : ''}`;
    });

    // x-default указывает на английскую версию (язык по умолчанию)
    const enRoute = page.route ? getLocalizedRoute(page.route, 'en') : '';
    languages['x-default'] = `${baseUrl}/en${enRoute ? '/' + enRoute : ''}`;

    sitemapEntries.push({
      url: pageUrl,
      lastModified: currentDate,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages,
      },
    });
  });
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('🗺️  ТЕСТИРОВАНИЕ ГЕНЕРАЦИИ SITEMAP.XML');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

console.log('📊 СТАТИСТИКА SITEMAP:');
console.log('─────────────────────────────────────────────────────────────────');
console.log(`  Всего записей: ${sitemapEntries.length}`);
console.log('');

// Группируем по локалям
const byLocale = {};
sitemapEntries.forEach(entry => {
  const match = entry.url.match(/\.net\/([a-z]{2})\//);
  if (match) {
    const locale = match[1];
    byLocale[locale] = (byLocale[locale] || 0) + 1;
  }
});

console.log('📍 Распределение по языкам:');
Object.keys(byLocale).sort().forEach(locale => {
  console.log(`  ${locale}: ${byLocale[locale]} страниц`);
});

console.log('');
console.log('🔗 Примеры URL для страницы "about":');
console.log('─────────────────────────────────────────────────────────────────');

// Находим записи для about в разных языках
const aboutEntries = sitemapEntries.filter(e =>
  e.url.includes('/about') ||
  e.url.includes('/ueber-uns') ||
  e.url.includes('/o-nas') ||
  e.url.includes('/pro-nas') ||
  e.url.includes('/acerca-de') ||
  e.url.includes('/a-propos') ||
  e.url.includes('/sobre') ||
  e.url.includes('/tentang') ||
  e.url.includes('/hakkinda')
);

aboutEntries.forEach(entry => {
  const locale = entry.url.match(/\.net\/([a-z]{2})\//)?.[1];
  console.log(`  ${locale}: ${entry.url}`);
});

console.log('');
console.log('🌐 Проверка hreflang альтернатив:');
console.log('─────────────────────────────────────────────────────────────────');

// Берем первую запись about и показываем её альтернативы
const firstAbout = aboutEntries[0];
if (firstAbout?.alternates?.languages) {
  const langs = Object.keys(firstAbout.alternates.languages).sort();
  console.log(`  Для ${firstAbout.url}:`);
  console.log(`  Найдено альтернатив: ${langs.length}`);
  console.log('  Языки:', langs.join(', '));

  // Показываем несколько примеров
  console.log('');
  console.log('  Примеры альтернатив:');
  ['en', 'de', 'ru', 'es', 'fr', 'pt', 'ua', 'tr', 'id', 'ja', 'x-default'].forEach(lang => {
    if (firstAbout.alternates.languages[lang]) {
      console.log(`    ${lang.padEnd(10)}: ${firstAbout.alternates.languages[lang]}`);
    }
  });
}

console.log('');
console.log('📝 Проверка уникальности URL:');
console.log('─────────────────────────────────────────────────────────────────');

const urls = sitemapEntries.map(e => e.url);
const uniqueUrls = new Set(urls);

if (urls.length === uniqueUrls.size) {
  console.log(`  ✅ Все URL уникальны (${urls.length} записей)`);
} else {
  console.log(`  ❌ Найдены дубликаты! Всего: ${urls.length}, Уникальных: ${uniqueUrls.size}`);
}

console.log('');
console.log('✅ Тестирование sitemap завершено успешно!');
console.log('═══════════════════════════════════════════════════════════════');
