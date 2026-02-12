'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notif } from '@/types/scheduling';
import { useScheduling } from '@/contexts/SchedulingContext';
import { Router } from 'next/router';

const simpleId = () => Math.random().toString(36).substr(2, 9);

// Predefined array of demo notifications with actionProps
const DEMO_NOTIFICATIONS: Omit<Notif, 'id' | 'date' | 'isRead'>[] = [
  {
    userID: 'system-demo',
    type: 'info',
    title: 'Welcome!',
    message: 'Welcome to Moment! Click to learn more about features.',
    actionProps: {
      children: 'Learn More',
      href: '/map/001',
      variant: 'primary',
    },
  },
  {
    userID: 'system-demo',
    type: 'success',
    title: 'Sync Completed',
    message: 'All appointments have been synchronized with the server.',
    actionProps: {
      children: 'View Changes',
      variant: 'secondary',
    },
  },
  {
    userID: 'system-demo',
    type: 'warning',
    title: 'Upcoming Appointment',
    message: 'You have an appointment with John Doe in 30 minutes.',
    actionProps: {
      children: 'View Details',
      variant: 'primary',
    },
  },
  {
    userID: 'system-demo',
    type: 'error',
    title: 'Connection Lost',
    message: 'Unable to connect to the server. Please check your internet connection.',
    actionProps: {
      children: 'Retry',
      variant: 'primary',
    },
  },
  {
    userID: 'system-demo',
    type: 'info',
    title: 'New Message',
    message: 'You have received a new message from dispatch.',
    actionProps: {
      children: 'Read Message',
      variant: 'primary',
    },
  },
  {
    userID: 'system-demo',
    type: 'success',
    title: 'Task Completed',
    message: 'Job #1234 has been marked as complete.',
    actionProps: {
      children: 'View Report',
      variant: 'secondary',
    },
  },
  {
    userID: 'system-demo',
    type: 'warning',
    title: 'Late Arrival',
    message: 'Worker Michael is running 15 minutes late for the next appointment.',
    actionProps: {
      children: 'Notify Client',
      variant: 'primary',
    },
  },
  {
    userID: 'system-demo',
    type: 'info',
    title: 'Schedule Update',
    message: 'Tomorrow\'s schedule has been updated with 3 new appointments.',
    actionProps: {
      children: 'View Schedule',
      variant: 'secondary',
    },
  },
];

export const DemoNotificationWorker = () => {
    const { openAppointment } = useScheduling()
  
  const { addNotification } = useNotifications();
  const currentIndexRef = useRef(0);

  useEffect(() => {
    console.log(`🔔 [Demo Worker] Mounting... timestamp=${Date.now()}, pathname=${window.location.pathname}`);

    // На корневой странице / — начало нового демо-цикла, чистим предыдущий state
    if (window.location.pathname === '/') {
      sessionStorage.removeItem('moment_openAppointments')
      console.log('🔔 [Demo Worker] Cleared sessionStorage (root page)')
    }

    const showNextNotification = () => {
      const index = currentIndexRef.current;

      if (index >= DEMO_NOTIFICATIONS.length) {
        console.log('🔔 [Demo Worker] All notifications shown, restarting from beginning');
     //   currentIndexRef.current = 0;
        return;
      }

      const template = DEMO_NOTIFICATIONS[index];
      const notification: Notif = {
        ...template,
        id: simpleId(),
        date: new Date(),
        isRead: false,
      };

      console.log(`🔔 [Demo Worker] Showing notification ${index + 1}/${DEMO_NOTIFICATIONS.length}:`, notification.title);
      addNotification(notification);

      currentIndexRef.current = index + 1;
    };

    // Show first notification after 30 seconds, then every 60 seconds
    let intervalId: NodeJS.Timeout | null = null;

    const initialTimeoutId = setTimeout(() => {
      console.log(`🔔 [Demo Worker] Timeout fired! timestamp=${Date.now()}, pathname=${window.location.pathname}`);
      // openAppointment сам проверяет isOpen — если appointment уже восстановлен
      // из sessionStorage, повторный вызов будет no-op (без notification)
      openAppointment('1HtTFzn7NJ7viLFBvJFN9','3Eoxlmzdr4uEJggFueFnB');

      // Start interval for subsequent notifications
      intervalId = setInterval(showNextNotification, 60000);
      console.log('🔔 [Demo Worker] Interval started (60s):', intervalId);
    }, 30000);

    console.log('🔔 [Demo Worker] Initial timeout started (30s):', initialTimeoutId);

    return () => {
      console.log(`🔔 [Demo Worker] Cleaning up timers, timestamp=${Date.now()}`);
      clearTimeout(initialTimeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [addNotification, openAppointment]);

  return null;
};
