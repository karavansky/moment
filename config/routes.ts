// Конфигурация переведенных маршрутов
//
// ⚠️ ВАЖНО: Маршруты автоматически генерируются из словарей!
// Для обновления выполните: npm run generate:routes
//
// Этот файл просто реэкспортирует сгенерированные маршруты для обратной совместимости

export {
  routeMapping,
  reverseRouteMapping,
  getLocalizedRoute,
  getCanonicalRoute,
  getAlternateUrls,
} from './routes.generated'
