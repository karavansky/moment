'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notif } from '@/types/scheduling';
import { useScheduling } from '@/contexts/SchedulingContext';
import { useDemo } from '@/contexts/DemoContext';
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
      href: '/dispatcher/001',
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
  const { openAppointment, isLiveMode } = useScheduling()
  const { isDemoActive } = useDemo()
  const { addNotification } = useNotifications();
  const currentIndexRef = useRef(0);

  useEffect(() => {
    // Не запускать для авторизованных пользователей
    if (isLiveMode) return;

    // Не запускать автоматически - только по кнопке
    if (!isDemoActive) {
      console.log('🔔 [Demo Worker] Demo not active, waiting for user to click button...');
      return;
    }

    console.log(`🔔 [Demo Worker] Starting demo! timestamp=${Date.now()}, pathname=${window.location.pathname}`);

    const showNextNotification = () => {
      const index = currentIndexRef.current;

      if (index >= DEMO_NOTIFICATIONS.length) {
        console.log('🔔 [Demo Worker] All notifications shown, stopping demo');
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

    // Immediately open demo appointment and show first notification
    console.log(`🔔 [Demo Worker] Opening demo appointment...`);
    openAppointment('1HtTFzn7NJ7viLFBvJFN9','3Eoxlmzdr4uEJggFueFnB');

    // Show first notification after 3 seconds, then every 10 seconds for demo
    const initialTimeoutId = setTimeout(() => {
      showNextNotification();
    }, 3000);

    // Show subsequent notifications every 10 seconds
    const intervalId = setInterval(showNextNotification, 10000);
    console.log('🔔 [Demo Worker] Demo started - notifications every 10s');

    return () => {
      console.log(`🔔 [Demo Worker] Cleaning up timers, timestamp=${Date.now()}`);
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [addNotification, openAppointment, isLiveMode, isDemoActive]);

  return null;
};
