'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dropdown, Button, Surface } from '@heroui/react'
import { Bell, X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { SimpleTooltip } from './SimpleTooltip'
import { Notif } from '@/types/scheduling'

interface NotificationDropdownProps {
  tooltipContent?: string
}

const typeIcons: Record<Notif['type'], React.ReactNode> = {
  info: <Info className="w-6 h-6" strokeWidth={2} color='#338ef7' />,
  success: <CheckCircle className="w-6 h-6" strokeWidth={1.5} color='#28a745' />,
  warning: <AlertTriangle className="w-6 h-6" strokeWidth={1.5} color='#ffc107' />,
  error: <XCircle className="w-6 h-6" strokeWidth={1.5} color='#dc3545' />,
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

export function NotificationDropdown({
  tooltipContent = 'Notifications',
}: NotificationDropdownProps) {
  const { notifications, markNotificationAsRead, clearAllNotifications, closeDropdownSignal } = useNotifications()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isFirstRender = useRef(true)

  // Закрываем dropdown когда приходит сигнал
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setOpen(false)
  }, [closeDropdownSignal])

  const unreadCount = notifications.filter(n => !n.isRead).length
  const sortedNotifications = useCallback(() => {
    return [...notifications]
      .filter(n => !n.isRead)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
      setOpen(false)
    },
    [clearAllNotifications]
  )

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <div className="relative">
        <Button
          size="md"
          variant="tertiary"
          className="min-w-unit-10 h-10 rounded-4xl text-sand-200 hover:text- dark:text-white dark:hover:text-white data-[hover=true]:bg-yellow-800/50 dark:data-[hover=true]:bg-gray-700/50 px-3"
          aria-label="Notifications"
        >
          <SimpleTooltip content={tooltipContent}>
            <Bell className="w-6 h-6" />
          </SimpleTooltip>
        </Button>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <Dropdown.Popover
        className="max-h-125 border-none shadow-2xl p-0 rounded-3xl bg-inherit backdrop-blur-[3px] outline-none ring-0"
        style={{ width: '75vw', maxWidth: '400px' }}
      >
        <div className="flex flex-col gap-3 px-2 rounded-2xl ">
          {/* Header */}
          <div className="flex items-center justify-between px-2  ">
            <Surface className="flex items-center gap-2 rounded-2xl bg-gray-200/50 dark:bg-gray-700/50 backdrop-blur-[3px]">
            <h2 className="text-xl font-normal px-3 text-sand-50 dark:text-white">Notifications</h2>
            </Surface>
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
              <div className="rounded-2xl bg-white/30 dark:bg-gray-800/50 p-8 text-center backdrop-blur-sm">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-700 dark:text-gray-200" />
                <p className="text-gray-700 dark:text-gray-200 font-medium">No notifications</p>
              </div>
            ) : (
              sortedNotifications.map(notification => (
                <div
                  key={notification.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {/* Top row: Icon + Content */}
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5 sm:mt-0">{typeIcons[notification.type]}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimeAgo(notification.date)}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {notification.message}
                      </p>
                    </div>
                  </div>

                  {/* Action Button - full width on mobile, auto on desktop */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setOpen(false)
                      notification.actionProps?.onPress?.()
                      if (notification.actionProps?.href) {
                        router.push(notification.actionProps.href)
                      }
                      handleNotificationClick(notification.id)
                    }}
                    className="shrink-0 w-full sm:w-auto px-4 py-2 sm:py-1.5 text-sm font-medium text-white bg-gray-700 dark:bg-gray-600 rounded-full hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors"
                  >
                    {notification.actionProps?.children || 'Dismiss'}
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
