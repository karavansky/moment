'use client'

import { useCallback } from 'react'
import { Dropdown, Button } from '@heroui/react'
import { Bell, X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { SimpleTooltip } from './SimpleTooltip'
import { Notif } from '@/types/scheduling'

interface NotificationDropdownProps {
  tooltipContent?: string
}

const typeIcons: Record<Notif['type'], React.ReactNode> = {
  info: <Info className="w-6 h-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />,
  success: <CheckCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />,
  warning: <AlertTriangle className="w-6 h-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />,
  error: <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />,
}

export function NotificationDropdown({ tooltipContent = 'Notifications' }: NotificationDropdownProps) {
  const { notifications, markNotificationAsRead, clearAllNotifications } = useNotifications()

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const sortedNotifications = useCallback(() => {
    return [...notifications].filter((n) => !n.isRead).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [notifications])()

  const handleNotificationClick = useCallback(
    (id: string) => {
      markNotificationAsRead(id)
    },
    [markNotificationAsRead]
  )

  const handleClearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      clearAllNotifications()
    },
    [clearAllNotifications]
  )

  return (
    <Dropdown>
      <SimpleTooltip content={tooltipContent}>
        <div className="relative">
          <Button
            size="md"
            variant="tertiary"
            className="min-w-unit-10 h-10 rounded-4xl text-sand-200 hover:text- dark:text-white dark:hover:text-white data-[hover=true]:bg-yellow-800/50 dark:data-[hover=true]:bg-gray-700/50 px-3"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6" />
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </SimpleTooltip>
      <Dropdown.Popover className="w-96 max-h-125 border-none shadow-2xl p-0 rounded-3xl bg-inherit backdrop-blur-md outline-none ring-0">
        <div className="flex flex-col gap-3 p-2">
          {/* Header */}
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-semibold text-sand-50 dark:text-white">
              Notifications
            </h2>
            <button
              onClick={handleClearAll}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors"
              aria-label="Clear all"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-105 px-1">
            {sortedNotifications.length === 0 ? (
              <div className="rounded-2xl bg-inherit dark:bg-inherit backdrop-blur-md p-8 text-center shadow-lg">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-full bg-gray-100 dark:bg-gray-800 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {/* Icon */}
                  <div className="shrink-0">{typeIcons[notification.type]}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {notification.title}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
                      {notification.message}
                    </p>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNotificationClick(notification.id)
                    }}
                    className="shrink-0 px-4 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-600 rounded-full hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Dropdown.Popover>
    </Dropdown>
  )
}
