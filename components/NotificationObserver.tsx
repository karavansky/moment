'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from '@heroui/react';

export const NotificationObserver = () => {
  const { notifications, markNotificationAsRead } = useNotifications();

  // Ref to track processed notification IDs to prevent duplicate toasts
  const processedIds = useRef<Set<string>>(new Set());

  // Ref для хранения активных setTimeout ids
  const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    // Находим непрочитанные и необработанные уведомления
    const unprocessedNotifications = notifications.filter(
      (notif) => !notif.isRead && !processedIds.current.has(notif.id)
    );

    // Если нет новых уведомлений, ничего не делаем
    if (unprocessedNotifications.length === 0) {
      return;
    }

    // Обрабатываем максимум 3 уведомления за раз
    const batch = unprocessedNotifications.slice(0, 3);

    batch.forEach((notif, index) => {
      // Используем setTimeout с задержкой 100ms + index * 300ms
      // Это даёт браузеру время обработать scroll события
      const timeoutId = setTimeout(() => {
        // Используем queueMicrotask для дополнительной асинхронности
        queueMicrotask(() => {
          const title = notif.title || 'Notification';
          const description = notif.message;
          const options = {
            description,
            timeout: 5000,
          };

          switch (notif.type) {
            case 'success':
              toast.success(title, options);
              break;
            case 'warning':
              toast.warning(title, options);
              break;
            case 'error':
              toast.danger(title, options);
              break;
            case 'info':
            default:
              toast(title, options);
              break;
          }

          // Удаляем из активных таймеров
          timeoutIdsRef.current.delete(timeoutId);
        });

        // Add to processed set
        processedIds.current.add(notif.id);

        // Mark as read in the global state
        markNotificationAsRead(notif.id);
      }, 100 + index * 300); // Задержка 100ms для первого, затем +300ms для каждого следующего

      // Сохраняем timeout id
      timeoutIdsRef.current.add(timeoutId);
    });

    // Cleanup
    return () => {
      // Отменяем все активные таймеры
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current.clear();
    };
  }, [notifications, markNotificationAsRead]);

  return null;
};
