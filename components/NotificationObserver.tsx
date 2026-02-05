'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { toast } from '@heroui/react'
import { useRouter } from 'next/navigation';

export const NotificationObserver = () => {
  const { notifications, markNotificationAsRead, requestCloseDropdown } = useNotifications()
  const router = useRouter();

  // Ref to track processed notification IDs to prevent duplicate toasts
  const processedIds = useRef<Set<string>>(new Set())

  // Ref to track active timeouts and their associated notification IDs
  // Map<TimeoutId, NotificationId>
  const activeTimeouts = useRef<Map<NodeJS.Timeout, string>>(new Map())

  useEffect(() => {
    // 1. Cleanup: Cancel timeouts for notifications that are no longer valid (read or removed)
    // and prune processedIds to prevent memory leaks.
    const currentUnreadIds = new Set(notifications.filter(n => !n.isRead).map(n => n.id))

    // Check active timeouts
    activeTimeouts.current.forEach((notifId, timeoutId) => {
      if (!currentUnreadIds.has(notifId)) {
        clearTimeout(timeoutId)
        activeTimeouts.current.delete(timeoutId)
        processedIds.current.delete(notifId)
      }
    })

    // Prune processedIds for items that are no longer unread and not pending
    // We convert values to a Set for O(1) lookup
    const pendingIds = new Set(activeTimeouts.current.values())
    for (const id of processedIds.current) {
      if (!currentUnreadIds.has(id) && !pendingIds.has(id)) {
        processedIds.current.delete(id)
      }
    }

    // 2. Process new notifications
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
            // Закрываем dropdown перед показом toast
            requestCloseDropdown()

            const title = notif.title || 'Notification'
            const description = notif.message

            // Use actionProps from notification or default Dismiss button
            // toastKey будет присвоен после вызова toast(), но onPress вызовется позже
            let toastKey: string | undefined;

            const actionProps = notif.actionProps
              ? {
                  ...notif.actionProps,
                  onPress: () => {
                    if (toastKey) toast.close(toastKey)
                    if (notif.actionProps?.href) router.push(notif.actionProps.href)
                    markNotificationAsRead(notif.id)
                  },
                }
              : {
                  children: 'Dismiss',
                  onPress: () => {
                    if (toastKey) toast.close(toastKey)
                    markNotificationAsRead(notif.id)
                  },
                  variant: 'tertiary' as const,
                }

            const options = {
              description,
              timeout: 10000,
              actionProps,
            }

            switch (notif.type) {
              case 'success':
                toastKey = toast.success(title, options)
                break
              case 'warning':
                toastKey = toast.warning(title, options)
                break
              case 'error':
                toastKey = toast.danger(title, options)
                break
              case 'info':
              default:
                toastKey = toast(title, options)
                break
            }

            // Удаляем из активных таймеров, так как он выполнился
            activeTimeouts.current.delete(timeoutId)
          })
        },
        100 + index * 300
      ) // Задержка 100ms для первого, затем +300ms для каждого следующего

      // Сохраняем timeout id и связанный с ним ID уведомления
      activeTimeouts.current.set(timeoutId, notif.id)
    })
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
