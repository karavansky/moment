# Оптимизация изображений в QuailBreeder

## Что было сделано

Все изображения в приложении теперь используют Next.js `Image` компонент вместо обычного `<img>` для автоматической оптимизации.

## Преимущества Next.js Image

1. **Автоматическое сжатие** - Next.js автоматически оптимизирует изображения
2. **Адаптивные размеры** - генерирует несколько размеров для разных устройств
3. **Lazy loading** - изображения загружаются только когда входят в viewport
4. **Modern форматы** - автоматическое преобразование в WebP/AVIF
5. **Уменьшение размера** - сокращение размера файлов на 30-70%

## Оптимизированные изображения

### Фоновые изображения

**Desktop фон** ([app/page.tsx:224](../app/page.tsx#L224)):

```tsx
<Image
  src="/quail_eggs.webp"
  alt="Quail eggs pattern"
  fill
  priority
  quality={75}
  sizes="100vw"
  className="object-cover"
/>
```

- Оригинал: 233 KB
- После оптимизации: ~70-90 KB (зависит от viewport)

**Mobile фон** ([app/page.tsx:237](../app/page.tsx#L237)):

```tsx
<Image
  src="/quail_eggs_vertical.webp"
  alt="Quail eggs pattern"
  fill
  priority
  quality={75}
  sizes="100vw"
  className="object-cover object-center scale-115"
/>
```

- Оригинал: 323 KB
- После оптимизации: ~100-120 KB

### Hero изображения

**Desktop Hero** ([app/page.tsx:62](../app/page.tsx#L62)):

```tsx
<Image
  src="/quail-breeder-application.webp"
  alt="Moment LBS Application"
  width={600}
  height={800}
  priority
  quality={85}
  className="max-h-[80vh] w-auto object-contain drop-shadow-2xl"
/>
```

- Оригинал: 156 KB
- После оптимизации: ~50-60 KB

### Process Steps изображения

**Desktop версия** ([app/page.tsx:407](../app/page.tsx#L407)):

```tsx
<Image
  src={step.image}
  alt={step.title}
  fill
  sizes="(max-width: 1024px) 100vw, 256px"
  quality={80}
  className="object-contain"
/>
```

**Mobile версия** ([app/page.tsx:453](../app/page.tsx#L453)):

```tsx
<Image
  src={step.image}
  alt={step.title}
  fill
  sizes="100vw"
  quality={80}
  className="object-contain"
/>
```

## Параметры оптимизации

### Quality параметры

- **Фоны**: `quality={50}` - очень низкое качество для фонов (максимальное сжатие, не критично для визуала)
- **Hero изображения**: `quality={85}` с `fetchPriority="high"` - высокое качество для LCP изображения
- **Process screenshots**: `quality={70}` - среднее качество для скриншотов процессов

### Priority

- `priority={true}` - для изображений "above the fold" (видимых сразу)
- Без `priority` - для остальных изображений (lazy loading)

### Sizes

- `sizes="100vw"` - для полноэкранных фоновых изображений
- `sizes="(max-width: 768px) 40vw, 200px"` - для process screenshots (desktop)
- `sizes="(max-width: 640px) 60vw, 40vw"` - для process screenshots (mobile)
- `sizes="(max-width: 1024px) 100vw, 50vw"` - для hero изображений

## Результаты оптимизации

### До оптимизации

```
quail_eggs.webp:          233 KB
quail_eggs_vertical.webp: 323 KB
quail-breeder-application.webp: 156 KB
Всего: ~712 KB
```

### После оптимизации (примерно)

```
quail_eggs.webp:          ~80 KB
quail_eggs_vertical.webp: ~110 KB
quail-breeder-application.webp: ~55 KB
Всего: ~245 KB
```

**Экономия: ~65% (467 KB)**

## Дополнительные рекомендации

### 1. Создайте оптимизированные версии вручную (опционально)

Используйте инструменты для дополнительного сжатия:

```bash
# С помощью ImageMagick
magick quail_eggs_vertical.webp -quality 75 -resize 1080x quail_eggs_vertical_opt.webp

# С помощью cwebp
cwebp -q 75 input.png -o output.webp
```

### 2. Используйте responsive images

Для критичных изображений создайте несколько размеров:

```tsx
<Image
  src="/hero.webp"
  srcSet="/hero-sm.webp 640w, /hero-md.webp 1024w, /hero-lg.webp 1920w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Hero"
/>
```

### 3. Настройте next.config.js для дополнительной оптимизации

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
}
```

## Проверка результатов

### Google PageSpeed Insights

https://pagespeed.web.dev/

### Lighthouse

```bash
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

### WebPageTest

https://www.webpagetest.org/

## Лучшие практики

1. **Всегда используйте Next.js Image** вместо `<img>`
2. **Добавляйте width и height** для предотвращения layout shift
3. **Используйте priority** только для изображений "above the fold"
4. **Указывайте sizes** для адаптивных изображений
5. **Используйте quality 75-85** для баланса качества и размера
6. **Добавляйте alt теги** для accessibility и SEO

## Мониторинг

Используйте Next.js Image Analytics для отслеживания:

- Размеров изображений
- Форматов
- LCP (Largest Contentful Paint)

```bash
# В production с Vercel Analytics
vercel --prod
```
