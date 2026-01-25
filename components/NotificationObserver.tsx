'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { toast } from '@heroui/react'

export const NotificationObserver = () => {
  const { notifications, markNotificationAsRead } = useNotifications()

  // Ref to track processed notification IDs to prevent duplicate toasts
  const processedIds = useRef<Set<string>>(new Set())

  // Ref to track active timeouts and their associated notification IDs
  // Map<TimeoutId, NotificationId>
  const activeTimeouts = useRef<Map<NodeJS.Timeout, string>>(new Map())

  useEffect(() => {
    // Находим непрочитанные и необработанные уведомления
    const unprocessedNotifications = notifications.filter(
      notif => !notif.isRead && !processedIds.current.has(notif.id)
    )

    // Если нет новых уведомлений, ничего не делаем
    if (unprocessedNotifications.length === 0) {
      return
    }

    // Обрабатываем максимум 3 уведомления за раз
    const batch = unprocessedNotifications.slice(0, 3)

    batch.forEach((notif, index) => {
      // Add to processed set immediately to prevent duplicate scheduling
      processedIds.current.add(notif.id)

      // Используем setTimeout с задержкой 100ms + index * 300ms
      // Это даёт браузеру время обработать scroll события
      const timeoutId = setTimeout(
        () => {
          // Используем queueMicrotask для дополнительной асинхронности
          queueMicrotask(() => {
            const title = notif.title || 'Notification'
            const description = notif.message
            const options = {
              description,
              timeout: 5000,
              actionProps: {
                children: 'Dismiss',
                onPress: () => {
                  markNotificationAsRead(notif.id)
                  toast.clear()
                },
                variant: 'tertiary' as const,
              },
            }

            switch (notif.type) {
              case 'success':
                toast.success(title, options)
                break
              case 'warning':
                toast.warning(title, options)
                break
              case 'error':
                toast.danger(title, options)
                break
              case 'info':
              default:
                toast(title, options)
                break
            }

            // Удаляем из активных таймеров, так как он выполнился
            activeTimeouts.current.delete(timeoutId)
          })

          // Mark as read in the global state
          // markNotificationAsRead(notif.id)
        },
        100 + index * 300
      ) // Задержка 100ms для первого, затем +300ms для каждого следующего

      // Сохраняем timeout id и связанный с ним ID уведомления
      activeTimeouts.current.set(timeoutId, notif.id)
    })

    // No cleanup function here intentionally.
    // We don't want to cancel pending toasts just because the 'notifications' array updated
    // (which happens when markNotificationAsRead is called for the first toast in a batch).
  }, [notifications, markNotificationAsRead])

  // Cleanup effect that runs only on unmount
  useEffect(() => {
    return () => {
      // Отменяем все активные таймеры и сбрасываем статус обработки
      activeTimeouts.current.forEach((notifId, timeoutId) => {
        clearTimeout(timeoutId)
        // Remove from processedIds so they can be retried if the component remounts
        processedIds.current.delete(notifId)
      })
      activeTimeouts.current.clear()
    }
  }, [])

  return null
}
