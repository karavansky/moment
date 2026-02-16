'use client'

import { useEffect, useRef, useState } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useGeolocation } from '@/hooks/useGeolocation'

/**
 * Invisible component that tracks worker GPS location during open appointments.
 * Mounted in Providers — renders nothing.
 */
export function GeolocationTracker() {
  const { appointments, user, isLiveMode } = useScheduling()
  const { permission, startTracking, stopTracking, isTracking } = useGeolocation()
  const [geoEnabled, setGeoEnabled] = useState<boolean | null>(null)
  const prevAppointmentIdRef = useRef<string | null>(null)

  // Fetch geolocationEnabled setting once
  useEffect(() => {
    if (!isLiveMode) return

    fetch('/api/settings')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setGeoEnabled(data.geolocationEnabled)
      })
      .catch(() => {})
  }, [isLiveMode])

  // Find active (open) appointment for current worker
  const myWorkerID = user?.myWorkerID
  const activeAppointment = myWorkerID
    ? appointments.find(
        (apt) => apt.isOpen && apt.workerIds?.includes(myWorkerID)
      )
    : null
  const activeAppointmentId = activeAppointment?.id ?? null

  // Start/stop tracking based on active appointment
  useEffect(() => {
    if (!isLiveMode) return
    if (permission !== 'granted') return
    if (geoEnabled === false) return

    const prev = prevAppointmentIdRef.current

    if (activeAppointmentId && activeAppointmentId !== prev) {
      // New appointment opened — start tracking
      if (isTracking) stopTracking()
      startTracking(activeAppointmentId)
      prevAppointmentIdRef.current = activeAppointmentId
    } else if (!activeAppointmentId && prev) {
      // Appointment closed — stop tracking
      stopTracking()
      prevAppointmentIdRef.current = null
    }
  }, [activeAppointmentId, permission, geoEnabled, isLiveMode, isTracking, startTracking, stopTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) stopTracking()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
