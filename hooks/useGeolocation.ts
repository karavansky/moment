'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type GeoPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

interface Position {
  latitude: number
  longitude: number
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

    // Use Permissions API to check current state without triggering a prompt
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state as GeoPermissionState)
        setIsReady(true)

        // Listen for permission changes (e.g., user changes in browser settings)
        result.onchange = () => {
          setPermission(result.state as GeoPermissionState)
        }
      }).catch(() => {
        // Permissions API not fully supported, fall back to prompt
        setPermission('prompt')
        setIsReady(true)
      })
    } else {
      // No Permissions API, assume prompt
      setPermission('prompt')
      setIsReady(true)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('geolocation' in navigator)) return false

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPermission('granted')
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })
          resolve(true)
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermission('denied')
          }
          resolve(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
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
    if (!('geolocation' in navigator)) return
    if (watchIdRef.current !== null) return // Already tracking

    activeAppointmentIdRef.current = appointmentId

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }
        setPosition(newPos)
        latestPositionRef.current = newPos
      },
      (err) => {
        console.error('[useGeolocation] Watch error:', err)
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
      }
    )

    watchIdRef.current = watchId
    setIsTracking(true)

    // Send immediately on start using getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }
        latestPositionRef.current = newPos
        setPosition(newPos)
        sendLocationToServer(newPos, appointmentId)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
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
