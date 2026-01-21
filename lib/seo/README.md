# SEO и OpenGraph настройки для QuailBreeder

## Что добавлено

### 1. OpenGraph Meta Tags

OpenGraph теги настроены в [app/layout.tsx](../../app/layout.tsx) и обеспечивают правильное отображение при шеринге в социальных сетях.

**Включает:**

- `og:type` - тип контента (website)
- `og:locale` - язык (en_US)
- `og:url` - URL сайта
- `og:site_name` - название сайта
- `og:title` - заголовок
- `og:description` - описание
- `og:image` - превью изображение (1200x630)

### 2. Twitter Card

Специальные теги для Twitter:

- `twitter:card` - тип карточки (summary_large_image)
- `twitter:title` - заголовок
- `twitter:description` - описание
- `twitter:image` - изображение

### 3. Дополнительные SEO теги

- **Keywords** - ключевые слова для поисковиков
- **Authors** - авторы сайта
- **Robots** - инструкции для поисковых роботов
- **Verification** - коды верификации для Google/Yandex

### 4. JSON-LD Structured Data

Структурированные данные для поисковиков в формате JSON-LD:

- **Organization** - информация об организации
- **SoftwareApplication** - описание приложения

## Как использовать

### Базовые метаданные (весь сайт)

Настроены в [app/layout.tsx](../../app/layout.tsx) и применяются ко всем страницам.

### Метаданные для конкретной страницы

Создайте файл `page.tsx` с export metadata:

```typescript
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'QuailBreeder privacy policy and data protection information',
  openGraph: {
    title: 'Privacy Policy - QuailBreeder',
    description: 'QuailBreeder privacy policy and data protection information',
    url: 'https://quailbreeder.com/privacy-policy',
  },
}

export default function PrivacyPolicy() {
  return <div>Privacy Policy Content</div>
}
```

### Использование хелперов

Используйте функцию `createPageMetadata` из [lib/seo/metadata.ts](./metadata.ts):

```typescript
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata(
  'Contact Us',
  'Get in touch with QuailBreeder team',
  '/contact',
  '/contact-image.webp' // опционально
)
```

## Тестирование OpenGraph

### Инструменты для проверки:

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
4. **OpenGraph.xyz**: https://www.opengraph.xyz/

### Локальное тестирование

Для тестирования OpenGraph локально нужен публичный URL. Используйте:

- **ngrok**: `npx ngrok http 3000`
- **localtunnel**: `npx localtunnel --port 3000`

## Проверка JSON-LD

Используйте Google Rich Results Test:
https://search.google.com/test/rich-results

## Оптимизация изображения для OpenGraph

Рекомендуемые размеры:

- **Facebook/LinkedIn**: 1200x630px
- **Twitter Summary Large**: 1200x600px
- **Минимум**: 1200x630px

Формат: JPEG, PNG, или WebP
Размер файла: < 5MB

## Environment Variables

Добавьте в `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://quailbreeder.com
```

Для production добавьте в `.env.production`.

## Примеры использования

### Динамические метаданные

Для страниц с параметрами:

```typescript
import { Metadata } from 'next'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const batch = await fetchBatch(params.id)

  return {
    title: `Batch ${batch.id} - QuailBreeder`,
    description: `View details for batch ${batch.id} with ${batch.totalEggs} eggs`,
    openGraph: {
      title: `Batch ${batch.id} - QuailBreeder`,
      description: `View details for batch ${batch.id} with ${batch.totalEggs} eggs`,
      images: ['/batch-preview.webp'],
    },
  }
}
```

## Проверка в production

После деплоя проверьте:

1. Просмотрите исходный код страницы (View Page Source)
2. Найдите `<meta property="og:*">` теги
3. Проверьте наличие JSON-LD скриптов
4. Протестируйте через Facebook Debugger

## Дополнительные настройки

### Добавление Favicon

Уже настроено в layout.tsx:

```typescript
icons: {
  icon: '/web-app-manifest-192x192.png',
}
```

### Robots.txt

Создайте файл `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://quailbreeder.com/sitemap.xml
```

### Sitemap

Уже создан в [app/sitemap.ts](../../app/sitemap.ts)
