'use client'

import { useEffect, useRef } from 'react'
import { addToast } from '@heroui/toast'

/**
 * Глобальный хук для проверки версии приложения при выходе из спящего режима.
 * Сравнивает вшитую при сборке константу с версией на сервере (/api/version).
 */
export function useAppVersion() {
  const currentVersion = process.env.APP_VERSION || '0.1.0'
  const isChecking = useRef(false)

  useEffect(() => {
    const checkVersion = async () => {
      if (document.visibilityState !== 'visible' || isChecking.current) return

      try {
        isChecking.current = true
        // Добавляем timestamp для обхода жесткого кэширования iOS Safari
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
        })

        if (!response.ok) return

        const data = await response.json()
        const serverVersion = data.version

        if (serverVersion && serverVersion !== currentVersion) {
          console.warn(
            `[PWA Update] Local version ${currentVersion} is outdated. Server is on ${serverVersion}.`
          )

          addToast({
            title: '🎉 Доступно обновление',
            description:
              'Вышла новая версия приложения. Пожалуйста, обновите страницу для стабильной работы.',
            color: 'primary',
            radius: 'md',
            // В HeroUI Toast нет явного API для custom buttons,
            // но мы можем использовать это как информационное уведомление
            // с автоматическим обновлением при закрытии, либо просто
            // сделать жесткий релоад при фокусе, если версия сильно устарела.
            // Для мягкого старта просто просим обновить или делаем это за юзера:
            timeout: 10000,
            onClose: () => {
              window.location.reload()
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
