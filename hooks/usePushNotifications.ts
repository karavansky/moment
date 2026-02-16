'use client'

import { useState, useEffect, useCallback } from 'react'

type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('prompt')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect platform
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
    setIsStandalone(standalone)

    // Check push support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    // iOS without PWA installation cannot use push
    if (ios && !standalone) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as PushPermissionState)

    // Check existing subscription
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermissionState)
      if (result !== 'granted') return false

      const registration = await navigator.serviceWorker.ready
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        console.error('[usePushNotifications] VAPID public key not configured')
        return false
      }

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        })
      }

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!response.ok) {
        console.error('[usePushNotifications] Failed to save subscription to server')
        return false
      }

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('[usePushNotifications] Subscribe error:', err)
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe error:', err)
    }
  }, [])

  const needsPWAInstall = isIOS && !isStandalone

  return { permission, isSubscribed, isStandalone, isIOS, needsPWAInstall, subscribe, unsubscribe }
}
