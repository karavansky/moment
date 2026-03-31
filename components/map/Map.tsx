'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ReactDOMServer from 'react-dom/server'
import type { Order, Vehicle } from '@/types/transport'
import type { AppointmentWithClient } from '@/contexts/SchedulingContext'
import { Package, Navigation, CheckCircle2, MapPin, Car, ArrowBigUp } from 'lucide-react'
import RoutePolyline from '../dispatcher/RoutePolyline'
import { LogoMoment } from '@/components/icons'
import { useLanguage } from '@/hooks/useLanguage'
import { useTranslation } from '@/components/Providers'
import { createRouteMarkerIcon, MarkerLegendItem, MARKER_COLORS } from './RouteMarkers'
import { PersistentPolyline } from './PersistentPolyline'

// Import leaflet-rotate on client side only
if (typeof window !== 'undefined') {
  require('leaflet-rotate')
  console.log('📦 leaflet-rotate required')
}

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Timer component for appointments
const ElapsedTimer = ({ openedAt }: { openedAt: Date }) => {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [openedAt])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const format = (n: number) => n.toString().padStart(2, '0')

  return (
    <span className="font-mono text-green-600">
      {hours > 0 && `${format(hours)}:`}{format(minutes)}:{format(seconds)}
    </span>
  )
}

// Date/time formatters
const createDateFormatter = (locale: string) => new Intl.DateTimeFormat(locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const createTimeFormatter = (locale: string) => new Intl.DateTimeFormat(locale, {
  hour: '2-digit',
  minute: '2-digit',
})

// Appointment icon with LogoMoment
const createAppointmentIcon = () => {
  const size = 56
  const iconHtml = ReactDOMServer.renderToString(<LogoMoment size={size} />)

  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.84],
    popupAnchor: [0, -size * 0.75],
  })
}

// Create vehicle icon based on status (for dispatcher view - car with status color)
const createVehicleIcon = (status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE') => {
  const fillColor = status === 'ACTIVE' ? '#22c55e' : status === 'INACTIVE' ? '#94a3b8' : '#f59e0b'

  const iconHtml = ReactDOMServer.renderToString(
    <div style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
      <Car
        size={40}
        fill={fillColor}
        stroke="#000000"
        strokeWidth={1.5}
      />
    </div>
  )

  return L.divIcon({
    className: 'custom-marker',
    html: iconHtml,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

// Create driver arrow icon with speed (for driver view - blue arrow pointing up)
const createDriverArrowIcon = (speed?: number) => {
  const iconHtml = ReactDOMServer.renderToString(
    <div style={{
      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <ArrowBigUp
        size={40}
        fill={MARKER_COLORS.pickup}
        stroke="#000000"
        strokeWidth={1.5}
      />
      {speed !== undefined && speed > 0 && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          marginTop: '-8px',
          whiteSpace: 'nowrap',
        }}>
          {Math.round(speed)} km/h
        </div>
      )}
    </div>
  )

  return L.divIcon({
    className: 'custom-marker',
    html: iconHtml,
    iconSize: speed !== undefined && speed > 0 ? [60, 60] : [40, 40],
    iconAnchor: speed !== undefined && speed > 0 ? [30, 30] : [20, 20],
  })
}

interface MapProps {
  // For orders (transport/dispatcher)
  orders?: Order[]
  vehicles?: Vehicle[]
  selectedOrderId?: string | null
  onOrderSelect?: (orderId: string) => void

  // For appointments (scheduling)
  appointments?: AppointmentWithClient[]
  selectedAppointmentId?: string | null
  onAppointmentSelect?: (appointmentId: string) => void

  // Optional: Force specific center and zoom (e.g., for "show on map" button)
  forceCenter?: [number, number]
  forceZoom?: number

  // Optional: Focus on specific route point
  routePointFocus?: {
    orderId: string
    lat: number
    lng: number
    address: string
  } | null

  // Driver mode - shows only driver's location and assigned orders
  isDriverMode?: boolean
  currentDriverID?: string

  // Map rotation (bearing) for navigation mode
  mapBearing?: number

  // Current speed (km/h) for driver mode
  currentSpeed?: number

  // Navigation route coordinates for driver mode
  navigationRoute?: Array<[number, number]> | null
  // Navigation route ID - unique for each route to force polyline recreation
  navigationRouteId?: string | null
}

// Appointment Marker Component
function AppointmentMarker({
  apt,
  icon,
  isSelected,
  onSelect,
  timeFormatter,
  t,
}: {
  apt: AppointmentWithClient
  icon: L.DivIcon
  isSelected: boolean
  onSelect: (id: string) => void
  timeFormatter: Intl.DateTimeFormat
  t: (key: string) => string
}) {
  const markerRef = useRef<L.Marker>(null)

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  return (
    <Marker
      ref={markerRef}
      position={[apt.client.latitude, apt.client.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(apt.id),
      }}
    >
      {apt.isOpen && apt.openedAt && (
        <Tooltip permanent direction="top" offset={[0, -40]} className="timer-tooltip">
          <ElapsedTimer openedAt={apt.openedAt} />
        </Tooltip>
      )}
      <Popup>
        <div className="text-sm p-1 min-w-50">
          <div className="font-semibold text-gray-900 mb-2">
            {apt.client.name} {apt.client.surname}
          </div>
          <div className="text-gray-600 mb-2">
            {apt.client.street} {apt.client.houseNumber}
            {apt.client.apartment && `, ${apt.client.apartment}`}
            <br />
            {apt.client.postalCode} {apt.client.city}
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('map.time')}</span>
              <span className="font-medium">
                {apt.startTime && timeFormatter.format(new Date(apt.startTime))} - {apt.endTime && timeFormatter.format(new Date(apt.endTime))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('map.duration')}</span>
              <span>{apt.duration} {t('map.min')}</span>
            </div>
            {apt.isOpen && apt.openedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('map.current')}</span>
                <ElapsedTimer openedAt={apt.openedAt} />
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

// Order Marker Component (for pickup/dropoff)
function OrderMarker({
  position,
  icon,
  isSelected,
  isFocused,
  hasFocusedPoint,
  onSelect,
  children,
}: {
  position: [number, number]
  icon: L.DivIcon
  isSelected: boolean
  isFocused?: boolean
  hasFocusedPoint?: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  const markerRef = useRef<L.Marker>(null)
  const [shouldShowPopup, setShouldShowPopup] = useState(false)

  useEffect(() => {
    if (isFocused) {
      // Эта точка сфокусирована - показываем ТОЛЬКО её
      setShouldShowPopup(true)
    } else if (hasFocusedPoint) {
      // Есть другая сфокусированная точка в этом заказе - НЕ показываем эту
      setShouldShowPopup(false)
    } else if (isSelected) {
      // Заказ выбран, но нет сфокусированных точек - показываем все точки
      setShouldShowPopup(true)
    } else {
      setShouldShowPopup(false)
    }
  }, [isSelected, isFocused, hasFocusedPoint])

  useEffect(() => {
    if (shouldShowPopup && markerRef.current) {
      // Открываем popup с небольшой задержкой
      const timer = setTimeout(() => {
        markerRef.current?.openPopup()
      }, isFocused ? 300 : 100) // Больше задержка для focused точки
      return () => clearTimeout(timer)
    } else if (!shouldShowPopup && markerRef.current) {
      // Закрываем popup когда не нужно показывать
      markerRef.current.closePopup()
    }
  }, [shouldShowPopup, isFocused])

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{
        click: onSelect,
      }}
    >
      {children}
    </Marker>
  )
}

// Component to handle map rotation (bearing) for navigation
function MapRotation({ bearing }: { bearing?: number }) {
  const map = useMap()
  const animationRef = useRef<number | null>(null)
  const currentBearingRef = useRef<number>(0)

  // Check if rotation is supported on mount
  useEffect(() => {
    const rotateMap = map as any
    if (typeof rotateMap.setBearing === 'function') {
      console.log('✅ Map rotation API enabled (leaflet-rotate)')

      // Enable touch rotation
      if (rotateMap.touchRotate) {
        rotateMap.touchRotate.enable()
        console.log('✅ Touch rotation enabled')
      }

      // Get initial bearing
      currentBearingRef.current = rotateMap.getBearing ? rotateMap.getBearing() : 0
    } else {
      console.error('❌ setBearing not found - leaflet-rotate not loaded!')
      console.log('Available methods:', Object.keys(rotateMap).filter(k => k.includes('bear') || k.includes('rotat')))
    }
  }, [map])

  // Animate bearing changes smoothly
  useEffect(() => {
    if (bearing === undefined) return

    const rotateMap = map as any
    if (typeof rotateMap.setBearing !== 'function') return

    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    // IMPORTANT: Invert bearing so movement direction points upward
    const targetBearing = -bearing
    const startBearing = currentBearingRef.current

    // Calculate shortest rotation path (handle 360° wrap)
    let diff = targetBearing - startBearing
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360

    const duration = 1000 // 1 second animation
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out-quad function for smooth deceleration
      const easeOutQuad = (t: number) => t * (2 - t)
      const easedProgress = easeOutQuad(progress)

      const newBearing = startBearing + diff * easedProgress
      rotateMap.setBearing(newBearing)
      currentBearingRef.current = newBearing

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        animationRef.current = null
        console.log('🧭 Map rotation complete:', {
          movementBearing: bearing.toFixed(1) + '°',
          mapRotation: targetBearing.toFixed(1) + '°',
        })
      }
    }

    animate()

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [bearing, map])

  return null
}

// Component to handle map centering and bounds
function MapController({
  center,
  zoom,
  orders = [],
  appointments = [],
  vehicles = [],
  selectedOrderId,
  selectedAppointmentId,
  isDriverMode = false,
  mapBearing,
}: {
  center?: [number, number]
  zoom?: number
  orders?: Order[]
  appointments?: AppointmentWithClient[]
  vehicles?: Vehicle[]
  selectedOrderId?: string | null
  selectedAppointmentId?: string | null
  isDriverMode?: boolean
  mapBearing?: number
}) {
  const map = useMap()

  // Create stable references for positions count
  const ordersCount = orders.length
  const appointmentsCount = appointments.length
  const prevOrdersCount = useRef(ordersCount)
  const prevAppointmentsCount = useRef(appointmentsCount)

  // Watch for container resize and invalidate map size
  useEffect(() => {
    const container = map.getContainer()

    const resizeObserver = new ResizeObserver(() => {
      // Invalidate size when container resizes
      map.invalidateSize()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [map])

  useEffect(() => {
    // Initial invalidation
    map.invalidateSize()

    // If we have a specific center/zoom, use it
    if (center && zoom !== undefined) {
      // Explicit zoom provided - use setView (for "show on map" buttons)
      map.setView(center, zoom, { animate: true, duration: 0.5 })
      return
    } else if (center) {
      // Only center provided - pan without changing zoom (for marker selection)
      map.panTo(center, { animate: true, duration: 0.5 })
      return
    }

    // Only fit bounds when data actually changes (not on every re-render)
    const dataChanged = ordersCount !== prevOrdersCount.current || appointmentsCount !== prevAppointmentsCount.current

    if (!dataChanged) {
      // Data unchanged, skip fitBounds to preserve user's zoom level
      return
    }

    prevOrdersCount.current = ordersCount
    prevAppointmentsCount.current = appointmentsCount

    const allPositions: [number, number][] = []

    // Add appointment positions
    appointments.forEach(apt => {
      if (apt.client.latitude && apt.client.longitude) {
        allPositions.push([apt.client.latitude, apt.client.longitude])
      }
    })

    // Add order positions
    orders.forEach(order => {
      if (order.pickupLat && order.pickupLng) {
        allPositions.push([order.pickupLat, order.pickupLng])
      }
      if (order.dropoffLat && order.dropoffLng) {
        allPositions.push([order.dropoffLat, order.dropoffLng])
      }
    })

    if (allPositions.length > 0) {
      const bounds = L.latLngBounds(allPositions)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }

    // Additional delayed invalidation for safety
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => clearTimeout(timer)
  }, [map, center, zoom, ordersCount, appointmentsCount])

  // Handle driver mode - center on vehicle with offset
  const driverModeInitialized = useRef(false)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (isDriverMode && vehicles.length > 0) {
      const vehicle = vehicles[0] // Driver has only one vehicle

      // Set initial zoom for driver mode (only once)
      if (!driverModeInitialized.current && vehicle.currentLat && vehicle.currentLng) {
        const mapSize = map.getSize()
        const offsetY = mapSize.y * -0.3 // Negative to shift up

        const targetPoint = map.project([vehicle.currentLat, vehicle.currentLng], 18)
        targetPoint.y -= offsetY
        const targetLatLng = map.unproject(targetPoint, 18)

        map.setView(targetLatLng, 18, { animate: false })
        driverModeInitialized.current = true
        console.log('🎯 Driver mode initialized: zoom 18, vehicle at 80% from top')
      }

      // Continuous tracking loop using requestAnimationFrame
      const trackVehicle = () => {
        if (!vehicle.currentLat || !vehicle.currentLng) {
          animationFrameRef.current = requestAnimationFrame(trackVehicle)
          return
        }

        const mapSize = map.getSize()

        // Get current vehicle position in screen pixels
        const vehiclePoint = map.latLngToContainerPoint([vehicle.currentLat, vehicle.currentLng])

        // Calculate where vehicle SHOULD be (center X, 80% Y)
        const targetX = mapSize.x / 2
        const targetY = mapSize.y * 0.8

        // Calculate how much we need to move the map
        const deltaX = vehiclePoint.x - targetX
        const deltaY = vehiclePoint.y - targetY

        // Only pan if delta is significant (> 1 pixel)
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          map.panBy([deltaX, deltaY], { animate: false, noMoveStart: true })
        }

        animationFrameRef.current = requestAnimationFrame(trackVehicle)
      }

      animationFrameRef.current = requestAnimationFrame(trackVehicle)

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    } else {
      driverModeInitialized.current = false
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isDriverMode, vehicles, map])

  // Handle selected order - fit bounds to show entire route
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find((o) => o.id === selectedOrderId)
      if (selectedOrder && selectedOrder.pickupLat && selectedOrder.pickupLng &&
          selectedOrder.dropoffLat && selectedOrder.dropoffLng) {
        // Fit bounds to show entire route (pickup + dropoff)
        const bounds = L.latLngBounds([
          [selectedOrder.pickupLat, selectedOrder.pickupLng],
          [selectedOrder.dropoffLat, selectedOrder.dropoffLng]
        ])
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
          duration: 0.5
        })
      }
    }
  }, [selectedOrderId, orders, map])

  return (
    <>
      {/* Map rotation for driver navigation mode */}
      {isDriverMode && mapBearing !== undefined && (
        <MapRotation bearing={mapBearing} />
      )}
    </>
  )
}

const Map = React.memo(function Map({
  orders = [],
  vehicles = [],
  selectedOrderId = null,
  onOrderSelect,
  appointments = [],
  selectedAppointmentId = null,
  onAppointmentSelect,
  forceCenter,
  forceZoom,
  routePointFocus,
  isDriverMode = false,
  currentDriverID,
  mapBearing,
  currentSpeed,
  navigationRoute,
  navigationRouteId,
}: MapProps) {
  const lang = useLanguage()
  const { t } = useTranslation()
  const timeFormatter = useMemo(() => createTimeFormatter(lang), [lang])
  const appointmentIcon = useRef(createAppointmentIcon())

  // Create route marker icons on client side only (64px = 32px * 2)
  const pickupIcon = useMemo(() => createRouteMarkerIcon('pickup', 56), [])
  const intermediateIcon = useMemo(() => createRouteMarkerIcon('intermediate', 56), [])
  const dropoffIcon = useMemo(() => createRouteMarkerIcon('dropoff', 56), [])

  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>()
  const [mapZoom, setMapZoom] = useState<number | undefined>()
  const prevSelectedOrderId = useRef<string | null>(null)
  const prevSelectedAppointmentId = useRef<string | null>(null)
  const [focusedRoutePoint, setFocusedRoutePoint] = useState<{ orderId: string; lat: number; lng: number } | null>(null)

  // Apply forced center/zoom (e.g., from "show on map" button)
  useEffect(() => {
    if (forceCenter) {
      setMapCenter(forceCenter)
      setMapZoom(forceZoom) // Will be undefined if not provided
    }
  }, [forceCenter, forceZoom])

  // Handle route point focus from List component
  useEffect(() => {
    if (routePointFocus) {
      setMapCenter([routePointFocus.lat, routePointFocus.lng])
      setMapZoom(16) // Zoom in closer for specific point
      setFocusedRoutePoint({
        orderId: routePointFocus.orderId,
        lat: routePointFocus.lat,
        lng: routePointFocus.lng,
      })
      // Also select the order to keep popup open
      if (onOrderSelect && selectedOrderId !== routePointFocus.orderId) {
        onOrderSelect(routePointFocus.orderId)
      }
    } else if (routePointFocus === null) {
      // Explicitly clear focused point when set to null
      setFocusedRoutePoint(null)
    }
  }, [routePointFocus, onOrderSelect, selectedOrderId])

  // Update map center when appointment selection changes
  useEffect(() => {
    // Only center map if selection changed to a different item (not on re-render with same selection)
    const appointmentChanged = selectedAppointmentId !== prevSelectedAppointmentId.current

    if (selectedAppointmentId && appointmentChanged) {
      const selectedAppt = appointments.find((a) => a.id === selectedAppointmentId)
      if (selectedAppt) {
        setMapCenter([selectedAppt.client.latitude, selectedAppt.client.longitude])
        // Don't change zoom - let user control it
      }
      prevSelectedAppointmentId.current = selectedAppointmentId
    } else if (!selectedOrderId && !selectedAppointmentId) {
      setMapCenter(undefined)
      setMapZoom(undefined)
      prevSelectedOrderId.current = null
      prevSelectedAppointmentId.current = null
    }
  }, [selectedOrderId, selectedAppointmentId, appointments])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED':
        return '#0ea5e9' // blue
      case 'ASSIGNED':
        return '#f59e0b' // orange
      case 'ACCEPTED':
        return '#8b5cf6' // purple
      case 'ARRIVED':
        return '#ec4899' // pink
      case 'IN_PROGRESS':
        return '#06b6d4' // cyan
      case 'COMPLETED':
        return '#22c55e' // green
      case 'CANCELLED':
        return '#ef4444' // red
      default:
        return '#6b7280' // gray
    }
  }

  const getStatusLabel = (status: string) => {
    return t(`dispatcher.status.${status}`, status)
  }

  // Default center (Cologne, Germany)
  const defaultCenter: [number, number] = [50.9375, 6.9603]

  return (
    <div className="h-full w-full relative rounded-2xl overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        zoomSnap={0.5}
        zoomDelta={0.5}
        closePopupOnClick={false}
        // @ts-ignore - leaflet-rotate options
        rotate={isDriverMode}
        bearing={0}
        touchRotate={isDriverMode}
        rotateControl={isDriverMode ? { closeOnZeroBearing: false } : false}
      >
        <MapController
          center={mapCenter}
          zoom={mapZoom}
          orders={orders}
          appointments={appointments}
          vehicles={vehicles}
          selectedOrderId={selectedOrderId}
          selectedAppointmentId={selectedAppointmentId}
          isDriverMode={isDriverMode}
          mapBearing={mapBearing}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Navigation Route Polyline (for driver mode) - using PersistentPolyline to prevent "crawling caterpillar" effect */}
        {isDriverMode && navigationRoute && navigationRoute.length > 1 && navigationRouteId && (
          <PersistentPolyline
            routeId={navigationRouteId}
            positions={navigationRoute}
            color="#3b82f6"
            weight={6}
            opacity={0.8}
            // 🧪 TEST: Temporarily disable dashArray to check if it causes the crawling effect
            // dashArray="10, 5"
          />
        )}

        {/* Active Vehicles */}
        {vehicles
          .filter((v) => v.currentLat && v.currentLng && v.status === 'ACTIVE')
          .map((vehicle) => {
            // Use arrow icon for driver mode, car icon with status color for dispatcher
            const icon = isDriverMode
              ? createDriverArrowIcon(currentSpeed)
              : createVehicleIcon(vehicle.status as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE')

            return (
              <Marker
                key={vehicle.id}
                position={[vehicle.currentLat!, vehicle.currentLng!]}
                icon={icon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{vehicle.plateNumber}</p>
                    <p className="text-xs text-default-500">{vehicle.type}</p>
                    {vehicle.lastLocationUpdate && (
                      <p className="text-xs text-default-400 mt-1">
                        {t('dispatcher.map.updated')} {new Date(vehicle.lastLocationUpdate).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

        {/* Appointments */}
        {appointments.map((apt) => (
          <AppointmentMarker
            key={apt.id}
            apt={apt}
            icon={appointmentIcon.current}
            isSelected={apt.id === selectedAppointmentId}
            onSelect={(id) => onAppointmentSelect?.(id)}
            timeFormatter={timeFormatter}
            t={t}
          />
        ))}

        {/* Orders */}
        {orders.map((order) => {
          const isSelected = order.id === selectedOrderId
          const statusColor = getStatusColor(order.status)

          // Используем routes[] если есть, иначе fallback на упрощенные поля
          const routes = order.routes && order.routes.length > 0
            ? order.routes
            : (order.pickupLat && order.pickupLng && order.dropoffLat && order.dropoffLng
                ? [{
                    id: `${order.id}-default`,
                    firmaID: order.firmaID,
                    orderID: order.id,
                    sequence: 1,
                    pickupAddress: order.pickupAddress || '',
                    dropoffAddress: order.dropoffAddress || '',
                    pickupLat: order.pickupLat,
                    pickupLng: order.pickupLng,
                    dropoffLat: order.dropoffLat,
                    dropoffLng: order.dropoffLng,
                    createdAt: new Date(),
                  }]
                : [])

          if (routes.length === 0) {
            return null
          }

          return (
            <React.Fragment key={order.id}>
              {/* Render markers and routes for each route segment */}
              {routes.map((route, index) => {
                if (!route.pickupLat || !route.pickupLng || !route.dropoffLat || !route.dropoffLng) {
                  return null
                }

                const isFirstRoute = index === 0
                const isLastRoute = index === routes.length - 1

                return (
                  <React.Fragment key={route.id}>
                    {/* Pickup Marker - show for first route or intermediate stops */}
                    {isFirstRoute && (
                      <OrderMarker
                        position={[route.pickupLat, route.pickupLng]}
                        icon={pickupIcon}
                        isSelected={isSelected}
                        isFocused={
                          focusedRoutePoint?.orderId === order.id &&
                          focusedRoutePoint.lat === route.pickupLat &&
                          focusedRoutePoint.lng === route.pickupLng
                        }
                        hasFocusedPoint={focusedRoutePoint?.orderId === order.id}
                        onSelect={() => onOrderSelect?.(order.id)}
                      >
                        <Popup autoClose={false} closeOnClick={false}>
                          <div className="text-sm">
                            <p className="font-semibold flex items-center gap-1">
                              <MapPin size={14} />
                              {t('dispatcher.map.pickup')}
                            </p>
                            <p className="text-xs mt-1">{route.pickupAddress}</p>
                            <p className="text-xs text-default-500 mt-1">{order.passengerName}</p>
                            <p className="text-xs font-medium mt-1" style={{ color: statusColor }}>
                              {getStatusLabel(order.status)}
                            </p>
                          </div>
                        </Popup>
                      </OrderMarker>
                    )}

                    {/* Dropoff Marker - show for last route or all intermediate stops */}
                    <OrderMarker
                      position={[route.dropoffLat, route.dropoffLng]}
                      icon={isLastRoute ? dropoffIcon : intermediateIcon}
                      isSelected={isSelected}
                      isFocused={
                        focusedRoutePoint?.orderId === order.id &&
                        focusedRoutePoint.lat === route.dropoffLat &&
                        focusedRoutePoint.lng === route.dropoffLng
                      }
                      hasFocusedPoint={focusedRoutePoint?.orderId === order.id}
                      onSelect={() => onOrderSelect?.(order.id)}
                    >
                      <Popup autoClose={false} closeOnClick={false}>
                        <div className="text-sm">
                          <p className="font-semibold flex items-center gap-1">
                            {isLastRoute ? <CheckCircle2 size={14} /> : <MapPin size={14} />}
                            {isLastRoute ? t('dispatcher.map.dropoff') : `${t('dispatcher.map.stop')} ${route.sequence}`}
                          </p>
                          <p className="text-xs mt-1">{route.dropoffAddress}</p>
                          <p className="text-xs text-default-500 mt-1">{order.passengerName}</p>
                        </div>
                      </Popup>
                    </OrderMarker>

                    {/* Route Line */}
                    <RoutePolyline
                      pickup={[route.pickupLat, route.pickupLng]}
                      dropoff={[route.dropoffLat, route.dropoffLng]}
                      color={statusColor}
                      weight={isSelected ? 6 : 4}
                      opacity={isSelected ? 0.9 : 0.7}
                      dashArray={order.status === 'COMPLETED' ? '10, 10' : undefined}
                      animate={isSelected}
                      onClick={() => onOrderSelect?.(order.id)}
                    />
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Legend - показываем только если есть orders */}
      {orders.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-blue-900/70 rounded-lg shadow-lg p-3 text-xs z-1000">
          <p className="font-semibold mb-2">{t('dispatcher.map.legend')}</p>
          <div className="space-y-1.5">
            <MarkerLegendItem type="pickup" label={t('dispatcher.map.legendPickup')} />
            <MarkerLegendItem type="intermediate" label={t('dispatcher.map.legendIntermediate')} />
            <MarkerLegendItem type="dropoff" label={t('dispatcher.map.legendDropoff')} />
          </div>
        </div>
      )}
    </div>
  )
})

export default Map
