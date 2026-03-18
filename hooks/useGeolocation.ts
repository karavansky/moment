'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type GeoPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

interface Position {
  latitude: number
  longitude: number
  timestamp?: number // GPS timestamp in milliseconds
  accuracy?: number  // Position accuracy in meters
  speed?: number | null     // Speed in m/s (null if not available)
  heading?: number | null   // Heading in degrees (null if not available)
}

const SEND_INTERVAL_MS = 30_000 // Send location to server every 30 seconds

export function useGeolocation() {
  const [permission, setPermission] = useState<GeoPermissionState>('prompt')
  const [isReady, setIsReady] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const latestPositionRef = useRef<Position | null>(null)
  const activeAppointmentIdRef = useRef<string | null>(null)

  // Detect permission on mount
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermission('unsupported')
      setIsReady(true)
      return
    }

    // Check if permission was previously granted (stored by requestPermission)
    const storedPermission = localStorage.getItem('geo-permission')

    // Helper: verify stored permission with a quick position check
    const verifyWithPosition = () => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermission('granted')
          setIsReady(true)
        },
        () => {
          localStorage.removeItem('geo-permission')
          setPermission('prompt')
          setIsReady(true)
        },
        { timeout: 3000, maximumAge: Infinity }
      )
    }

    // Use Permissions API to check current state without triggering a prompt
    const hasPermissionsApi = typeof navigator.permissions?.query === 'function'

    if (hasPermissionsApi) {
      navigator.permissions!.query({ name: 'geolocation' }).then((result) => {
        // Safari may return 'prompt' even when granted — check if it's reliable
        if (result.state === 'granted' || result.state === 'denied') {
          setPermission(result.state as GeoPermissionState)
          setIsReady(true)
          localStorage.setItem('geo-permission', result.state)
        } else if (storedPermission === 'granted') {
          // Permissions API says 'prompt' but we know user granted before (Safari bug)
          verifyWithPosition()
          return
        } else {
          setPermission('prompt')
          setIsReady(true)
        }

        // Listen for permission changes
        result.onchange = () => {
          setPermission(result.state as GeoPermissionState)
          localStorage.setItem('geo-permission', result.state)
        }
      }).catch(() => {
        // Permissions API not supported for geolocation (Safari)
        if (storedPermission === 'granted') {
          verifyWithPosition()
        } else {
          setPermission('prompt')
          setIsReady(true)
        }
      })
    } else if (storedPermission === 'granted') {
      verifyWithPosition()
    } else {
      setPermission('prompt')
      setIsReady(true)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('geolocation' in navigator)) {
      console.warn('[useGeolocation] Geolocation API not supported')
      return false
    }

    // Check if we're on HTTP (not HTTPS) - geolocation requires HTTPS except on localhost
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      console.error('[useGeolocation] Geolocation requires HTTPS (or localhost). Current protocol:', window.location.protocol)
      setPermission('denied')
      return false
    }

    console.log('[useGeolocation] Requesting geolocation permission...')

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('[useGeolocation] ✅ Permission granted')
          setPermission('granted')
          localStorage.setItem('geo-permission', 'granted')
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: pos.timestamp,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
          })
          resolve(true)
        },
        (err) => {
          // Enhanced error logging
          const errorInfo = {
            code: err?.code,
            message: err?.message,
            type: err?.constructor?.name,
            // Map error codes to readable names
            errorName: err?.code === 1 ? 'PERMISSION_DENIED' :
                      err?.code === 2 ? 'POSITION_UNAVAILABLE' :
                      err?.code === 3 ? 'TIMEOUT' : 'UNKNOWN',
            isSecureContext: window?.isSecureContext,
            protocol: window?.location?.protocol,
            hostname: window?.location?.hostname,
          }

          // POSITION_UNAVAILABLE (code 2) and TIMEOUT (code 3) are temporary errors
          // They don't mean permission was denied - just that we can't get location right now
          if (err?.code === 1) { // PERMISSION_DENIED - permanent error
            console.error('[useGeolocation] ❌ Permission DENIED by user:', errorInfo)
            setPermission('denied')
            localStorage.setItem('geo-permission', 'denied')
            resolve(false)
          } else if (err?.code === 2) { // POSITION_UNAVAILABLE - temporary error
            console.warn('[useGeolocation] ⚠️ Position unavailable (temporary - will retry):', errorInfo)
            // Grant permission anyway - watchPosition will keep trying
            setPermission('granted')
            localStorage.setItem('geo-permission', 'granted')
            resolve(true) // Continue with tracking - watchPosition will handle retries
          } else if (err?.code === 3) { // TIMEOUT - temporary error
            console.warn('[useGeolocation] ⚠️ Request timed out (temporary - will retry):', errorInfo)
            // Grant permission anyway - watchPosition will keep trying
            setPermission('granted')
            localStorage.setItem('geo-permission', 'granted')
            resolve(true) // Continue with tracking - watchPosition will handle retries
          } else {
            console.error('[useGeolocation] ❌ Unknown error:', errorInfo)
            resolve(false)
          }
        },
        {
          enableHighAccuracy: true,   // Use real GPS hardware for driver navigation
          timeout: 10000,             // 10 seconds timeout
          maximumAge: 0               // Force fresh position (no cache)
        }
      )
    })
  }, [])

  const sendLocationToServer = useCallback(async (pos: Position, appointmentId: string) => {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: pos.latitude,
          longitude: pos.longitude,
          appointmentId,
        }),
      })
    } catch (err) {
      console.error('[useGeolocation] Failed to send location:', err)
    }
  }, [])

  const startTracking = useCallback((appointmentId: string) => {
    if (!('geolocation' in navigator)) {
      console.warn('[useGeolocation] Geolocation not supported')
      return
    }
    if (watchIdRef.current !== null) {
      console.warn('[useGeolocation] Already tracking')
      return // Already tracking
    }

    console.log('[useGeolocation] Starting tracking for appointment:', appointmentId)
    activeAppointmentIdRef.current = appointmentId

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        }
        console.log('[useGeolocation] 📍 Position updated:', {
          lat: newPos.latitude,
          lng: newPos.longitude,
          accuracy: newPos.accuracy,
          timestamp: new Date(pos.timestamp).toLocaleTimeString(),
          speed: newPos.speed,
          heading: newPos.heading,
        })
        setPosition(newPos)
        latestPositionRef.current = newPos
      },
      (err) => {
        // Some browsers return empty/malformed errors on first mount
        if (!err || typeof err !== 'object') {
          console.warn('[useGeolocation] Watch error (malformed):', err)
          return
        }

        const errorCode = err.code
        const errorMessage = err.message || 'Unknown error'

        // POSITION_UNAVAILABLE (code 2) is normal when GPS is acquiring signal
        // TIMEOUT (code 3) is also recoverable - watchPosition will retry
        const isRecoverableError = errorCode === 2 || errorCode === 3

        if (isRecoverableError) {
          console.warn('[useGeolocation] ⚠️ Position unavailable (will keep trying):', {
            code: errorCode,
            message: errorMessage,
            note: 'This is normal - waiting for GPS/Wi-Fi signal. watchPosition will retry automatically.',
          })
        } else {
          console.error('[useGeolocation] Watch error:', {
            code: errorCode,
            message: errorMessage,
            PERMISSION_DENIED: err.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
            TIMEOUT: err.TIMEOUT,
          })
        }

        if (errorCode === err.PERMISSION_DENIED) {
          setPermission('denied')
          localStorage.setItem('geo-permission', 'denied')
        }
      },
      {
        enableHighAccuracy: true,   // TRUE - use real GPS hardware for accurate position
        timeout: 5000,              // 5 seconds timeout - force frequent updates
        maximumAge: 0,              // 0 - never use cached position, always get fresh GPS data
      }
    )

    watchIdRef.current = watchId
    setIsTracking(true)
    console.log('[useGeolocation] Watch started, watchId:', watchId)

    // Send immediately on start using getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        }
        latestPositionRef.current = newPos
        setPosition(newPos)
        sendLocationToServer(newPos, appointmentId)
      },
      (err) => {
        // Ignore errors here - watchPosition will handle them
        // Just log for debugging
        if (err && typeof err === 'object' && err.code) {
          console.warn('[useGeolocation] Initial position error (will retry via watch):', {
            code: err.code,
            message: err.message || 'Unknown',
          })
        }
      },
      {
        enableHighAccuracy: true,   // TRUE - use real GPS hardware
        timeout: 10000,             // 10 seconds for initial position
        maximumAge: 0,              // Force fresh position (no cache)
      }
    )

    // Periodic send to server
    sendIntervalRef.current = setInterval(() => {
      if (latestPositionRef.current && activeAppointmentIdRef.current) {
        sendLocationToServer(latestPositionRef.current, activeAppointmentIdRef.current)
      }
    }, SEND_INTERVAL_MS)

    console.log('[useGeolocation] Tracking started for appointment:', appointmentId)
  }, [sendLocationToServer])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current)
      sendIntervalRef.current = null
    }
    activeAppointmentIdRef.current = null
    setIsTracking(false)
    console.log('[useGeolocation] Tracking stopped')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current)
      }
    }
  }, [])

  return {
    permission,
    isReady,
    isTracking,
    position,
    requestPermission,
    startTracking,
    stopTracking,
  }
}
