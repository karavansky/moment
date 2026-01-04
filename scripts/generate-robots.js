#!/usr/bin/env node

/**
 * Скрипт для автоматической генерации robots.txt
 *
 * Читает поддерживаемые локали из config/locales.ts и генерирует
 * robots.txt со всеми языковыми версиями
 */

const fs = require('fs');
const path = require('path');

// Читаем supportedLocales из locales.ts
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

// Генерируем содержимое robots.txt
const lines = [];

lines.push('# Allow all legitimate bots');
lines.push('User-agent: *');
lines.push('Allow: /');
lines.push('');
lines.push('# Allow all language versions');

supportedLocales.forEach(locale => {
  lines.push(`Allow: /${locale}/`);
});

lines.push('');
lines.push('# Disallow common attack paths');
lines.push('Disallow: /api/');
lines.push('Disallow: /wp-admin/');
lines.push('Disallow: /wp-includes/');
lines.push('Disallow: /wp-content/');
lines.push('Disallow: /wordpress/');
lines.push('Disallow: /xmlrpc.php');
lines.push('');
lines.push('# Disallow Next.js internal paths');
lines.push('Disallow: /_next/static/');
lines.push('Disallow: /_next/image');
lines.push('');
lines.push('# Sitemap (includes all language versions)');
lines.push('Sitemap: https://quailbreeder.net/sitemap.xml');
lines.push('');

const robotsContent = lines.join('\n');

// Записываем файл
const outputPath = path.join(__dirname, '../public/robots.txt');

try {
  fs.writeFileSync(outputPath, robotsContent, 'utf-8');
  console.log(`✅ Сгенерирован: ${outputPath}`);
  console.log(`   Добавлено ${supportedLocales.length} языковых версий`);
  console.log('');
  console.log('🎉 Готово!');
} catch (error) {
  console.error('❌ Ошибка при записи файла:', error.message);
  process.exit(1);
}
