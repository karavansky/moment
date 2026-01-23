'use client';

import { useEffect, useRef } from 'react';
import { useScheduling } from '@/contexts/SchedulingContext';
import { toast } from '@heroui/react';

export const NotificationObserver = () => {
  const { notifications, markNotificationAsRead } = useScheduling();
  
  // Ref to track processed notification IDs to prevent duplicate toasts
  // especially in React Strict Mode
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    notifications.forEach((notif) => {
      // Check if notification is unread AND hasn't been processed by this component instance yet
      if (!notif.isRead && !processedIds.current.has(notif.id)) {
        
        // Use the convenient toast API
        // Notif type: 'info' | 'success' | 'warning' | 'error'
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

        // Add to processed set
        processedIds.current.add(notif.id);

        // Mark as read in the global state
        markNotificationAsRead(notif.id);
      }
    });
  }, [notifications, markNotificationAsRead]);

  return null;
};
