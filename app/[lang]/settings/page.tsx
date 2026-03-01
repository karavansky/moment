'use client'

import { useState, useEffect } from 'react'
import { Switch, Spinner } from '@heroui/react'
import { Bell, MapPin, ShieldAlert, Share, Plus, Download } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/components/AuthProvider'
import { usePWAInstall } from '@/contexts/PWAInstallContext'

interface UserSettings {
  pushNotificationsEnabled: boolean
  geolocationEnabled: boolean
}

export default function SettingsPage() {
  const { session, status: authStatus } = useAuth()
  const push = usePushNotifications()
  const geo = useGeolocation()
  const { isInstallable, installPWA } = usePWAInstall()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [policyError, setPolicyError] = useState(false)

  // Fetch settings from server
  useEffect(() => {
    if (authStatus !== 'authenticated') return

    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) setSettings(data)
      })
      .catch(err => console.error('[Settings] Fetch error:', err))
      .finally(() => setLoading(false))
  }, [authStatus])

  // Debug: Check actual permission status
  useEffect(() => {
    console.log('[SettingsPage] Geo hook state:', {
      permission: geo.permission,
      isReady: geo.isReady,
      isTracking: geo.isTracking,
    })

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      // Check permissions API
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        console.log('[SettingsPage] navigator.permissions.query:', result.state)
      })

      // Try to get position to verify access
      navigator.geolocation.getCurrentPosition(
        () => console.log('[SettingsPage] getCurrentPosition: Success'),
        error => {
          console.log('[SettingsPage] getCurrentPosition: Error', error.message)
          if (error.message.toLowerCase().includes('permissions policy')) {
            setPolicyError(true)
          }
        }
      )
    }
  }, [geo.permission, geo.isReady, geo.isTracking])

  // Explicitly sync Push Subscription ownership with the backend when the user visits settings
  useEffect(() => {
    if (push.isReady && push.isSubscribed && push.syncSubscription) {
      push.syncSubscription()
    }
  }, [push.isReady, push.isSubscribed, push.syncSubscription])

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSettings(updated)
      }
    } catch (err) {
      console.error('[Settings] Update error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (authStatus !== 'authenticated') {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Push Notifications Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Push Notifications
          </h2>
        </div>

        {/* iOS without PWA: show install instructions */}
        {push.needsPWAInstall ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Install app to enable notifications
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Push notifications require the app to be installed on your home screen:
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
        ) : (
          <>
            {/* Browser permission status */}
            <PermissionRow
              label="Browser permission"
              permission={push.permission}
              isReady={push.isReady}
              onRequest={push.permission === 'prompt' ? push.subscribe : undefined}
              requestLabel="Enable"
            />

            {/* Server toggle */}
            {settings && (
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Receive notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified about appointment changes
                  </p>
                </div>
                <Switch
                  isSelected={settings.pushNotificationsEnabled}
                  isDisabled={saving}
                  onChange={(value: boolean) => updateSetting('pushNotificationsEnabled', value)}
                  size="sm"
                />
              </div>
            )}

            {/* Subscription status */}
            {push.isReady && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {push.isSubscribed
                  ? 'Active push subscription on this device'
                  : push.permission === 'granted'
                    ? 'Reconnecting subscription...'
                    : 'No active subscription'}
              </div>
            )}
          </>
        )}
      </section>

      {/* GPS Location Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">GPS Location</h2>
        </div>

        {/* Browser permission status */}
        <PermissionRow
          label="Browser permission"
          permission={geo.permission}
          isReady={geo.isReady}
          onRequest={geo.requestPermission}
          requestLabel="Allow"
        />

        {policyError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Server Configuration Error
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Geolocation is blocked by the server&apos;s <code>Permissions-Policy</code> header.
                Please check your Nginx or Next.js configuration.
              </p>
            </div>
          </div>
        )}

        {/* Server toggle */}
        {settings && (
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Location tracking</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share your location during open appointments
              </p>
            </div>
            <Switch
              isSelected={settings.geolocationEnabled}
              isDisabled={saving}
              onChange={(value: boolean) => updateSetting('geolocationEnabled', value)}
              size="sm"
            />
          </div>
        )}

        {/* Tracking status */}
        {geo.isReady && geo.isTracking && geo.position && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Currently tracking: {geo.position.latitude.toFixed(4)},{' '}
            {geo.position.longitude.toFixed(4)}
          </div>
        )}
      </section>

      {/* PWA App Installation Section */}
      {isInstallable && (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                App Installation
              </h2>
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Install Moment LBS
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] sm:max-w-xs">
                Add Moment to your home screen or dock for faster access and offline capabilities.
              </p>
            </div>
            <button
              onClick={installPWA}
              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              Install App
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function PermissionRow({
  label,
  permission,
  isReady,
  onRequest,
  requestLabel,
}: {
  label: string
  permission: string
  isReady: boolean
  onRequest?: () => Promise<boolean | void>
  requestLabel: string
}) {
  const [requesting, setRequesting] = useState(false)
  const [showDeniedHelp, setShowDeniedHelp] = useState(false)

  const handleRequest = async () => {
    if (!onRequest) return
    setRequesting(true)
    await onRequest()
    setRequesting(false)
  }

  const handleDeniedClick = async () => {
    if (showDeniedHelp) {
      setShowDeniedHelp(false)
      return
    }

    if (onRequest) {
      setRequesting(true)
      const success = await onRequest()
      setRequesting(false)
      if (!success) setShowDeniedHelp(true)
    } else {
      setShowDeniedHelp(true)
    }
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
          {permission === 'granted' && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              Allowed
            </span>
          )}
          {permission === 'denied' && (
            <button
              onClick={handleDeniedClick}
              disabled={requesting}
              className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {requesting ? <Spinner size="sm" /> : <ShieldAlert className="w-3 h-3" />}
              {requesting ? 'Checking...' : 'Blocked'}
            </button>
          )}
          {permission === 'prompt' && onRequest && (
            <button
              onClick={handleRequest}
              disabled={requesting}
              className="text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
            >
              {requesting ? 'Requesting...' : requestLabel}
            </button>
          )}
          {permission === 'unsupported' && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              Not supported
            </span>
          )}
        </div>
      </div>
      {showDeniedHelp && permission === 'denied' && (
        <div className="ml-1 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-gray-600 dark:text-gray-400">
          <p>Permission is blocked by your browser. To re-enable:</p>
          <ol className="mt-1 ml-4 list-decimal space-y-0.5">
            <li>Click the lock/info icon in the address bar</li>
            <li>Find the permission and set to &quot;Allow&quot;</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      )}
    </div>
  )
}
