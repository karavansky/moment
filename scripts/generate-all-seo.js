#!/usr/bin/env node

/**
 * Комплексный скрипт для генерации всех SEO-файлов
 *
 * Генерирует:
 * - routes (config/routes.generated.ts)
 * - rewrites (config/rewrites.generated.js)
 * - robots.txt (public/robots.txt)
 */

const { execSync } = require('child_process');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                                                               ║');
console.log('║          🚀 ГЕНЕРАЦИЯ ВСЕХ SEO-ФАЙЛОВ 🚀                      ║');
console.log('║                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

const scripts = [
  { name: 'Маршруты и rewrites', command: 'node scripts/generate-routes.js' },
  { name: 'robots.txt', command: 'node scripts/generate-robots.js' },
];

let hasErrors = false;

scripts.forEach((script, index) => {
  console.log(`${index + 1}️⃣  Генерация: ${script.name}`);
  console.log('─────────────────────────────────────────────────────────────────');

  try {
    const output = execSync(script.command, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    // Выводим результат
    console.log(output);
  } catch (error) {
    console.error(`❌ Ошибка при генерации ${script.name}:`);
    console.error(error.stdout || error.message);
    hasErrors = true;
  }
});

console.log('╔═══════════════════════════════════════════════════════════════╗');

if (hasErrors) {
  console.log('║                                                               ║');
  console.log('║          ❌ ГЕНЕРАЦИЯ ЗАВЕРШЕНА С ОШИБКАМИ ❌                 ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  process.exit(1);
} else {
  console.log('║                                                               ║');
  console.log('║          ✅ ВСЕ SEO-ФАЙЛЫ УСПЕШНО СГЕНЕРИРОВАНЫ! ✅          ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📝 Сгенерированные файлы:');
  console.log('   • config/routes.generated.ts');
  console.log('   • config/rewrites.generated.js');
  console.log('   • public/robots.txt');
  console.log('');
  console.log('🌐 При следующем запуске также обновится:');
  console.log('   • /sitemap.xml (автоматически при build/dev)');
}
