'use client'

import { usePlatformContext } from '@/contexts/PlatformContext'

// Re-export hook that uses context - теперь платформа определяется один раз в Provider
export function usePlatform() {
  return usePlatformContext()
}
