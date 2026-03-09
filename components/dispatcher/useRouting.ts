/**
 * Custom hook для получения маршрутов через OSRM API
 */

import { useState, useEffect } from 'react'

export interface RouteCoordinates {
  coordinates: [number, number][]
  distance?: number
  duration?: number
  isLoading: boolean
  error?: string
  isFallback?: boolean
}

/**
 * Получить маршрут между двумя точками
 */
export async function fetchRoute(
  pickup: [number, number],
  dropoff: [number, number]
): Promise<[number, number][]> {
  try {
    const coordinates = `${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}`
    const response = await fetch(`/api/routing?coordinates=${coordinates}`, {
      signal: AbortSignal.timeout(10000), // 10 секунд timeout
    })

    if (!response.ok) {
      throw new Error(`Routing API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.routes?.[0]?.geometry?.coordinates) {
      // Конвертируем [lng, lat] в [lat, lng] для Leaflet
      return data.routes[0].geometry.coordinates.map(
        ([lng, lat]: number[]) => [lat, lng] as [number, number]
      )
    }

    throw new Error('No route found in response')
  } catch (error) {
    console.warn('❌ Routing failed, using straight line:', error)
    // Fallback на прямую линию при ошибке
    return [pickup, dropoff]
  }
}

/**
 * React hook для получения маршрута с кешированием
 */
export function useRoute(
  pickup: [number, number] | null,
  dropoff: [number, number] | null,
  enabled: boolean = true
): RouteCoordinates {
  const [state, setState] = useState<RouteCoordinates>({
    coordinates: [],
    isLoading: false,
  })

  useEffect(() => {
    if (!enabled || !pickup || !dropoff) {
      setState({ coordinates: [], isLoading: false })
      return
    }

    let cancelled = false

    setState((prev) => ({ ...prev, isLoading: true, error: undefined }))

    fetchRoute(pickup, dropoff)
      .then((coordinates) => {
        if (!cancelled) {
          setState({
            coordinates,
            isLoading: false,
            error: undefined,
          })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            coordinates: [pickup, dropoff], // Fallback
            isLoading: false,
            error: error.message,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [pickup?.[0], pickup?.[1], dropoff?.[0], dropoff?.[1], enabled])

  return state
}
