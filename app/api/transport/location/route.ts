import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAnySchedulingSession } from '../../scheduling/auth-check'

const OSRM_URL = process.env.OSRM_URL || 'http://osrm:5000'

/**
 * Snap GPS coordinates to nearest road using OSRM Match API
 * This reduces GPS drift and ensures vehicle appears on roads
 */
async function snapToRoad(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  try {
    // OSRM Match API expects format: /match/v1/driving/lon,lat;lon,lat
    // For single point, we send it twice to create a minimal route
    const url = `${OSRM_URL}/match/v1/driving/${lng},${lat};${lng},${lat}?overview=full&geometries=geojson`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      console.warn('[OSRM] Match failed:', response.status)
      return null
    }

    const data = await response.json()

    // Check if we got a valid match
    if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
      const matched = data.matchings[0]
      if (matched.geometry && matched.geometry.coordinates && matched.geometry.coordinates.length > 0) {
        // Get the first matched coordinate
        const [matchedLng, matchedLat] = matched.geometry.coordinates[0]

        console.log('[OSRM] Snapped to road:', {
          original: { lat, lng },
          snapped: { lat: matchedLat, lng: matchedLng },
          confidence: matched.confidence,
        })

        return { lat: matchedLat, lng: matchedLng }
      }
    }

    // No match found, return null to use original coordinates
    console.warn('[OSRM] No road match found, using original coordinates')
    return null
  } catch (error) {
    console.error('[OSRM] Error snapping to road:', error)
    return null
  }
}

/**
 * Update vehicle GPS location
 * POST /api/transport/location
 * Allows any authenticated user (driver, dispatcher, etc.) to update their vehicle location
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAnySchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vehicleID, latitude, longitude } = await request.json()

    if (!vehicleID || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'vehicleID, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    const firmaID = session.user.firmaID!

    // Try to snap coordinates to nearest road
    const snapped = await snapToRoad(latitude, longitude)
    const finalLat = snapped?.lat ?? latitude
    const finalLng = snapped?.lng ?? longitude

    // Update vehicle location in database
    const query = `
      UPDATE vehicles
      SET
        "currentLat" = $1,
        "currentLng" = $2,
        "lastLocationUpdate" = CURRENT_TIMESTAMP
      WHERE "vehicleID" = $3 AND "firmaID" = $4
      RETURNING "vehicleID", "currentLat", "currentLng", "lastLocationUpdate"
    `

    const result = await pool.query(query, [finalLat, finalLng, vehicleID, firmaID])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const vehicle = result.rows[0]

    console.log('[Transport Location] Updated:', {
      vehicleID: vehicle.vehicleID,
      original: { lat: latitude, lng: longitude },
      final: { lat: vehicle.currentLat, lng: vehicle.currentLng },
      snapped: !!snapped,
      timestamp: vehicle.lastLocationUpdate,
    })

    return NextResponse.json({
      success: true,
      vehicleID: vehicle.vehicleID,
      currentLat: vehicle.currentLat,
      currentLng: vehicle.currentLng,
      lastLocationUpdate: vehicle.lastLocationUpdate,
      wasSnapped: !!snapped,
    })
  } catch (error) {
    console.error('[Transport Location API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle location' },
      { status: 500 }
    )
  }
}
