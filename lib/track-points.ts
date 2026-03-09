import pool from './db'
import type { TrackPoint, TrackPointDB } from '../types/transport'

// ================================================
// INSERT TRACK POINTS
// ================================================

// Insert single GPS point
export async function insertTrackPoint(data: {
  orderID: string
  vehicleID: string
  driverID: string
  latitude: number
  longitude: number
  speed?: number
  heading?: number
  accuracy?: number
  recordedAt?: Date
}): Promise<TrackPointDB> {
  const query = `
    INSERT INTO track_points (
      "orderID", "vehicleID", "driverID", location,
      speed, heading, accuracy, "recordedAt"
    )
    VALUES (
      $1, $2, $3,
      ST_SetSRID(ST_MakePoint($4, $5), 4326),
      $6, $7, $8, $9
    )
    RETURNING
      id,
      "orderID",
      "vehicleID",
      "driverID",
      ST_AsText(location) as location,
      speed,
      heading,
      accuracy,
      "recordedAt",
      "createdAt"
  `

  const values = [
    data.orderID,
    data.vehicleID,
    data.driverID,
    data.longitude, // PostGIS uses (longitude, latitude) order in ST_MakePoint
    data.latitude,
    data.speed || null,
    data.heading || null,
    data.accuracy || null,
    data.recordedAt || new Date(),
  ]

  const result = await pool.query(query, values)
  return result.rows[0]
}

// Bulk insert GPS points (for offline sync)
export async function insertTrackPointsBulk(
  points: Array<{
    orderID: string
    vehicleID: string
    driverID: string
    latitude: number
    longitude: number
    speed?: number
    heading?: number
    accuracy?: number
    recordedAt?: Date
  }>
): Promise<number> {
  if (points.length === 0) return 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let inserted = 0
    for (const point of points) {
      const query = `
        INSERT INTO track_points (
          "orderID", "vehicleID", "driverID", location,
          speed, heading, accuracy, "recordedAt"
        )
        VALUES (
          $1, $2, $3,
          ST_SetSRID(ST_MakePoint($4, $5), 4326),
          $6, $7, $8, $9
        )
      `

      const values = [
        point.orderID,
        point.vehicleID,
        point.driverID,
        point.longitude,
        point.latitude,
        point.speed || null,
        point.heading || null,
        point.accuracy || null,
        point.recordedAt || new Date(),
      ]

      await client.query(query, values)
      inserted++
    }

    await client.query('COMMIT')
    return inserted
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ================================================
// GET TRACK POINTS
// ================================================

// Get all track points for an order
export async function getTrackPointsByOrderID(orderID: string): Promise<TrackPoint[]> {
  const query = `
    SELECT
      id,
      "orderID",
      "vehicleID",
      "driverID",
      ST_X(location) as longitude,
      ST_Y(location) as latitude,
      speed,
      heading,
      accuracy,
      "recordedAt",
      "createdAt"
    FROM track_points
    WHERE "orderID" = $1
    ORDER BY "recordedAt" ASC
  `

  const result = await pool.query(query, [orderID])
  return result.rows
}

// Get track points within time range
export async function getTrackPointsByTimeRange(
  orderID: string,
  startTime: Date,
  endTime: Date
): Promise<TrackPoint[]> {
  const query = `
    SELECT
      id,
      "orderID",
      "vehicleID",
      "driverID",
      ST_X(location) as longitude,
      ST_Y(location) as latitude,
      speed,
      heading,
      accuracy,
      "recordedAt",
      "createdAt"
    FROM track_points
    WHERE "orderID" = $1
      AND "recordedAt" >= $2
      AND "recordedAt" <= $3
    ORDER BY "recordedAt" ASC
  `

  const result = await pool.query(query, [orderID, startTime, endTime])
  return result.rows
}

// Get latest track point for vehicle (for real-time map)
export async function getLatestTrackPoint(vehicleID: string): Promise<TrackPoint | null> {
  const query = `
    SELECT
      id,
      "orderID",
      "vehicleID",
      "driverID",
      ST_X(location) as longitude,
      ST_Y(location) as latitude,
      speed,
      heading,
      accuracy,
      "recordedAt",
      "createdAt"
    FROM track_points
    WHERE "vehicleID" = $1
    ORDER BY "recordedAt" DESC
    LIMIT 1
  `

  const result = await pool.query(query, [vehicleID])
  return result.rows[0] || null
}

// Get recent track points for vehicle (last N points)
export async function getRecentTrackPoints(
  vehicleID: string,
  limit: number = 50
): Promise<TrackPoint[]> {
  const query = `
    SELECT
      id,
      "orderID",
      "vehicleID",
      "driverID",
      ST_X(location) as longitude,
      ST_Y(location) as latitude,
      speed,
      heading,
      accuracy,
      "recordedAt",
      "createdAt"
    FROM track_points
    WHERE "vehicleID" = $1
    ORDER BY "recordedAt" DESC
    LIMIT $2
  `

  const result = await pool.query(query, [vehicleID, limit])
  return result.rows.reverse() // Return in chronological order
}

// ================================================
// GEOSPATIAL QUERIES
// ================================================

// Calculate total distance traveled for an order (in meters)
export async function calculateOrderDistance(orderID: string): Promise<number> {
  const query = `
    SELECT ST_Length(
      ST_MakeLine(location ORDER BY "recordedAt" ASC)::geography
    ) as distance
    FROM track_points
    WHERE "orderID" = $1
  `

  const result = await pool.query(query, [orderID])
  return result.rows[0]?.distance || 0
}

// Get track points within radius of a location (in meters)
export async function getTrackPointsNearLocation(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  startTime?: Date,
  endTime?: Date
): Promise<TrackPoint[]> {
  let query = `
    SELECT
      id,
      "orderID",
      "vehicleID",
      "driverID",
      ST_X(location) as longitude,
      ST_Y(location) as latitude,
      speed,
      heading,
      accuracy,
      "recordedAt",
      "createdAt",
      ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) as distance
    FROM track_points
    WHERE ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
      $3
    )
  `

  const values: any[] = [latitude, longitude, radiusMeters]

  if (startTime && endTime) {
    query += ` AND "recordedAt" >= $4 AND "recordedAt" <= $5`
    values.push(startTime, endTime)
  }

  query += ` ORDER BY "recordedAt" DESC`

  const result = await pool.query(query, values)
  return result.rows
}

// Get GeoJSON LineString for order track (for map display)
export async function getOrderTrackGeoJSON(orderID: string): Promise<any> {
  const query = `
    SELECT ST_AsGeoJSON(
      ST_MakeLine(location ORDER BY "recordedAt" ASC)
    ) as geojson
    FROM track_points
    WHERE "orderID" = $1
  `

  const result = await pool.query(query, [orderID])
  if (!result.rows[0]?.geojson) return null

  return JSON.parse(result.rows[0].geojson)
}

// ================================================
// CLEANUP & MAINTENANCE
// ================================================

// Delete track points older than specified date
export async function deleteOldTrackPoints(beforeDate: Date): Promise<number> {
  const query = `
    DELETE FROM track_points
    WHERE "recordedAt" < $1
  `

  const result = await pool.query(query, [beforeDate])
  return result.rowCount ?? 0
}

// Delete track points for specific order
export async function deleteTrackPointsByOrderID(orderID: string): Promise<number> {
  const query = `
    DELETE FROM track_points
    WHERE "orderID" = $1
  `

  const result = await pool.query(query, [orderID])
  return result.rowCount ?? 0
}

// Get storage size of track_points table
export async function getTrackPointsStorageSize(): Promise<string> {
  const query = `
    SELECT pg_size_pretty(
      pg_total_relation_size('track_points')
    ) as size
  `

  const result = await pool.query(query)
  return result.rows[0]?.size || '0 bytes'
}

// Get count of track points per order
export async function getTrackPointsCountByOrder(orderID: string): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM track_points
    WHERE "orderID" = $1
  `

  const result = await pool.query(query, [orderID])
  return parseInt(result.rows[0]?.count || '0', 10)
}

// ================================================
// STATISTICS
// ================================================

// Get track point statistics
export async function getTrackPointsStats() {
  const query = `
    SELECT
      COUNT(*) as "totalPoints",
      COUNT(DISTINCT "orderID") as "ordersTracked",
      COUNT(DISTINCT "vehicleID") as "vehiclesTracked",
      MIN("recordedAt") as "oldestPoint",
      MAX("recordedAt") as "newestPoint",
      pg_size_pretty(pg_total_relation_size('track_points')) as "storageSize"
    FROM track_points
  `

  const result = await pool.query(query)
  return result.rows[0]
}
