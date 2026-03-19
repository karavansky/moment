'use client'

import { useEffect, useRef } from 'react'
import { toast } from '@heroui/react'

/**
 * Глобальный хук для проверки версии приложения при выходе из спящего режима.
 * Сравнивает вшитую при сборке константу с версией на сервере (/api/version).
 */
export function useAppVersion() {
  const currentVersion = process.env.APP_VERSION || '0.1.0'
  const isChecking = useRef(false)
  const hasShownToast = useRef(false) // Track if we've already shown the update toast

  useEffect(() => {
    const checkVersion = async () => {
      if (document.visibilityState !== 'visible' || isChecking.current) return

      try {
        isChecking.current = true

        // Check if we just reloaded to update
        const justReloaded = sessionStorage.getItem('app-just-reloaded')
        if (justReloaded) {
          console.log('[PWA Update] Just reloaded, skipping version check temporarily')
          sessionStorage.removeItem('app-just-reloaded')
          return
        }

        // Добавляем timestamp для обхода жесткого кэширования iOS Safari
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
        })

        if (!response.ok) return

        const data = await response.json()
        const serverVersion = data.version

        console.log('[PWA Update] Version check:', {
          currentVersion,
          serverVersion,
          needsUpdate: serverVersion !== currentVersion,
        })

        if (serverVersion && serverVersion !== currentVersion) {
          console.warn(
            `[PWA Update] Local version ${currentVersion} is outdated. Server is on ${serverVersion}.`
          )

          // Only show toast once per session
          if (hasShownToast.current) {
            console.log('[PWA Update] Toast already shown this session, skipping')
            return
          }

          hasShownToast.current = true

          toast.info('🎉 Доступно обновление', {
            description:
              'Вышла новая версия приложения. Пожалуйста, обновите страницу для стабильной работы.',
            timeout: 0, // Don't auto-dismiss - user must click the button
            actionProps: {
              children: 'Обновить',
              onPress: async () => {
                console.log('[PWA Update] User clicked reload, clearing caches...')

                // Set flag to skip version check after reload
                sessionStorage.setItem('app-just-reloaded', 'true')

                // Clear all caches to ensure fresh content
                if ('caches' in window) {
                  try {
                    const cacheNames = await caches.keys()
                    await Promise.all(
                      cacheNames.map(cacheName => {
                        console.log(`[PWA Update] Deleting cache: ${cacheName}`)
                        return caches.delete(cacheName)
                      })
                    )
                    console.log('[PWA Update] All caches cleared')
                  } catch (err) {
                    console.error('[PWA Update] Error clearing caches:', err)
                  }
                }

                // Unregister service workers to ensure fresh registration
                if ('serviceWorker' in navigator) {
                  try {
                    const registrations = await navigator.serviceWorker.getRegistrations()
                    await Promise.all(
                      registrations.map(registration => {
                        console.log('[PWA Update] Unregistering service worker')
                        return registration.unregister()
                      })
                    )
                    console.log('[PWA Update] All service workers unregistered')
                  } catch (err) {
                    console.error('[PWA Update] Error unregistering service workers:', err)
                  }
                }

                // Force hard reload
                console.log('[PWA Update] Performing hard reload...')
                window.location.href = window.location.href
              },
              variant: 'primary' as const,
            },
          })

          // Если мы хотим действовать агрессивно для застывших клиентов:
          // window.location.reload(true)
        }
      } catch (err) {
        console.error('[PWA Update] Error checking version:', err)
      } finally {
        isChecking.current = false
      }
    }

    // Проверяем при фокусе окна/вкладки
    document.addEventListener('visibilitychange', checkVersion)
    window.addEventListener('focus', checkVersion)

    // Первичная проверка при первой загрузке (на случай, если PWA стартует из старого кэша)
    checkVersion()

    return () => {
      document.removeEventListener('visibilitychange', checkVersion)
      window.removeEventListener('focus', checkVersion)
    }
  }, [currentVersion])
}
