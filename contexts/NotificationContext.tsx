'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Notif } from '@/types/scheduling';

interface NotificationContextType {
  notifications: Notif[];
  addNotification: (notification: Notif) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  closeDropdownSignal: number;
  requestCloseDropdown: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [closeDropdownSignal, setCloseDropdownSignal] = useState(0);

  const requestCloseDropdown = useCallback(() => {
    setCloseDropdownSignal(prev => prev + 1);
  }, []);

  // Мемоизированные actions
  const addNotification = useCallback((notification: Notif) => {
    setNotifications((prev) => {
      // Простая и быстрая логика: просто добавляем и обрезаем если нужно
      const maxNotifications = 50;

      // Добавляем новое уведомление
      const newNotifications = [...prev, notification];

      // Если превышен лимит, просто удаляем старые элементы с начала
      // Это O(1) операция, не блокирует UI
      if (newNotifications.length > maxNotifications) {
        // Удаляем первые 10 элементов разом для производительности
        return newNotifications.slice(-maxNotifications);
      }

      return newNotifications;
    });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Мемоизируем контекст
  const contextValue = useMemo(
    () => ({
      notifications,
      addNotification,
      markNotificationAsRead,
      clearAllNotifications,
      closeDropdownSignal,
      requestCloseDropdown,
    }),
    [notifications, addNotification, markNotificationAsRead, clearAllNotifications, closeDropdownSignal, requestCloseDropdown]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook для использования контекста
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
