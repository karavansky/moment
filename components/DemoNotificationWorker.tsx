'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notif } from '@/types/scheduling';
import { generateId } from '@/lib/generateId'; // Assuming you have a generateId utility, or I'll use a simple one

// Simple ID generator if import fails or to keep it self-contained
const simpleId = () => Math.random().toString(36).substr(2, 9);

export const DemoNotificationWorker = () => {
  const { addNotification } = useNotifications();

  // Используем ref для хранения актуальной версии addNotification
  const addNotificationRef = useRef(addNotification);

  // Обновляем ref при изменении addNotification
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  useEffect(() => {
    console.log('🔔 [Demo Worker] Mounting...');

    // Function to generate a random notification
    const generateRandomNotification = () => {
      const types: Notif['type'][] = ['info', 'success', 'warning', 'error'];
      const randomType = types[Math.floor(Math.random() * types.length)];

      const titles = {
        info: ['New Message', 'System Update', 'Shift Reminder'],
        success: ['Task Completed', 'Sync Successful', 'Payment Received'],
        warning: ['Low Battery', 'Late Arrival', 'Connection Unstable'],
        error: ['Sync Failed', 'Login Error', 'GPS Signal Lost']
      };

      const messages = {
        info: ['You have a new message from dispatch.', 'System maintenance scheduled for tonight.', 'Don\'t forget your shift tomorrow.'],
        success: ['Job #1234 marked as complete.', 'Data synchronized with server.', 'Client payment processed.'],
        warning: ['Device battery is below 15%.', 'Worker is 10 mins late for appointment.', 'Internet connection is spotty.'],
        error: ['Failed to upload report photos.', 'Invalid credentials provided.', 'Cannot locate device.']
      };

      const titleList = titles[randomType];
      const messageList = messages[randomType];

      const title = titleList[Math.floor(Math.random() * titleList.length)];
      const message = messageList[Math.floor(Math.random() * messageList.length)];

      const newNotification: Notif = {
        id: simpleId(),
        userID: 'system-demo',
        type: randomType,
        title: title,
        message: message,
        date: new Date(),
        isRead: false
      };

      console.log('🔔 [Demo Worker] Generating notification:', newNotification.title);
      // Используем ref для вызова актуальной версии addNotification
      addNotificationRef.current(newNotification);
    };

    // Set up interval to generate notifications every 15-45 seconds (randomized)
    // For demo purposes, we start with a fixed interval initially
    const intervalId = setInterval(() => {
      // 30% chance to generate a notification each tick (e.g. every 5s check)
      if (Math.random() > 0.7) {
        generateRandomNotification();
      }
    }, 5000);

    console.log('🔔 [Demo Worker] Interval started:', intervalId);

    return () => {
      console.log('🔔 [Demo Worker] Cleaning up interval:', intervalId);
      clearInterval(intervalId);
    };
  }, []); // Пустой массив - интервал создается только один раз, используем ref для актуальности

  return null; // Invisible component
};
