'use client'

import React from 'react'
import { MapPin } from 'lucide-react'
import type L from 'leaflet'
import ReactDOMServer from 'react-dom/server'

// Типы маркеров
export type MarkerType = 'pickup' | 'intermediate' | 'dropoff'

// Цвета для маркеров
export const MARKER_COLORS = {
  pickup: '#3b82f6', // blue-500
  intermediate: '#f59e0b', // amber-500
  dropoff: '#22c55e', // green-500
} as const

/**
 * Единый компонент маркера для использования в List, Map и Legend
 * С белой заливкой для улучшения видимости на карте
 */
interface RouteMarkerIconProps {
  type: MarkerType
  size?: number
  className?: string
}

export function RouteMarkerIcon({ type, size = 14, className = '' }: RouteMarkerIconProps) {
  const color = MARKER_COLORS[type]

  return (
    <MapPin
      size={size}
      className={className}
      style={{ color }}
      fill="white"
      strokeWidth={2.5}
    />
  )
}

/**
 * Создаёт Leaflet divIcon для маркера на карте
 * С белой заливкой для улучшения видимости
 * ВАЖНО: эта функция должна вызываться только на клиенте (в useEffect или внутри компонента Map)
 */
export function createRouteMarkerIcon(type: MarkerType, iconSize: number = 32): L.DivIcon {
  // Динамический импорт Leaflet на клиенте
  if (typeof window === 'undefined') {
    throw new Error('createRouteMarkerIcon can only be called on the client side')
  }

  const L = require('leaflet')
  const color = MARKER_COLORS[type]

  // Размер самой иконки внутри контейнера
  const svgSize = iconSize * 0.6

  const iconHtml = ReactDOMServer.renderToString(
    <div
      style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    >
      <MapPin
        size={svgSize}
        color={color}
        fill="white"
        strokeWidth={2.5}
      />
    </div>
  )

  return L.divIcon({
    className: 'route-marker-icon',
    html: iconHtml,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize],
    popupAnchor: [0, -iconSize],
  })
}

/**
 * Компонент для отображения легенды маркеров
 */
interface MarkerLegendItemProps {
  type: MarkerType
  label: string
}

export function MarkerLegendItem({ type, label }: MarkerLegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <RouteMarkerIcon type={type} size={16} className="shrink-0" />
      <span>{label}</span>
    </div>
  )
}
