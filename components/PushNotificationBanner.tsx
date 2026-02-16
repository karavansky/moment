'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuth } from '@/components/AuthProvider'
import { Bell, X, Share, Plus } from 'lucide-react'

/**
 * Banner prompting workers/directors to enable push notifications.
 * Adapts to platform: iOS without PWA shows install instructions.
 */
export function PushNotificationBanner() {
  const { session, status: authStatus } = useAuth()
  const { permission, isSubscribed, needsPWAInstall, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Restore dismissed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('push-banner-dismissed')
    if (stored) setDismissed(true)
  }, [])

  // Don't show if not authenticated, already subscribed, already denied, or dismissed
  if (authStatus !== 'authenticated') return null
  if (isSubscribed) return null
  if (permission === 'denied') return null
  if (dismissed) return null

  // Only show to workers (1) and directors/managers (0, 3, null)
  const userStatus = session?.user?.status
  if (userStatus === 2) return null // clients don't need push

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('push-banner-dismissed', '1')
  }

  const handleEnable = async () => {
    setIsLoading(true)
    const success = await subscribe()
    setIsLoading(false)
    if (success) {
      setDismissed(true)
    }
  }

  // iOS without PWA: show install instructions
  if (needsPWAInstall) {
    return (
      <div className="mx-4 mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Install app for notifications
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              To receive push notifications on iOS, add this app to your home screen:
            </p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li className="flex items-center gap-1.5">
                <span>1.</span> Tap <Share className="w-3.5 h-3.5 inline" /> Share in Safari
              </li>
              <li className="flex items-center gap-1.5">
                <span>2.</span> Tap <Plus className="w-3.5 h-3.5 inline" /> Add to Home Screen
              </li>
              <li>3. Open the app from your home screen</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // Unsupported browser
  if (permission === 'unsupported') return null

  // Normal: show enable button
  return (
    <div className="mx-4 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl relative flex items-center gap-3">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
      <Bell className="w-5 h-5 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          Enable notifications to stay updated on appointments
        </p>
      </div>
      <button
        onClick={handleEnable}
        disabled={isLoading}
        className="shrink-0 mr-8 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Enabling...' : 'Enable'}
      </button>
    </div>
  )
}
