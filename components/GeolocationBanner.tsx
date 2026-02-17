'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/components/AuthProvider'
import { MapPin, X } from 'lucide-react'

/**
 * Banner prompting workers to enable GPS location permission.
 * Only shows for workers (status=1). Pattern mirrors PushNotificationBanner.
 */
export function GeolocationBanner() {
  const { session, status: authStatus } = useAuth()
  const pathname = usePathname()
  const { permission, isReady, requestPermission } = useGeolocation()
  const [dismissed, setDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeniedHelp, setShowDeniedHelp] = useState(false)

  // Restore dismissed state from localStorage
  // Reset dismissed if permission was revoked
  useEffect(() => {
    if (!isReady) return
    const stored = localStorage.getItem('geo-banner-dismissed')
    if (stored && permission !== 'granted') {
      // Permission lost — clear dismissed so banner reappears
      localStorage.removeItem('geo-banner-dismissed')
      setDismissed(false)
    } else if (stored) {
      setDismissed(true)
    }
  }, [isReady, permission])

  // Don't show until permission status is determined (prevents flash)
  if (!isReady) return null
  if (authStatus !== 'authenticated') return null
  if (permission === 'granted') return null
  if (dismissed) return null
  if (pathname?.includes('/settings')) return null

  // Only show to workers (status=1)
  const userStatus = session?.user?.status
  if (userStatus !== 1) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('geo-banner-dismissed', '1')
  }

  const handleEnable = async () => {
    setIsLoading(true)
    const success = await requestPermission()
    setIsLoading(false)
    if (success) {
      setDismissed(true)
    }
  }

  // Unsupported browser
  if (permission === 'unsupported') return null

  // Denied: show instructions
  if (permission === 'denied') {
    const handleRetryEnable = async () => {
      setIsLoading(true)
      const success = await requestPermission()
      setIsLoading(false)
      if (success) {
        setDismissed(true)
      } else {
        setShowDeniedHelp(true)
      }
    }

    return (
      <div className="mx-4 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white">
              Location access is blocked. Try enabling or check browser settings.
            </p>
          </div>
          <button
            onClick={handleRetryEnable}
            disabled={isLoading}
            className="shrink-0 mr-8 px-3 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </button>
        </div>
        {showDeniedHelp && (
          <div className="mt-2 ml-8 text-xs text-gray-600 dark:text-gray-400">
            <p>Your browser has blocked location access. To re-enable:</p>
            <ol className="mt-1 ml-4 list-decimal space-y-0.5">
              <li>Click the lock/info icon in the address bar</li>
              <li>Find &quot;Location&quot; and set to &quot;Allow&quot;</li>
              <li>Refresh the page and tap Enable again</li>
            </ol>
          </div>
        )}
      </div>
    )
  }

  // Prompt: show enable button
  return (
    <div className="mx-4 mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl relative flex items-center gap-3">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
      <MapPin className="w-5 h-5 text-green-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          Allow location access to track your position during appointments
        </p>
      </div>
      <button
        onClick={handleEnable}
        disabled={isLoading}
        className="shrink-0 mr-8 px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Allowing...' : 'Allow'}
      </button>
    </div>
  )
}
