'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { use } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import type { Order, OrderStatus } from '@/types/transport'
import List from '@/components/map/List'
import { useIsPortrait } from '@/hooks/useMediaQuery'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { Switch } from '@heroui/react'
import { useGeolocation } from '@/hooks/useGeolocation'
import bearing from '@turf/bearing'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

// Динамический импорт Map без SSR (Leaflet требует window)
const Map = dynamic(() => import('@/components/map/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-default-100">
      <p className="text-default-500">Загрузка карты...</p>
    </div>
  ),
})

interface DriverPageProps {
  params: Promise<{
    lang: string
  }>
}

export default function DriverPage({ params }: DriverPageProps) {
  const { lang } = use(params)

  // Get current user (driver) data
  const { user, workers, vehicles, updateWorker, updateVehicle } = useScheduling()

  // TODO: Load orders from separate endpoint or context
  const allOrders: Order[] = [] // Placeholder for now

  // Find current worker/driver
  const currentWorker = useMemo(() => {
    const worker = workers.find(w => w.userID === user?.id)
    console.log('🔍 Current worker:', {
      found: !!worker,
      workerID: worker?.id,
      hasVehicle: worker?.hasVehicle,
      vehicleID: worker?.vehicleID,
      isOnline: worker?.isOnline,
    })
    return worker
  }, [workers, user])

  // Driver's vehicle
  const myVehicle = useMemo(() => {
    console.log('🚗 Looking for vehicle:', {
      hasCurrentWorker: !!currentWorker,
      workerVehicleID: currentWorker?.vehicleID,
      totalVehicles: vehicles.length,
      vehicleIDs: vehicles.map(v => v.id),
    })
    if (!currentWorker?.vehicleID) {
      console.warn('⚠️ No vehicleID on currentWorker')
      return null
    }
    const vehicle = vehicles.find(v => v.id === currentWorker.vehicleID)
    console.log('🚗 Found vehicle:', !!vehicle, vehicle?.plateNumber)
    return vehicle || null
  }, [currentWorker, vehicles])

  // Online/offline state
  const [isOnline, setIsOnline] = useState(currentWorker?.isOnline || false)

  // GPS tracking
  const { position, isTracking, startTracking, stopTracking, requestPermission, permission } = useGeolocation()

  // Track last sent position to avoid unnecessary updates
  const lastSentPositionRef = useRef<{ lat: number; lng: number } | null>(null)

  // Track previous position for bearing calculation
  const previousPositionRef = useRef<{ lat: number; lng: number } | null>(null)

  // Track last N positions for more accurate bearing calculation at low speeds
  const positionHistoryRef = useRef<Array<{ lat: number; lng: number; timestamp: number }>>([])
  const POSITION_HISTORY_SIZE = 5 // Keep last 5 positions (~10-15 seconds of data)
  const MIN_BEARING_DISTANCE = 3 // Minimum 3 meters total to update bearing

  // Current bearing (heading) in degrees
  const [mapBearing, setMapBearing] = useState<number>(0)

  // Current speed in km/h
  const [currentSpeed, setCurrentSpeed] = useState<number>(0)

  // Test route coordinates for display on map
  const [testRouteCoordinates, setTestRouteCoordinates] = useState<Array<[number, number]> | null>(null)

  // Track last GPS update time for throttling and dynamic interpolation
  const lastGPSUpdateRef = useRef<number>(0)
  const lastGPSTimestampRef = useRef<number>(0) // Track GPS timestamp for dynamic interpolation
  const GPS_UPDATE_INTERVAL = 1000 // 1 second (minimum throttle)

  // GPS batching: accumulate points and send in batches
  const [batchingEnabled, setBatchingEnabled] = useState(false) // Toggle for batching (default: disabled for debugging)
  const gpsBatchRef = useRef<Array<{ latitude: number; longitude: number; timestamp: string }>>([])
  const BATCH_SIZE = 5 // Send when we have 5 points
  const BATCH_INTERVAL = 10000 // Or every 10 seconds, whichever comes first
  const lastBatchSentRef = useRef<number>(Date.now())

  // GPS point buffering: queue 2-3 points before starting animation to prevent jumps
  const gpsBufferRef = useRef<Array<{ lat: number; lng: number; timestamp: number }>>([])
  const BUFFER_SIZE = 2 // Wait for 2 points before starting animation
  const isBufferReadyRef = useRef(false) // Track if we've started animating

  // Track current interpolated position in a ref (to avoid stale closure in setLocalVehicle callback)
  const currentInterpolatedPosRef = useRef<{ lat: number; lng: number } | null>(null)

  // Track if interpolation animation is currently running
  const isInterpolatingRef = useRef<boolean>(false)

  // 🛠️ FIX: Use refs for interpolation params to avoid React re-render delays
  const interpolationParamsRef = useRef<{
    startPos: { lat: number; lng: number } | null
    endPos: { lat: number; lng: number } | null
    startTime: number | null
    duration: number
  }>({
    startPos: null,
    endPos: null,
    startTime: null,
    duration: GPS_UPDATE_INTERVAL,
  })

  // Interpolation state for smooth marker movement
  const [interpolatedPosition, setInterpolatedPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [interpolationParams, setInterpolationParams] = useState<{
    startPos: { lat: number; lng: number } | null
    endPos: { lat: number; lng: number } | null
    startTime: number | null
    duration: number
  }>({
    startPos: null,
    endPos: null,
    startTime: null,
    duration: GPS_UPDATE_INTERVAL, // Match GPS update interval (1 second)
  })

  // Store refs to avoid dependency issues in useEffect
  const myVehicleRef = useRef(myVehicle)

  // Update refs when values change
  useEffect(() => {
    myVehicleRef.current = myVehicle
  }, [myVehicle])

  // Clear batch when batching is disabled
  useEffect(() => {
    if (!batchingEnabled && gpsBatchRef.current.length > 0) {
      console.log('⚠️ Batching disabled - clearing batch with', gpsBatchRef.current.length, 'pending points')
      gpsBatchRef.current = []
    }
  }, [batchingEnabled])

  // Local vehicle with current GPS position (for map display)
  const [localVehicle, setLocalVehicle] = useState(myVehicle)

  // Sync localVehicle when myVehicle changes (on initial load)
  useEffect(() => {
    if (myVehicle && !localVehicle) {
      setLocalVehicle(myVehicle)
    }
  }, [myVehicle, localVehicle])

  // Smooth interpolation animation for marker movement
  useEffect(() => {
    // 🔍 DIAGNOSTIC: Log every time useEffect runs (even if early return)
    console.log('[Test Interpolation] 🔄 useEffect RAN (dependencies changed):', {
      hasStartPos: !!interpolationParams.startPos,
      hasEndPos: !!interpolationParams.endPos,
      hasStartTime: !!interpolationParams.startTime,
      startPosLat: interpolationParams.startPos?.lat,
      startPosLng: interpolationParams.startPos?.lng,
      endPosLat: interpolationParams.endPos?.lat,
      endPosLng: interpolationParams.endPos?.lng,
      startTime: interpolationParams.startTime,
      duration: interpolationParams.duration,
    })

    if (!interpolationParams.startPos || !interpolationParams.endPos || !interpolationParams.startTime) {
      console.log('[Test Interpolation] ⏸️ Early return - missing required params')
      return // No interpolation active
    }

    console.log('[Test Interpolation] 🎬 Starting NEW interpolation (useEffect triggered):', {
      from: interpolationParams.startPos,
      to: interpolationParams.endPos,
      duration: interpolationParams.duration,
      startTime: new Date(interpolationParams.startTime).toISOString(),
    })

    // 🛠️ FIX: Sync ref with state
    interpolationParamsRef.current = {
      startPos: interpolationParams.startPos,
      endPos: interpolationParams.endPos,
      startTime: interpolationParams.startTime,
      duration: interpolationParams.duration,
    }

    // 🛠️ FIX: Mark interpolation as active
    isInterpolatingRef.current = true

    let animationFrameId: number
    let lastFrameTime = Date.now()
    let frameCount = 0

    const animate = () => {
      const now = Date.now()
      const params = interpolationParamsRef.current // 🛠️ FIX: Read from ref!
      const elapsed = now - params.startTime!
      const progress = Math.min(elapsed / params.duration, 1) // Clamp to [0, 1]

      // 🔍 DIAGNOSTIC: Log frame timing to detect pauses
      const timeSinceLastFrame = now - lastFrameTime
      if (timeSinceLastFrame > 30) { // More than 30ms between frames = pause!
        console.log('[Test Interpolation] ⚠️ FRAME PAUSE DETECTED:', {
          timeSinceLastFrame: `${timeSinceLastFrame}ms`,
          progress: `${(progress * 100).toFixed(1)}%`,
          elapsed: `${elapsed}ms`,
        })
      }
      lastFrameTime = now
      frameCount++

      // 🛠️ FIX: Use LINEAR easing for constant speed (no deceleration)
      // This prevents visual pauses when transitioning between GPS points
      const easedProgress = progress

      // Linear interpolation (lerp) between start and end positions
      const lat = params.startPos!.lat + (params.endPos!.lat - params.startPos!.lat) * easedProgress
      const lng = params.startPos!.lng + (params.endPos!.lng - params.startPos!.lng) * easedProgress

      setInterpolatedPosition({ lat, lng })

      // 🛠️ FIX: Store interpolated position in ref so it can be read synchronously
      currentInterpolatedPosRef.current = { lat, lng }

      // Update localVehicle with interpolated position for map display
      setLocalVehicle(prev => prev ? {
        ...prev,
        currentLat: lat,
        currentLng: lng,
      } : null)

      if (progress < 1) {
        // Continue animation
        animationFrameId = requestAnimationFrame(animate)
      } else {
        // Animation complete
        console.log('[Test Interpolation] ✅ Interpolation complete:', {
          finalPosition: { lat, lng },
          totalElapsed: `${elapsed}ms`,
          expectedDuration: `${params.duration}ms`,
          bufferSize: gpsBufferRef.current.length,
        })

        // 🛠️ FIX: If there are more points in buffer, continue animation seamlessly!
        if (gpsBufferRef.current.length > 0) {
          const nextPoint = gpsBufferRef.current.shift()!

          // 🛠️ FIX: Calculate duration based on time between GPS points
          const timeBetweenPoints = lastGPSTimestampRef.current > 0 && nextPoint.timestamp
            ? nextPoint.timestamp - lastGPSTimestampRef.current
            : GPS_UPDATE_INTERVAL
          const nextDuration = Math.min(Math.max(timeBetweenPoints, 100), 10000) // Clamp between 100ms and 10s

          console.log('[Test Interpolation] ⏭️ Continuing animation with next point from buffer (UPDATING REF ONLY):', {
            bufferRemaining: gpsBufferRef.current.length,
            nextPoint,
            duration: `${nextDuration}ms`,
            timeBetweenPoints: `${timeBetweenPoints}ms`,
            lastTimestamp: lastGPSTimestampRef.current,
            nextTimestamp: nextPoint.timestamp,
          })

          // Update last timestamp for next calculation
          lastGPSTimestampRef.current = nextPoint.timestamp

          // 🛠️ FIX: Update REF directly (NOT state!) to avoid React re-render
          interpolationParamsRef.current = {
            startPos: { lat, lng },
            endPos: { lat: nextPoint.lat, lng: nextPoint.lng },
            startTime: Date.now(),
            duration: nextDuration,
          }

          // Continue animation loop seamlessly
          animationFrameId = requestAnimationFrame(animate)
        } else {
          // No more points in buffer - stop animation
          isInterpolatingRef.current = false
        }
      }
    }

    // Start animation
    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        console.log('[Test Interpolation] 🛑 Cancelling previous interpolation animation (new one starting)')
        cancelAnimationFrame(animationFrameId)
        // 🛠️ FIX: Mark interpolation as inactive when cancelled
        isInterpolatingRef.current = false
      }
    }
  }, [
    interpolationParams.startTime,
    interpolationParams.startPos?.lat,
    interpolationParams.startPos?.lng,
    interpolationParams.endPos?.lat,
    interpolationParams.endPos?.lng,
    interpolationParams.duration
  ]) // 🛠️ FIX: Depend on primitive values (lat/lng), not object references!

  // Orders assigned to this driver
  const myOrders = useMemo(() => {
    if (!currentWorker) return []
    return allOrders.filter(order => order.driverID === currentWorker.id)
  }, [allOrders, currentWorker])

  // Selection state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Orientation detection
  const isPortrait = useIsPortrait()

  // Handle app returning from background (PWA visibility change)
  // 🛠️ FIX: Use useCallback to ensure callback has fresh values
  const handleForegroundRefresh = useCallback(() => {
    console.log('[Driver] 👁️ App returned to foreground - checking GPS tracking', {
      hasVehicle: !!myVehicle,
      isTracking,
      vehicleID: myVehicle?.id,
    })

    // Restart GPS tracking if it stopped
    if (myVehicle && !isTracking) {
      console.log('[Driver] 🔄 GPS tracking stopped - restarting...', myVehicle.id)
      requestPermission().then((granted) => {
        if (granted) {
          console.log('[Driver] ✅ GPS permission granted, restarting tracking...')
          startTracking(myVehicle.id)
        } else {
          console.log('[Driver] ❌ GPS permission denied')
        }
      })
    } else if (isTracking) {
      console.log('[Driver] ✅ GPS tracking still active')
    } else if (!myVehicle) {
      console.log('[Driver] ⚠️ No vehicle assigned to driver')
    }
  }, [myVehicle, isTracking, requestPermission, startTracking])

  useVisibilityRefresh(handleForegroundRefresh)

  // Order status filter state
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter orders based on status and search query
  const filteredOrders = useMemo(() => {
    return myOrders.filter(order => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesPassenger = order.passengerName?.toLowerCase().includes(query)
        const matchesPhone = order.phone?.toLowerCase().includes(query)
        const matchesComment = order.clientComment?.toLowerCase().includes(query)

        // Search in routes if available
        const matchesRoute = order.routes?.some(route =>
          route.pickupAddress?.toLowerCase().includes(query) ||
          route.dropoffAddress?.toLowerCase().includes(query)
        )

        if (!matchesPassenger && !matchesPhone && !matchesComment && !matchesRoute) {
          return false
        }
      }

      return true
    })
  }, [myOrders, statusFilter, searchQuery])

  // Start GPS tracking on mount (always track, regardless of online status)
  useEffect(() => {
    console.log('🔍 GPS tracking effect triggered:', {
      hasVehicle: !!myVehicle,
      vehicleID: myVehicle?.id,
      currentWorker: currentWorker?.id,
      workerVehicleID: currentWorker?.vehicleID,
    })

    if (!myVehicle) {
      console.warn('⚠️ No vehicle assigned, skipping GPS tracking')
      return
    }

    console.log('🟢 Starting GPS tracking for vehicle:', myVehicle.id)

    // Request permission and start tracking
    requestPermission().then((granted) => {
      if (granted) {
        console.log('✅ GPS permission granted, starting tracking...')
        startTracking(myVehicle.id)
      } else {
        console.warn('❌ GPS permission denied, cannot track location')
      }
    })

    // Cleanup on unmount
    return () => {
      console.log('🔴 Stopping GPS tracking on unmount')
      stopTracking()
    }
  }, [myVehicle, requestPermission, startTracking, stopTracking])

  // Handle online/offline toggle
  const handleOnlineToggle = useCallback(async (checked: boolean) => {
    if (!currentWorker) return

    setIsOnline(checked)

    // Update worker status
    updateWorker({
      ...currentWorker,
      isOnline: checked,
    })

    if (checked) {
      console.log('🟢 Driver went online')
    } else {
      console.log('🔴 Driver went offline')
    }
  }, [currentWorker, updateWorker])

  // Update vehicle position when GPS position changes (always, not just when online)
  useEffect(() => {
    const vehicle = myVehicleRef.current
    if (!vehicle || !position || !isTracking) return

    // Throttle GPS updates to every 2 seconds
    const now = Date.now()
    if (now - lastGPSUpdateRef.current < GPS_UPDATE_INTERVAL) {
      console.log('⏱️ Throttling GPS update (too soon):', {
        elapsed: `${(now - lastGPSUpdateRef.current)}ms`,
        required: `${GPS_UPDATE_INTERVAL}ms`,
      })
      return
    }

    // Check if position actually changed (avoid unnecessary updates)
    const lastPos = lastSentPositionRef.current
    if (lastPos && lastPos.lat === position.latitude && lastPos.lng === position.longitude) {
      return // Position hasn't changed, skip update
    }

    // Add current position to history
    positionHistoryRef.current.push({
      lat: position.latitude,
      lng: position.longitude,
      timestamp: now,
    })

    // Keep only last N positions
    if (positionHistoryRef.current.length > POSITION_HISTORY_SIZE) {
      positionHistoryRef.current.shift()
    }

    // GPS NOISE FILTERING & SPEED CALCULATION
    const prevPos = previousPositionRef.current
    if (prevPos) {
      const from = point([prevPos.lng, prevPos.lat])
      const to = point([position.longitude, position.latitude])

      // Calculate distance
      const dist = distance(from, to, { units: 'meters' })

      // Calculate time elapsed (in seconds)
      const timeElapsedSec = (now - lastGPSUpdateRef.current) / 1000

      // Calculate current speed (km/h)
      const speedKmH = (dist / 1000) / (timeElapsedSec / 3600)

      // FILTER GPS NOISE: Reject unrealistic jumps
      // At 5 km/h (walking speed), in 2 seconds you travel ~2.78 meters
      // At 50 km/h (city driving), in 2 seconds you travel ~27.8 meters
      // Reject anything > 50 meters in 2 seconds (= 90 km/h, unrealistic for city)
      const maxRealisticDist = 50 // meters

      if (dist > maxRealisticDist) {
        console.warn('🚫 GPS NOISE detected - rejecting update:', {
          distance: `${dist.toFixed(1)}m`,
          speed: `${speedKmH.toFixed(1)} km/h`,
          maxAllowed: `${maxRealisticDist}m`,
          from: { lat: prevPos.lat, lng: prevPos.lng },
          to: { lat: position.latitude, lng: position.longitude },
        })
        return // Reject this GPS update as noise
      }

      // Update speed
      setCurrentSpeed(speedKmH)

      // Calculate bearing using position history for better accuracy at low speeds
      // Use first and last positions from history (more distance = more accurate bearing)
      if (positionHistoryRef.current.length >= 2) {
        const firstPos = positionHistoryRef.current[0]
        const lastPos = positionHistoryRef.current[positionHistoryRef.current.length - 1]

        const historyFrom = point([firstPos.lng, firstPos.lat])
        const historyTo = point([lastPos.lng, lastPos.lat])
        const totalDist = distance(historyFrom, historyTo, { units: 'meters' })

        // Only update bearing if total movement is significant
        if (totalDist > MIN_BEARING_DISTANCE) {
          const newBearing = bearing(historyFrom, historyTo)
          const timeSpan = (lastPos.timestamp - firstPos.timestamp) / 1000
          const avgSpeed = (totalDist / 1000) / (timeSpan / 3600)

          // Detect sharp turns: if bearing changed > 45 degrees, clear old history
          const bearingChange = Math.abs(newBearing - mapBearing)
          const normalizedBearingChange = bearingChange > 180 ? 360 - bearingChange : bearingChange

          if (normalizedBearingChange > 45 && positionHistoryRef.current.length > 2) {
            console.log('🔄 Sharp turn detected - clearing old history:', {
              bearingChange: `${normalizedBearingChange.toFixed(1)}°`,
              oldBearing: `${mapBearing.toFixed(1)}°`,
              newBearing: `${newBearing.toFixed(1)}°`,
            })
            // Keep only last 2 points to quickly adapt to new direction
            positionHistoryRef.current = positionHistoryRef.current.slice(-2)
          }

          console.log('🧭 Bearing & Speed updated (from history):', {
            from: { lat: firstPos.lat, lng: firstPos.lng },
            to: { lat: lastPos.lat, lng: lastPos.lng },
            totalDistance: `${totalDist.toFixed(1)}m`,
            timeSpan: `${timeSpan.toFixed(1)}s`,
            avgSpeed: `${avgSpeed.toFixed(1)} km/h`,
            bearing: `${newBearing.toFixed(1)}°`,
            historyPoints: positionHistoryRef.current.length,
          })
          setMapBearing(newBearing)
        } else {
          console.log('⏸️ Minimal movement in history:', {
            totalDistance: `${totalDist.toFixed(1)}m`,
            historyPoints: positionHistoryRef.current.length,
          })
        }
      } else {
        console.log('⏳ Building position history:', {
          currentPoints: positionHistoryRef.current.length,
          needed: 2,
        })
      }
    }

    // Update previous position for next calculation
    previousPositionRef.current = {
      lat: position.latitude,
      lng: position.longitude,
    }

    // Update last sent position
    lastSentPositionRef.current = {
      lat: position.latitude,
      lng: position.longitude,
    }

    // Update throttle timestamp
    lastGPSUpdateRef.current = now

    // BATCHING MODE vs IMMEDIATE MODE
    if (batchingEnabled) {
      // === BATCHING MODE: Accumulate and send in batches ===
      // Add GPS point to batch
      gpsBatchRef.current.push({
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: new Date().toISOString(),
      })

      console.log('📦 Added GPS point to batch:', {
        batchSize: gpsBatchRef.current.length,
        maxSize: BATCH_SIZE,
        timeSinceLastBatch: `${((now - lastBatchSentRef.current) / 1000).toFixed(1)}s`,
        maxInterval: `${BATCH_INTERVAL / 1000}s`,
      })

      // Send batch if we have enough points OR enough time has passed
      const shouldSendBatch =
        gpsBatchRef.current.length >= BATCH_SIZE ||
        (now - lastBatchSentRef.current) >= BATCH_INTERVAL

      if (shouldSendBatch && gpsBatchRef.current.length > 0) {
      const batch = [...gpsBatchRef.current]
      gpsBatchRef.current = [] // Clear batch
      lastBatchSentRef.current = now

      console.log('📤 Sending GPS batch to /api/transport/location/batch:', {
        vehicleID: vehicle.id,
        pointCount: batch.length,
        firstTimestamp: batch[0].timestamp,
        lastTimestamp: batch[batch.length - 1].timestamp,
      })

      fetch('/api/transport/location/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleID: vehicle.id,
          locations: batch,
        }),
      })
        .then(res => {
          console.log('📥 Batch response status:', res.status, res.statusText)
          return res.json()
        })
        .then(data => {
          console.log('📥 Batch response data:', data)

          if (data.success) {
            const newLat = data.currentLat || position.latitude
            const newLng = data.currentLng || position.longitude

            console.log('✅ Vehicle position updated (batch):', {
              vehicleID: vehicle.id,
              processedCount: data.processedCount,
              final: { lat: newLat, lng: newLng },
              wasSnapped: data.wasSnapped,
              timestamp: data.lastLocationUpdate,
            })

            // Start smooth interpolation from current position to new position
            // Use a callback to get the most recent localVehicle state
            setLocalVehicle(prev => {
              const currentPos = prev && prev.currentLat && prev.currentLng
                ? { lat: prev.currentLat, lng: prev.currentLng }
                : { lat: newLat, lng: newLng } // First update - no interpolation

              if (currentPos.lat !== newLat || currentPos.lng !== newLng) {
                console.log('🎬 Starting interpolation:', {
                  from: currentPos,
                  to: { lat: newLat, lng: newLng },
                  duration: `${GPS_UPDATE_INTERVAL}ms`,
                })

                // Setup interpolation parameters - triggers animation useEffect
                setInterpolationParams({
                  startPos: currentPos,
                  endPos: { lat: newLat, lng: newLng },
                  startTime: Date.now(),
                  duration: 2000, // 2 seconds to match GPS update interval
                })
              } else {
                console.log('ℹ️ Position unchanged, skipping interpolation')
              }

              // Update lastLocationUpdate timestamp immediately
              return prev ? {
                ...prev,
                lastLocationUpdate: new Date(data.lastLocationUpdate),
              } : null
            })
          } else {
            console.warn('⚠️ Server returned success=false (batch):', data)
          }
        })
        .catch(error => {
          console.error('❌ Failed to update vehicle location (batch):', error)
        })
      }
    } else {
      // === IMMEDIATE MODE: Send each GPS update immediately ===
      console.log('📤 Sending GPS immediately to /api/transport/location:', {
        vehicleID: vehicle.id,
        latitude: position.latitude,
        longitude: position.longitude,
      })

      fetch('/api/transport/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleID: vehicle.id,
          latitude: position.latitude,
          longitude: position.longitude,
        }),
      })
        .then(res => {
          console.log('📥 Response status:', res.status, res.statusText)
          return res.json()
        })
        .then(data => {
          console.log('📥 Response data:', data)

          if (data.success) {
            const newLat = data.currentLat || position.latitude
            const newLng = data.currentLng || position.longitude

            console.log('✅ Vehicle position updated (immediate):', {
              vehicleID: vehicle.id,
              original: { lat: position.latitude, lng: position.longitude },
              final: { lat: newLat, lng: newLng },
              wasSnapped: data.wasSnapped,
              timestamp: data.lastLocationUpdate,
            })

            // Add point to buffer
            gpsBufferRef.current.push({
              lat: newLat,
              lng: newLng,
              timestamp: Date.now(),
            })

            console.log('📥 GPS point added to buffer:', {
              bufferSize: gpsBufferRef.current.length,
              bufferReady: isBufferReadyRef.current,
              point: { lat: newLat, lng: newLng },
            })

            // Wait until we have at least BUFFER_SIZE points before starting animation
            if (!isBufferReadyRef.current && gpsBufferRef.current.length < BUFFER_SIZE) {
              console.log('⏳ Buffering GPS points... waiting for', BUFFER_SIZE - gpsBufferRef.current.length, 'more points')

              // Set initial position without animation
              setLocalVehicle(prev => prev ? {
                ...prev,
                currentLat: newLat,
                currentLng: newLng,
                lastLocationUpdate: new Date(data.lastLocationUpdate),
              } : null)

              return
            }

            // Buffer is ready - start continuous animation
            if (!isBufferReadyRef.current) {
              console.log('✅ Buffer ready - starting continuous animation with', gpsBufferRef.current.length, 'points')
              isBufferReadyRef.current = true
            }

            // Get the next point to animate to (oldest in buffer)
            const targetPoint = gpsBufferRef.current.shift()! // Remove first point

            // Calculate dynamic interpolation duration based on time since last GPS update
            const currentTime = Date.now()
            const timeSinceLastUpdate = lastGPSTimestampRef.current > 0
              ? currentTime - lastGPSTimestampRef.current
              : GPS_UPDATE_INTERVAL

            // Use actual time between GPS points, but cap at 10 seconds max
            const interpolationDuration = Math.min(timeSinceLastUpdate, 10000)
            lastGPSTimestampRef.current = currentTime

            // Start smooth interpolation from current position to target point
            setLocalVehicle(prev => {
              const currentPos = prev && prev.currentLat && prev.currentLng
                ? { lat: prev.currentLat, lng: prev.currentLng }
                : { lat: targetPoint.lat, lng: targetPoint.lng }

              if (currentPos.lat !== targetPoint.lat || currentPos.lng !== targetPoint.lng) {
                console.log('🎬 Starting interpolation:', {
                  from: currentPos,
                  to: { lat: targetPoint.lat, lng: targetPoint.lng },
                  duration: `${interpolationDuration}ms`,
                  timeSinceLastGPS: `${timeSinceLastUpdate}ms`,
                  bufferRemaining: gpsBufferRef.current.length,
                })

                setInterpolationParams({
                  startPos: currentPos,
                  endPos: { lat: targetPoint.lat, lng: targetPoint.lng },
                  startTime: Date.now(),
                  duration: interpolationDuration, // Dynamic duration based on GPS timing
                })
              } else {
                console.log('ℹ️ Position unchanged, skipping interpolation')
              }

              return prev ? {
                ...prev,
                lastLocationUpdate: new Date(data.lastLocationUpdate),
              } : null
            })
          } else {
            console.warn('⚠️ Server returned success=false (immediate):', data)
          }
        })
        .catch(error => {
          console.error('❌ Failed to update vehicle location (immediate):', error)
        })
    }
  }, [position, isTracking, batchingEnabled]) // Added batchingEnabled dependency

  const handleOrderSelect = useCallback((orderId: string) => {
    setSelectedOrderId(prev => orderId === prev ? null : orderId)
  }, [])

  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    // Update will be handled by SchedulingContext
    console.log('Order updated:', updatedOrder)
  }, [])

  const handleRoutePointClick = useCallback((orderId: string, lat: number, lng: number, address: string) => {
    // Auto-select the order when clicking on route point
    setSelectedOrderId(orderId)
  }, [])

  // Show warning if worker doesn't have a vehicle assigned
  if (!myVehicle) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold text-warning-800 mb-2">
            Транспорт не назначен
          </h2>
          <p className="text-warning-700">
            Обратитесь к диспетчеру для назначения транспортного средства.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Geolocation Status Banner */}
      {permission === 'denied' && (
        <div className="shrink-0 bg-danger-50 border-b border-danger-200 px-4 py-2 text-center">
          <p className="text-sm text-danger-700">
            ⚠️ Геолокация заблокирована. Разрешите доступ к местоположению в настройках браузера.
          </p>
        </div>
      )}
      {permission === 'unsupported' && (
        <div className="shrink-0 bg-warning-50 border-b border-warning-200 px-4 py-2 text-center">
          <p className="text-sm text-warning-700">
            ⚠️ Ваш браузер не поддерживает геолокацию.
          </p>
        </div>
      )}
      {permission === 'granted' && isTracking && !position && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-2 text-center">
          <p className="text-sm text-blue-700">
            📡 Поиск GPS сигнала...
          </p>
        </div>
      )}

      {/* Online/Offline Toggle Header */}
      <div className="shrink-0 bg-default-50 border-b border-default-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-default-700">
              {currentWorker?.name} {currentWorker?.surname}
            </span>
            <span className="text-xs text-default-500">
              {myVehicle.plateNumber} • {myVehicle.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Batching toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={batchingEnabled}
              onChange={(e) => setBatchingEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-default-600">
              Batching {batchingEnabled ? '✅' : '❌'}
            </span>
          </label>

          {/* Test GPS movement button */}
          <button
            onClick={async () => {
              // Load test route from JSON file
              console.log('[Test] 🧪 Loading test route...')

              // 🛠️ FIX: Reset all GPS state before starting test route
              console.log('[Test] 🔄 Resetting GPS state...')
              gpsBufferRef.current = []
              isBufferReadyRef.current = false
              lastGPSTimestampRef.current = 0
              currentInterpolatedPosRef.current = null // Reset interpolated position ref
              isInterpolatingRef.current = false // Reset interpolation state
              setInterpolationParams({
                startPos: null,
                endPos: null,
                startTime: null,
                duration: GPS_UPDATE_INTERVAL,
              })
              console.log('[Test] ✅ GPS state reset complete')

              try {
                const response = await fetch('/test-routes/burgstrasse-route.json')
                const route = await response.json()

                console.log('[Test] 🧪 Test route loaded:', {
                  name: route.name,
                  points: route.points.length,
                  speedKmh: route.speedKmh,
                })

                // Convert route points to coordinate array for polyline display
                const routeCoords: Array<[number, number]> = route.points.map((p: any) => [p.lat, p.lng])
                setTestRouteCoordinates(routeCoords)
                console.log('[Test] 🗺️ Route polyline set with', routeCoords.length, 'points')

                let currentIndex = 0
                const updateInterval = route.updateIntervalMs || 2000
                let lastTestPos: { lat: number; lng: number } | null = null
                let lastTestTime = Date.now()

                const testInterval = setInterval(() => {
                  // 🛠️ FIX: Capture interval fire time (not fetch completion time!)
                  const intervalFireTime = Date.now()
                  if (currentIndex >= route.points.length) {
                    clearInterval(testInterval)
                    setTestRouteCoordinates(null) // Clear route from map
                    console.log('[Test] 🧪 ✅ Test route complete! Route cleared from map.')
                    return
                  }

                  const currentPoint = route.points[currentIndex]
                  console.log(`[Test] 🧪 [${currentIndex + 1}/${route.points.length}] GPS:`, {
                    lat: currentPoint.lat,
                    lng: currentPoint.lng,
                  })

                  // Calculate bearing and speed from previous point
                  if (lastTestPos) {
                    const from = point([lastTestPos.lng, lastTestPos.lat])
                    const to = point([currentPoint.lng, currentPoint.lat])
                    const dist = distance(from, to, { units: 'meters' })
                    const now = Date.now()
                    const timeElapsedSec = (now - lastTestTime) / 1000
                    const speedKmH = (dist / 1000) / (timeElapsedSec / 3600)

                    if (dist > 5) {
                      const newBearing = bearing(from, to)
                      console.log('[Test] 🧪 🧭 Bearing & Speed:', {
                        distance: `${dist.toFixed(1)}m`,
                        speed: `${speedKmH.toFixed(1)} km/h`,
                        bearing: `${newBearing.toFixed(1)}°`,
                      })
                      setMapBearing(newBearing)
                      setCurrentSpeed(speedKmH)
                    }

                    lastTestTime = now
                  }

                  lastTestPos = { lat: currentPoint.lat, lng: currentPoint.lng }

                  // Trigger the same logic as real GPS by sending to server
                  if (localVehicle) {
                    fetch('/api/transport/location', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        vehicleID: localVehicle.id,
                        latitude: currentPoint.lat,
                        longitude: currentPoint.lng,
                      }),
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          console.log(`[Test] 🧪 ✅ Point ${currentIndex + 1} updated, wasSnapped: ${data.wasSnapped}`)

                          const newLat = data.currentLat || currentPoint.lat
                          const newLng = data.currentLng || currentPoint.lng

                          // 🛠️ FIX: Use intervalFireTime for consistent timing (not fetch completion time!)
                          const fetchCompleteTime = Date.now()
                          const networkLatency = fetchCompleteTime - intervalFireTime

                          console.log('[Test] 🧪 📦 Point received:', {
                            index: currentIndex,
                            networkLatency: `${networkLatency}ms`,
                            wasSnapped: data.wasSnapped,
                          })

                          // Use SAME buffering logic as real GPS
                          gpsBufferRef.current.push({
                            lat: newLat,
                            lng: newLng,
                            timestamp: intervalFireTime, // 🛠️ FIX: Use interval fire time, not fetch completion!
                          })

                          console.log('[Test] 🧪 📥 GPS point added to buffer:', {
                            bufferSize: gpsBufferRef.current.length,
                            bufferReady: isBufferReadyRef.current,
                          })

                          // Wait until we have at least BUFFER_SIZE points before starting animation
                          if (!isBufferReadyRef.current && gpsBufferRef.current.length < BUFFER_SIZE) {
                            console.log('[Test] 🧪 ⏳ Buffering GPS points... waiting for', BUFFER_SIZE - gpsBufferRef.current.length, 'more points')

                            // Set initial position without animation
                            // 🛠️ FIX: Update interpolated position ref during buffering
                            currentInterpolatedPosRef.current = { lat: newLat, lng: newLng }

                            setLocalVehicle(prev => prev ? {
                              ...prev,
                              currentLat: newLat,
                              currentLng: newLng,
                              lastLocationUpdate: new Date(data.lastLocationUpdate),
                            } : null)

                            return
                          }

                          // Buffer is ready - start continuous animation
                          if (!isBufferReadyRef.current) {
                            console.log('[Test] 🧪 ✅ Buffer ready - starting continuous animation with', gpsBufferRef.current.length, 'points')
                            isBufferReadyRef.current = true
                          }

                          // 🛠️ FIX: Don't start new interpolation if current one is still running!
                          if (isInterpolatingRef.current) {
                            console.log('[Test] 🧪 ⏭️ Interpolation already running - point queued in buffer:', {
                              bufferSize: gpsBufferRef.current.length,
                              currentlyInterpolating: true,
                            })
                            return // Wait for current interpolation to complete
                          }

                          // Get the next point to animate to (oldest in buffer)
                          const targetPoint = gpsBufferRef.current.shift()! // Remove first point

                          // 🛠️ FIX: Calculate dynamic interpolation duration based on target point timestamp
                          const timeSinceLastUpdate = lastGPSTimestampRef.current > 0 && targetPoint.timestamp
                            ? targetPoint.timestamp - lastGPSTimestampRef.current
                            : GPS_UPDATE_INTERVAL

                          const interpolationDuration = Math.min(Math.max(timeSinceLastUpdate, 100), 10000) // Clamp between 100ms and 10s
                          lastGPSTimestampRef.current = targetPoint.timestamp // 🛠️ FIX: Save target point timestamp!

                          // 🛠️ FIX: Get current position from ref (updated by interpolation animation)
                          // Fallback chain: ref → localVehicle → targetPoint
                          const currentPos = currentInterpolatedPosRef.current
                            ? { lat: currentInterpolatedPosRef.current.lat, lng: currentInterpolatedPosRef.current.lng }
                            : localVehicle && localVehicle.currentLat && localVehicle.currentLng
                            ? { lat: localVehicle.currentLat, lng: localVehicle.currentLng }
                            : { lat: targetPoint.lat, lng: targetPoint.lng }

                          // 🛠️ FIX: Call setInterpolationParams OUTSIDE setLocalVehicle!
                          if (currentPos.lat !== targetPoint.lat || currentPos.lng !== targetPoint.lng) {
                            console.log('[Test] 🧪 🎬 Starting interpolation:', {
                              from: currentPos,
                              to: { lat: targetPoint.lat, lng: targetPoint.lng },
                              duration: `${interpolationDuration}ms`,
                              timeSinceLastUpdate: `${timeSinceLastUpdate}ms`,
                              bufferRemaining: gpsBufferRef.current.length,
                              expectedDuration: `${updateInterval}ms`, // Should match this!
                            })

                            // 🔍 DIAGNOSTIC: Log what we're about to set and what dependencies would be
                            console.log('[Test] 🔍 setInterpolationParams will be called with:', {
                              startPos: currentPos,
                              endPos: { lat: targetPoint.lat, lng: targetPoint.lng },
                              startTime: Date.now(),
                              duration: interpolationDuration,
                              prevStartPosLat: interpolationParams.startPos?.lat,
                              prevStartPosLng: interpolationParams.startPos?.lng,
                              prevEndPosLat: interpolationParams.endPos?.lat,
                              prevEndPosLng: interpolationParams.endPos?.lng,
                              prevDuration: interpolationParams.duration,
                              willTriggerUseEffect:
                                currentPos.lat !== interpolationParams.startPos?.lat ||
                                currentPos.lng !== interpolationParams.startPos?.lng ||
                                targetPoint.lat !== interpolationParams.endPos?.lat ||
                                targetPoint.lng !== interpolationParams.endPos?.lng ||
                                interpolationDuration !== interpolationParams.duration
                            })

                            setInterpolationParams({
                              startPos: currentPos,
                              endPos: { lat: targetPoint.lat, lng: targetPoint.lng },
                              startTime: Date.now(),
                              duration: interpolationDuration,
                            })
                          }

                          // Update localVehicle state
                          setLocalVehicle(prev => {
                            return prev ? {
                              ...prev,
                              lastLocationUpdate: new Date(data.lastLocationUpdate),
                            } : null
                          })
                        }
                      })
                      .catch(err => console.error('[Test] 🧪 ❌ Error:', err))
                  }

                  currentIndex++
                }, updateInterval)

                console.log(`[Test] 🧪 Starting route playback (${route.points.length} points, ${updateInterval}ms interval)`)
              } catch (error) {
                console.error('[Test] 🧪 ❌ Failed to load test route:', error)
              }
            }}
            className="px-3 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600"
          >
            🧪 Test Route
          </button>

          <span className="text-sm text-default-600">
            {isOnline ? 'На линии' : 'Не на линии'}
          </span>
          <Switch
            isSelected={isOnline}
            onChange={handleOnlineToggle}
            size="sm"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex overflow-hidden ${isPortrait ? 'flex-col gap-1' : 'pl-1 flex-row gap-1'}`}>
        {/* List/Sidebar Section - Portrait: top (auto height), Landscape: right */}
        <div className={`shrink-0 ${
          isPortrait
            ? 'w-full'
            : 'order-2'
        }`}>
          <List
            // No appointments for driver view
            appointments={[]}
            selectedAppointmentId={null}
            onAppointmentSelect={() => {}}
            // Only driver's orders
            orders={filteredOrders}
            vehicles={localVehicle ? [localVehicle] : []}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
            onOrderUpdate={handleOrderUpdate}
            onRoutePointClick={handleRoutePointClick}
            // Fixed to 'orders' tab
            activeTab="orders"
            onTabChange={() => {}} // No tab switching in driver mode
            // Collapse state (could be added later)
            isCollapsed={false}
            onCollapsedChange={() => {}}
            // Pass filter state and handlers
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            // Driver mode flag
            isDriverMode={true}
          />
        </div>

        {/* Map Section - Portrait: flex-1 (takes remaining space), Landscape: left (dynamic width) */}
        <div
          className={`relative flex-1 ${
            isPortrait
              ? 'w-full order-2'
              : 'order-1'
          }`}
        >
          <Map
            // No appointments for driver
            appointments={[]}
            selectedAppointmentId={null}
            onAppointmentSelect={() => {}}
            // Only driver's filtered orders
            orders={filteredOrders}
            // Only driver's vehicle (with live GPS position)
            vehicles={localVehicle ? [localVehicle] : []}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
            routePointFocus={null}
            // Driver mode flag (will be added to Map.tsx)
            isDriverMode={true}
            currentDriverID={currentWorker?.id}
            // Map rotation (bearing) for navigation
            mapBearing={mapBearing}
            // Current speed display
            currentSpeed={currentSpeed}
            // Navigation route polyline
            navigationRoute={testRouteCoordinates}
          />
        </div>
      </div>
    </div>
  )
}
