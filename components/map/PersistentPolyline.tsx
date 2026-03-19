'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface PersistentPolylineProps {
  /** Unique identifier for this polyline (to track when route changes) */
  routeId: string
  /** Array of coordinates */
  positions: Array<[number, number]>
  /** Line color */
  color?: string
  /** Line weight */
  weight?: number
  /** Line opacity */
  opacity?: number
  /** Dashed line pattern */
  dashArray?: string
}

/**
 * A Polyline component that persists on the map and doesn't re-render
 * unless the routeId changes. This prevents the "crawling caterpillar" effect.
 */
export function PersistentPolyline({
  routeId,
  positions,
  color = '#3b82f6',
  weight = 6,
  opacity = 0.7,
  dashArray,
}: PersistentPolylineProps) {
  const map = useMap()
  const polylineRef = useRef<L.Polyline | null>(null)
  const currentRouteIdRef = useRef<string | null>(null)

  useEffect(() => {
    // If route ID changed, remove old polyline and create new one
    if (currentRouteIdRef.current !== routeId) {
      console.log(`[PersistentPolyline] 🗺️ Route changed from "${currentRouteIdRef.current}" to "${routeId}" - recreating polyline`)

      // Remove old polyline
      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }

      // Create new polyline
      if (positions.length > 1) {
        polylineRef.current = L.polyline(positions, {
          color,
          weight,
          opacity,
          dashArray,
        }).addTo(map)

        currentRouteIdRef.current = routeId
        console.log(`[PersistentPolyline] ✅ Created polyline for route "${routeId}" with ${positions.length} points`)
      }
    } else {
      // Route ID same, but maybe positions changed (e.g., route recalculated)
      // Update polyline positions without removing/recreating
      if (polylineRef.current && positions.length > 1) {
        const currentLatLngs = polylineRef.current.getLatLngs() as L.LatLng[]

        // Check if positions actually changed
        const positionsChanged =
          currentLatLngs.length !== positions.length ||
          currentLatLngs.some((latLng, i) =>
            latLng.lat !== positions[i][0] || latLng.lng !== positions[i][1]
          )

        if (positionsChanged) {
          console.log(`[PersistentPolyline] 🔄 Updating positions for route "${routeId}" (${currentLatLngs.length} → ${positions.length} points)`)
          polylineRef.current.setLatLngs(positions)
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (polylineRef.current) {
        console.log(`[PersistentPolyline] 🗑️ Removing polyline for route "${routeId}"`)
        polylineRef.current.remove()
        polylineRef.current = null
        currentRouteIdRef.current = null
      }
    }
  }, [routeId, positions, map, color, weight, opacity, dashArray])

  return null // Imperative component - no DOM output
}
