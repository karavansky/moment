#!/usr/bin/env node

/**
 * Тестирование SEO метаданных из словарей
 */

const fs = require('fs');
const path = require('path');

// Читаем supportedLocales из locales.ts
const localesContent = fs.readFileSync(path.join(__dirname, '../config/locales.ts'), 'utf-8');
const supportedLocalesMatch = localesContent.match(/supportedLocales\s*=\s*\[(.*?)\]/s);
const supportedLocales = supportedLocalesMatch[1]
  .split(',')
  .map(s => s.trim().replace(/['"]/g, ''))
  .filter(Boolean);

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 ТЕСТИРОВАНИЕ SEO МЕТАДАННЫХ');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Страницы для проверки
const pages = ['home', 'about', 'getStarted', 'privacyPolicy', 'termsOfUse'];

let allPagesValid = true;
let totalChecks = 0;
let passedChecks = 0;

supportedLocales.forEach((locale) => {
  console.log(`\n🌍 Язык: ${locale.toUpperCase()}`);
  console.log('─────────────────────────────────────────────────────────────────');

  // Читаем словарь для текущего языка
  const dictPath = path.join(__dirname, `../config/dictionaries/${locale}.json`);

  if (!fs.existsSync(dictPath)) {
    console.log(`  ❌ Файл словаря не найден: ${dictPath}`);
    allPagesValid = false;
    return;
  }

  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));

  if (!dict.seo) {
    console.log(`  ❌ Отсутствует секция "seo" в словаре`);
    allPagesValid = false;
    return;
  }

  pages.forEach((page) => {
    totalChecks++;

    if (!dict.seo[page]) {
      console.log(`  ❌ ${page}: отсутствует в секции seo`);
      allPagesValid = false;
      return;
    }

    const seoData = dict.seo[page];

    // Проверяем наличие обязательных полей
    const hasTitle = seoData.title && seoData.title.trim().length > 0;
    const hasDescription = seoData.description && seoData.description.trim().length > 0;

    if (!hasTitle || !hasDescription) {
      console.log(`  ❌ ${page}: отсутствуют обязательные поля`);
      if (!hasTitle) console.log(`     - title пустой или отсутствует`);
      if (!hasDescription) console.log(`     - description пустой или отсутствует`);
      allPagesValid = false;
      return;
    }

    // Проверяем длину
    const titleLength = seoData.title.length;
    const descLength = seoData.description.length;

    const titleWarning = titleLength > 60 ? ' ⚠️  (длинный)' : '';
    const descWarning = descLength > 160 ? ' ⚠️  (длинный)' : descLength < 50 ? ' ⚠️  (короткий)' : '';

    console.log(`  ✅ ${page}:`);
    console.log(`     Title (${titleLength} символов)${titleWarning}:`);
    console.log(`       "${seoData.title}"`);
    console.log(`     Description (${descLength} символов)${descWarning}:`);
    console.log(`       "${seoData.description.substring(0, 100)}${descLength > 100 ? '...' : ''}"`);
    console.log('');

    passedChecks++;
  });
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📊 СТАТИСТИКА:');
console.log('─────────────────────────────────────────────────────────────────');
console.log(`  Всего проверок: ${totalChecks}`);
console.log(`  Успешно: ${passedChecks}`);
console.log(`  Ошибок: ${totalChecks - passedChecks}`);
console.log(`  Языков: ${supportedLocales.length}`);
console.log(`  Страниц на язык: ${pages.length}`);

console.log('\n💡 РЕКОМЕНДАЦИИ:');
console.log('─────────────────────────────────────────────────────────────────');
console.log('  • Title: оптимально 50-60 символов');
console.log('  • Description: оптимально 120-160 символов');
console.log('  • Избегайте дублирования title и description');
console.log('  • Используйте ключевые слова в начале');

if (allPagesValid && passedChecks === totalChecks) {
  console.log('\n✅ ВСЕ МЕТАДАННЫЕ КОРРЕКТНЫ!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.log('\n❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ С МЕТАДАННЫМИ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
