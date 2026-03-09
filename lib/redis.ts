/**
 * Redis клиент для кэширования
 */

import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Получить Redis клиент (singleton)
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err)
    })

    redis.on('connect', () => {
      console.log('✅ Redis connected')
    })

    redis.on('ready', () => {
      console.log('✅ Redis ready')
    })
  }

  return redis
}

/**
 * Закрыть соединение с Redis (для graceful shutdown)
 */
export async function closeRedis() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
