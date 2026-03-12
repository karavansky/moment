/**
 * Компонент для отображения маршрута с использованием OSRM routing
 */

'use client'

import { useEffect, useState } from 'react'
import { Polyline } from 'react-leaflet'
import { fetchRoute } from './useRouting'

interface RoutePolylineProps {
  pickup: [number, number]
  dropoff: [number, number]
  color: string
  weight?: number
  opacity?: number
  dashArray?: string
  onClick?: () => void
  animate?: boolean
}

export default function RoutePolyline({
  pickup,
  dropoff,
  color,
  weight = 3,
  opacity = 0.7,
  dashArray,
  onClick,
  animate = false,
}: RoutePolylineProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([
    pickup,
    dropoff,
  ])

  useEffect(() => {
    let cancelled = false

    // Получаем маршрут от OSRM
    fetchRoute(pickup, dropoff).then((coordinates) => {
      if (!cancelled) {
        setRouteCoordinates(coordinates)
      }
    })

    return () => {
      cancelled = true
    }
  }, [pickup[0], pickup[1], dropoff[0], dropoff[1]])

  return (
    <Polyline
      positions={routeCoordinates}
      color={color}
      weight={weight}
      opacity={opacity}
      dashArray={dashArray}
      className={animate ? 'animate-pulse' : ''}
      eventHandlers={onClick ? { click: onClick } : undefined}
    />
  )
}
