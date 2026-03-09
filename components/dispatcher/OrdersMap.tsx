'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Order, Vehicle } from '@/types/transport'
import { Package, Navigation, CheckCircle2, MapPin } from 'lucide-react'
import RoutePolyline from './RoutePolyline'

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface OrdersMapProps {
  orders: Order[]
  vehicles: Vehicle[]
  selectedOrderId: string | null
  onOrderSelect: (orderId: string) => void
}

// Custom marker icons
const createCustomIcon = (color: string, IconComponent: any) => {
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

// Component to handle map centering
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  return null
}

export default function OrdersMap({
  orders,
  vehicles,
  selectedOrderId,
  onOrderSelect,
}: OrdersMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([50.9375, 6.9603]) // Köln
  const [mapZoom, setMapZoom] = useState(13)

  // Update map center when order is selected
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find((o) => o.id === selectedOrderId)
      if (selectedOrder && selectedOrder.pickupLat && selectedOrder.pickupLng) {
        setMapCenter([selectedOrder.pickupLat, selectedOrder.pickupLng])
        setMapZoom(14)
      }
    } else {
      // Show all orders
      setMapZoom(13)
    }
  }, [selectedOrderId, orders])

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

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />

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
                  click: () => onOrderSelect(order.id),
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
                  click: () => onOrderSelect(order.id),
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[1000]">
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
    </div>
  )
}
