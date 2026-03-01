'use client'

import { useEffect, useRef } from 'react'
import { usePushNotifications } from './usePushNotifications'

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
  addEventListener(
    type: 'levelchange' | 'chargingchange',
    listener: (this: this, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  removeEventListener(
    type: 'levelchange' | 'chargingchange',
    listener: (this: this, ev: Event) => any,
    options?: boolean | EventListenerOptions
  ): void
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>
  }
}

function getOSVersion(): string {
  const ua = window.navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) {
    const match = ua.match(/OS (\d+_\d+(_\d+)?)/)
    if (match && match[1]) return `iOS ${match[1].replace(/_/g, '.')}`
  }
  if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+(?:\.\d+)?)/)
    if (match && match[1]) return `Android ${match[1]}`
  }
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/Mac OS X/.test(ua)) return 'macOS'
  return 'Unknown OS'
}

export function useDeviceSync() {
  const { isSubscribed } = usePushNotifications()
  const syncTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const syncStatus = async () => {
      let geoEnabled = false
      try {
        const p = await navigator.permissions.query({ name: 'geolocation' })
        geoEnabled = p.state === 'granted'
      } catch {
        // Ignored
      }

      let batteryLevel: number | undefined
      let batteryStatus: string | undefined
      try {
        if ('getBattery' in navigator && navigator.getBattery) {
          const battery = await navigator.getBattery()
          batteryLevel = Math.round(battery.level * 100)
          batteryStatus = battery.charging ? 'charging' : 'unplugged'
        }
      } catch {
        // Ignored
      }

      const pwaVersion = '1.0.4' // Static for now, could read from generated env var
      const osVersion = getOSVersion()

      const payload: any = {
        pwaVersion,
        osVersion,
        batteryLevel,
        batteryStatus,
        geolocationEnabled: geoEnabled,
        pushNotificationsEnabled: isSubscribed,
      }

      console.log('[useDeviceSync] Sending telemetry payload:', payload)

      fetch('/api/staff/sync-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(err => console.error('[useDeviceSync] Failed to sync telemetry:', err))
    }

    // Wrap in a debounced/throttled call to prevent spamming
    const triggerSync = () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current)
      syncTimeout.current = setTimeout(syncStatus, 2000)
    }

    // Trigger on initial mount
    triggerSync()

    // Trigger when user returns to app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isSubscribed])
}
