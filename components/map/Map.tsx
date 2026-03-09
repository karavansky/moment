'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ReactDOMServer from 'react-dom/server'
import type { Order, Vehicle } from '@/types/transport'
import type { AppointmentWithClient } from '@/contexts/SchedulingContext'
import { Package, Navigation, CheckCircle2, MapPin } from 'lucide-react'
import RoutePolyline from '../dispatcher/RoutePolyline'
import { LogoMoment } from '@/components/icons'
import { useLanguage } from '@/hooks/useLanguage'
import { useTranslation } from '@/components/Providers'

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

// Custom marker icons
const createCustomIcon = (color: string, IconComponent: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          ${IconComponent}
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

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

const pickupIcon = createCustomIcon(
  '#0ea5e9',
  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'
)

const dropoffIcon = createCustomIcon(
  '#22c55e',
  '<polyline points="20 6 9 17 4 12"/>'
)

const vehicleIcon = createCustomIcon(
  '#f59e0b',
  '<path d="M5 17h14v-2H5v2zm0-4h14V5H5v8z"/>'
)

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

// Component to handle map centering and bounds
function MapController({
  center,
  zoom,
  orders = [],
  appointments = [],
  selectedOrderId,
  selectedAppointmentId
}: {
  center?: [number, number]
  zoom?: number
  orders?: Order[]
  appointments?: AppointmentWithClient[]
  selectedOrderId?: string | null
  selectedAppointmentId?: string | null
}) {
  const map = useMap()

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
    if (center && zoom) {
      map.setView(center, zoom)
      return
    }

    // Otherwise fit bounds to all markers
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
  }, [map, center, zoom, orders, appointments, selectedOrderId, selectedAppointmentId])

  return null
}

export default function Map({
  orders = [],
  vehicles = [],
  selectedOrderId = null,
  onOrderSelect,
  appointments = [],
  selectedAppointmentId = null,
  onAppointmentSelect,
}: MapProps) {
  const lang = useLanguage()
  const { t } = useTranslation()
  const timeFormatter = useMemo(() => createTimeFormatter(lang), [lang])
  const appointmentIcon = useRef(createAppointmentIcon())

  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>()
  const [mapZoom, setMapZoom] = useState<number | undefined>()

  // Update map center when order is selected
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find((o) => o.id === selectedOrderId)
      if (selectedOrder && selectedOrder.pickupLat && selectedOrder.pickupLng) {
        setMapCenter([selectedOrder.pickupLat, selectedOrder.pickupLng])
        setMapZoom(14)
      }
    } else if (selectedAppointmentId) {
      const selectedAppt = appointments.find((a) => a.id === selectedAppointmentId)
      if (selectedAppt) {
        setMapCenter([selectedAppt.client.latitude, selectedAppt.client.longitude])
        setMapZoom(14)
      }
    } else {
      setMapCenter(undefined)
      setMapZoom(undefined)
    }
  }, [selectedOrderId, selectedAppointmentId, orders, appointments])

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
    switch (status) {
      case 'CREATED':
        return 'Создан'
      case 'ASSIGNED':
        return 'Назначен'
      case 'ACCEPTED':
        return 'Принят'
      case 'ARRIVED':
        return 'На месте'
      case 'IN_PROGRESS':
        return 'В пути'
      case 'COMPLETED':
        return 'Завершен'
      case 'CANCELLED':
        return 'Отменен'
      default:
        return status
    }
  }

  // Default center (Cologne, Germany)
  const defaultCenter: [number, number] = [50.9375, 6.9603]

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <MapController
          center={mapCenter}
          zoom={mapZoom}
          orders={orders}
          appointments={appointments}
          selectedOrderId={selectedOrderId}
          selectedAppointmentId={selectedAppointmentId}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Active Vehicles */}
        {vehicles
          .filter((v) => v.currentLat && v.currentLng && v.status === 'ACTIVE')
          .map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={[vehicle.currentLat!, vehicle.currentLng!]}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{vehicle.plateNumber}</p>
                  <p className="text-xs text-default-500">{vehicle.type}</p>
                  {vehicle.lastLocationUpdate && (
                    <p className="text-xs text-default-400 mt-1">
                      Обновлено: {new Date(vehicle.lastLocationUpdate).toLocaleTimeString('ru-RU')}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

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
          if (!order.pickupLat || !order.pickupLng || !order.dropoffLat || !order.dropoffLng) {
            return null
          }

          const isSelected = order.id === selectedOrderId
          const statusColor = getStatusColor(order.status)

          return (
            <React.Fragment key={order.id}>
              {/* Pickup Marker */}
              <Marker
                position={[order.pickupLat, order.pickupLng]}
                icon={pickupIcon}
                eventHandlers={{
                  click: () => onOrderSelect?.(order.id),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold flex items-center gap-1">
                      <MapPin size={14} />
                      Откуда
                    </p>
                    <p className="text-xs mt-1">{order.pickupAddress}</p>
                    <p className="text-xs text-default-500 mt-1">{order.passengerName}</p>
                    <p
                      className="text-xs font-medium mt-1"
                      style={{ color: statusColor }}
                    >
                      {getStatusLabel(order.status)}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Dropoff Marker */}
              <Marker
                position={[order.dropoffLat, order.dropoffLng]}
                icon={dropoffIcon}
                eventHandlers={{
                  click: () => onOrderSelect?.(order.id),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Куда
                    </p>
                    <p className="text-xs mt-1">{order.dropoffAddress}</p>
                    <p className="text-xs text-default-500 mt-1">{order.passengerName}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Route Line */}
              <RoutePolyline
                pickup={[order.pickupLat, order.pickupLng]}
                dropoff={[order.dropoffLat, order.dropoffLng]}
                color={statusColor}
                weight={isSelected ? 4 : 2}
                opacity={isSelected ? 0.8 : 0.5}
                dashArray={order.status === 'COMPLETED' ? '10, 10' : undefined}
              />
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Legend - показываем только если есть orders */}
      {orders.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-blue-900/70 rounded-lg shadow-lg p-3 text-xs z-[1000]">
          <p className="font-semibold mb-2">Легенда</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Пункт отправления</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Пункт прибытия</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Активное транспортное средство</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
