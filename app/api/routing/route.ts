import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import crypto from 'crypto'

/**
 * API роут для построения маршрутов через OSRM с Redis кэшированием
 *
 * Примеры использования:
 * GET /api/routing?coordinates=6.9603,50.9375;6.9451,50.9288
 * GET /api/routing?start=6.9603,50.9375&end=6.9451,50.9288
 */

// TTL для кэша маршрутов (7 дней в секундах)
const CACHE_TTL = 7 * 24 * 60 * 60

/**
 * Создать ключ кэша из координат
 */
function createCacheKey(coordinates: string): string {
  // Нормализуем координаты (округляем до 4 знаков после запятой для кэширования)
  const normalized = coordinates
    .split(';')
    .map(coord => {
      const [lng, lat] = coord.split(',').map(Number)
      return `${lng.toFixed(4)},${lat.toFixed(4)}`
    })
    .join(';')

  // Хэшируем для компактности
  const hash = crypto.createHash('md5').update(normalized).digest('hex')
  return `osrm:route:${hash}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Поддерживаем два формата: coordinates или start/end
  let coordinates = searchParams.get('coordinates')

  if (!coordinates) {
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Требуются параметры: coordinates или start + end' },
        { status: 400 }
      )
    }

    coordinates = `${start};${end}`
  }

  const cacheKey = createCacheKey(coordinates)

  try {
    // Пытаемся получить из кэша
    const redis = getRedis()
    let cachedData: string | null = null

    try {
      cachedData = await redis.get(cacheKey)
    } catch (redisError) {
      console.warn('⚠️  Redis unavailable, skipping cache:', redisError)
    }

    if (cachedData) {
      console.log('✅ Cache hit for:', coordinates)
      const data = JSON.parse(cachedData)
      return NextResponse.json({
        ...data,
        _cached: true,
        _cacheKey: cacheKey
      })
    }

    console.log('❌ Cache miss for:', coordinates)

    // OSRM URL - используйте localhost:5000 для локального OSRM
    const osrmUrl = process.env.OSRM_URL || 'http://localhost:5000'
    const url = `${osrmUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`

    console.log('🗺️  OSRM request:', url)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Moment Transport System'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`OSRM responded with status: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 'Ok') {
      throw new Error(`OSRM error: ${data.code}`)
    }

    console.log('✅ OSRM response:', {
      routes: data.routes?.length || 0,
      distance: data.routes?.[0]?.distance,
      duration: data.routes?.[0]?.duration
    })

    // Сохраняем в кэш (не блокируем ответ)
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data))
      console.log('💾 Cached route:', cacheKey)
    } catch (cacheError) {
      console.warn('⚠️  Failed to cache route:', cacheError)
    }

    return NextResponse.json({
      ...data,
      _cached: false,
      _cacheKey: cacheKey
    })

  } catch (error) {
    console.error('❌ OSRM routing error:', error)

    // Если OSRM недоступен, возвращаем fallback на публичный сервер
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Routing service timeout', fallback: 'use public OSRM' },
        { status: 503 }
      )
    }

    // Пробуем публичный OSRM как fallback
    try {
      const fallbackUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
      console.log('🔄 Trying fallback OSRM:', fallbackUrl)

      const fallbackResponse = await fetch(fallbackUrl)
      const fallbackData = await fallbackResponse.json()

      // Кэшируем результат от публичного OSRM
      try {
        const redis = getRedis()
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(fallbackData))
        console.log('💾 Cached fallback route:', cacheKey)
      } catch (cacheError) {
        console.warn('⚠️  Failed to cache fallback route:', cacheError)
      }

      return NextResponse.json({
        ...fallbackData,
        _fallback: true,
        _cached: false,
        _cacheKey: cacheKey,
        _message: 'Using public OSRM server'
      })
    } catch (fallbackError) {
      console.error('❌ Fallback OSRM also failed:', fallbackError)

      return NextResponse.json(
        {
          error: 'Routing service unavailable',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      )
    }
  }
}
