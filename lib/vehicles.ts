import pool from './db'
import type { VehicleDB, VehicleType, VehicleStatus } from '../types/transport'

function getChannel(firmaID: string): string {
  return `transport_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyVehicleChange(
  firmaID: string,
  type: 'vehicle_created' | 'vehicle_updated' | 'vehicle_deleted',
  vehicleID?: string
) {
  pool
    .query(`SELECT pg_notify($1, $2)`, [
      getChannel(firmaID),
      JSON.stringify({ type, firmaID, vehicleID }),
    ])
    .catch(err => console.error(`[vehicles] pg_notify ${type} error:`, err))
}

// ================================================
// CREATE VEHICLE
// ================================================

export async function createVehicle(data: {
  vehicleID: string
  firmaID: string
  plateNumber: string
  type: VehicleType
  status?: VehicleStatus
  currentDriverID?: string
}): Promise<VehicleDB> {
  const query = `
    INSERT INTO vehicles (
      "vehicleID", "firmaID", "plateNumber", "type", "status", "currentDriverID"
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `

  const values = [
    data.vehicleID,
    data.firmaID,
    data.plateNumber,
    data.type,
    data.status || 'ACTIVE',
    data.currentDriverID || null,
  ]

  const result = await pool.query(query, values)
  const created = result.rows[0]

  notifyVehicleChange(data.firmaID, 'vehicle_created', data.vehicleID)

  return created
}

// ================================================
// GET VEHICLES
// ================================================

export async function getVehiclesByFirmaID(firmaID: string): Promise<VehicleDB[]> {
  const query = `
    SELECT * FROM vehicles
    WHERE "firmaID" = $1
    ORDER BY "plateNumber" ASC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

export async function getVehicleByID(vehicleID: string, firmaID: string): Promise<VehicleDB | null> {
  const query = `
    SELECT * FROM vehicles
    WHERE "vehicleID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [vehicleID, firmaID])
  return result.rows[0] || null
}

export async function getVehicleByPlateNumber(
  plateNumber: string,
  firmaID: string
): Promise<VehicleDB | null> {
  const query = `
    SELECT * FROM vehicles
    WHERE "plateNumber" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [plateNumber, firmaID])
  return result.rows[0] || null
}

// Get active vehicles (for dispatcher)
export async function getActiveVehicles(firmaID: string): Promise<VehicleDB[]> {
  const query = `
    SELECT * FROM vehicles
    WHERE "firmaID" = $1 AND "status" = 'ACTIVE'
    ORDER BY "plateNumber" ASC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

// Get vehicles with current driver assigned
export async function getVehiclesWithDrivers(firmaID: string): Promise<VehicleDB[]> {
  const query = `
    SELECT * FROM vehicles
    WHERE "firmaID" = $1 AND "currentDriverID" IS NOT NULL
    ORDER BY "plateNumber" ASC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

// ================================================
// UPDATE VEHICLE
// ================================================

export async function updateVehicle(
  vehicleID: string,
  firmaID: string,
  data: {
    plateNumber?: string
    type?: VehicleType
    status?: VehicleStatus
    currentDriverID?: string | null
    currentLat?: number | null
    currentLng?: number | null
    lastLocationUpdate?: Date | null
  }
): Promise<VehicleDB | null> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.plateNumber !== undefined) {
    fields.push(`"plateNumber" = $${paramIndex++}`)
    values.push(data.plateNumber)
  }

  if (data.type !== undefined) {
    fields.push(`"type" = $${paramIndex++}`)
    values.push(data.type)
  }

  if (data.status !== undefined) {
    fields.push(`"status" = $${paramIndex++}`)
    values.push(data.status)
  }

  if (data.currentDriverID !== undefined) {
    fields.push(`"currentDriverID" = $${paramIndex++}`)
    values.push(data.currentDriverID)
  }

  if (data.currentLat !== undefined) {
    fields.push(`"currentLat" = $${paramIndex++}`)
    values.push(data.currentLat)
  }

  if (data.currentLng !== undefined) {
    fields.push(`"currentLng" = $${paramIndex++}`)
    values.push(data.currentLng)
  }

  if (data.lastLocationUpdate !== undefined) {
    fields.push(`"lastLocationUpdate" = $${paramIndex++}`)
    values.push(data.lastLocationUpdate)
  }

  if (fields.length === 0) {
    return getVehicleByID(vehicleID, firmaID)
  }

  values.push(vehicleID, firmaID)

  const query = `
    UPDATE vehicles
    SET ${fields.join(', ')}
    WHERE "vehicleID" = $${paramIndex++} AND "firmaID" = $${paramIndex++}
    RETURNING *
  `

  const result = await pool.query(query, values)
  const updated = result.rows[0] || null

  if (updated) {
    notifyVehicleChange(firmaID, 'vehicle_updated', vehicleID)
  }

  return updated
}

// Update vehicle location (for real-time tracking)
export async function updateVehicleLocation(
  vehicleID: string,
  firmaID: string,
  lat: number,
  lng: number
): Promise<VehicleDB | null> {
  const query = `
    UPDATE vehicles
    SET
      "currentLat" = $1,
      "currentLng" = $2,
      "lastLocationUpdate" = NOW()
    WHERE "vehicleID" = $3 AND "firmaID" = $4
    RETURNING *
  `

  const result = await pool.query(query, [lat, lng, vehicleID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    // Send location update notification (for dispatcher map)
    notifyVehicleChange(firmaID, 'vehicle_updated', vehicleID)
  }

  return updated
}

// Assign/unassign driver to vehicle
export async function assignDriverToVehicle(
  vehicleID: string,
  firmaID: string,
  driverID: string | null
): Promise<VehicleDB | null> {
  const query = `
    UPDATE vehicles
    SET "currentDriverID" = $1
    WHERE "vehicleID" = $2 AND "firmaID" = $3
    RETURNING *
  `

  const result = await pool.query(query, [driverID, vehicleID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    // Also update worker's vehicleID
    if (driverID) {
      await pool.query(
        `UPDATE workers SET "vehicleID" = $1 WHERE "workerID" = $2 AND "firmaID" = $3`,
        [vehicleID, driverID, firmaID]
      )
    }

    notifyVehicleChange(firmaID, 'vehicle_updated', vehicleID)
  }

  return updated
}

// ================================================
// DELETE VEHICLE
// ================================================

export async function deleteVehicle(vehicleID: string, firmaID: string): Promise<boolean> {
  const query = `
    DELETE FROM vehicles
    WHERE "vehicleID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [vehicleID, firmaID])
  const deleted = (result.rowCount ?? 0) > 0

  if (deleted) {
    notifyVehicleChange(firmaID, 'vehicle_deleted', vehicleID)
  }

  return deleted
}

// ================================================
// STATISTICS
// ================================================

export async function getVehicleStats(firmaID: string) {
  const query = `
    SELECT
      COUNT(*) as "totalVehicles",
      COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END) as "activeVehicles",
      COUNT(CASE WHEN "status" = 'REPAIR' THEN 1 END) as "inRepair",
      COUNT(CASE WHEN "status" = 'INACTIVE' THEN 1 END) as "inactive",
      COUNT(CASE WHEN "currentDriverID" IS NOT NULL THEN 1 END) as "withDriver"
    FROM vehicles
    WHERE "firmaID" = $1
  `

  const result = await pool.query(query, [firmaID])
  return result.rows[0]
}
