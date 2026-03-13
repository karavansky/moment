import pool from './db'
import type { RouteDB } from '../types/transport'

// ================================================
// CREATE ROUTE
// ================================================

export async function createRoute(data: {
  routeID: string
  firmaID: string
  orderID?: string | null
  appointmentID?: string | null
  sequence: number
  pickupAddress: string
  dropoffAddress: string
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
}): Promise<RouteDB> {
  const query = `
    INSERT INTO routes (
      "routeID", "firmaID", "orderID", "appointmentID", "sequence",
      "pickupAddress", "dropoffAddress",
      "pickupLat", "pickupLng", "dropoffLat", "dropoffLng"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `

  const values = [
    data.routeID,
    data.firmaID,
    data.orderID || null,
    data.appointmentID || null,
    data.sequence,
    data.pickupAddress,
    data.dropoffAddress,
    data.pickupLat || null,
    data.pickupLng || null,
    data.dropoffLat || null,
    data.dropoffLng || null,
  ]

  const result = await pool.query(query, values)
  return result.rows[0]
}

// Create multiple routes for an order or appointment (transaction)
export async function createRoutesForOrder(
  firmaID: string,
  orderID: string | null,
  routes: Array<{
    routeID: string
    sequence: number
    pickupAddress: string
    dropoffAddress: string
    pickupLat?: number
    pickupLng?: number
    dropoffLat?: number
    dropoffLng?: number
  }>,
  appointmentID?: string | null
): Promise<RouteDB[]> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const created: RouteDB[] = []
    for (const route of routes) {
      const query = `
        INSERT INTO routes (
          "routeID", "firmaID", "orderID", "appointmentID", "sequence",
          "pickupAddress", "dropoffAddress",
          "pickupLat", "pickupLng", "dropoffLat", "dropoffLng"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      const values = [
        route.routeID,
        firmaID,
        orderID,
        appointmentID || null,
        route.sequence,
        route.pickupAddress,
        route.dropoffAddress,
        route.pickupLat || null,
        route.pickupLng || null,
        route.dropoffLat || null,
        route.dropoffLng || null,
      ]

      const result = await client.query(query, values)
      created.push(result.rows[0])
    }

    await client.query('COMMIT')
    return created
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ================================================
// GET ROUTES
// ================================================

export async function getRoutesByOrderID(orderID: string, firmaID: string): Promise<RouteDB[]> {
  const query = `
    SELECT * FROM routes
    WHERE "orderID" = $1 AND "firmaID" = $2
    ORDER BY "sequence" ASC
  `

  const result = await pool.query(query, [orderID, firmaID])
  return result.rows
}

export async function getRoutesByAppointmentID(
  appointmentID: string,
  firmaID: string
): Promise<RouteDB[]> {
  const query = `
    SELECT * FROM routes
    WHERE "appointmentID" = $1 AND "firmaID" = $2
    ORDER BY "sequence" ASC
  `

  const result = await pool.query(query, [appointmentID, firmaID])
  return result.rows
}

// Batch fetch routes for multiple orders (efficient for API responses)
export async function getRoutesByOrderIDs(
  orderIDs: string[],
  firmaID: string
): Promise<Map<string, RouteDB[]>> {
  if (orderIDs.length === 0) {
    return new Map()
  }

  const query = `
    SELECT * FROM routes
    WHERE "orderID" = ANY($1) AND "firmaID" = $2
    ORDER BY "orderID", "sequence" ASC
  `

  const result = await pool.query(query, [orderIDs, firmaID])

  // Group routes by orderID
  const routesByOrder = new Map<string, RouteDB[]>()
  for (const route of result.rows) {
    const orderID = route.orderID
    if (!routesByOrder.has(orderID)) {
      routesByOrder.set(orderID, [])
    }
    routesByOrder.get(orderID)!.push(route)
  }

  return routesByOrder
}

export async function getRouteByID(routeID: string, firmaID: string): Promise<RouteDB | null> {
  const query = `
    SELECT * FROM routes
    WHERE "routeID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [routeID, firmaID])
  return result.rows[0] || null
}

// Get next route stop for driver (based on sequence)
// Works with either orderID or appointmentID
export async function getNextRoute(
  orderIDOrAppointmentID: string,
  currentSequence: number,
  firmaID: string,
  isAppointment: boolean = false
): Promise<RouteDB | null> {
  const columnName = isAppointment ? 'appointmentID' : 'orderID'

  const query = `
    SELECT * FROM routes
    WHERE "${columnName}" = $1
      AND "firmaID" = $2
      AND "sequence" > $3
    ORDER BY "sequence" ASC
    LIMIT 1
  `

  const result = await pool.query(query, [orderIDOrAppointmentID, firmaID, currentSequence])
  return result.rows[0] || null
}

// ================================================
// UPDATE ROUTE
// ================================================

export async function updateRoute(
  routeID: string,
  firmaID: string,
  data: {
    pickupAddress?: string
    dropoffAddress?: string
    pickupLat?: number | null
    pickupLng?: number | null
    dropoffLat?: number | null
    dropoffLng?: number | null
  }
): Promise<RouteDB | null> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.pickupAddress !== undefined) {
    fields.push(`"pickupAddress" = $${paramIndex++}`)
    values.push(data.pickupAddress)
  }

  if (data.dropoffAddress !== undefined) {
    fields.push(`"dropoffAddress" = $${paramIndex++}`)
    values.push(data.dropoffAddress)
  }

  if (data.pickupLat !== undefined) {
    fields.push(`"pickupLat" = $${paramIndex++}`)
    values.push(data.pickupLat)
  }

  if (data.pickupLng !== undefined) {
    fields.push(`"pickupLng" = $${paramIndex++}`)
    values.push(data.pickupLng)
  }

  if (data.dropoffLat !== undefined) {
    fields.push(`"dropoffLat" = $${paramIndex++}`)
    values.push(data.dropoffLat)
  }

  if (data.dropoffLng !== undefined) {
    fields.push(`"dropoffLng" = $${paramIndex++}`)
    values.push(data.dropoffLng)
  }

  if (fields.length === 0) {
    return getRouteByID(routeID, firmaID)
  }

  values.push(routeID, firmaID)

  const query = `
    UPDATE routes
    SET ${fields.join(', ')}
    WHERE "routeID" = $${paramIndex++} AND "firmaID" = $${paramIndex++}
    RETURNING *
  `

  const result = await pool.query(query, values)
  return result.rows[0] || null
}

// ================================================
// DELETE ROUTE
// ================================================

export async function deleteRoute(routeID: string, firmaID: string): Promise<boolean> {
  const query = `
    DELETE FROM routes
    WHERE "routeID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [routeID, firmaID])
  return (result.rowCount ?? 0) > 0
}

// Delete all routes for an order
export async function deleteRoutesByOrderID(orderID: string, firmaID: string): Promise<number> {
  const query = `
    DELETE FROM routes
    WHERE "orderID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [orderID, firmaID])
  return result.rowCount ?? 0
}
