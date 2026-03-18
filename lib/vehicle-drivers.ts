import pool from './db'
import { generateId } from './generate-id'

export interface VehicleDriverHistory {
  historyID: string
  vehicleID: string
  driverID: string
  assignedAt: Date
  unassignedAt: Date | null
  assignedBy: string | null
  notes: string | null
}

export interface VehicleDriverInfo {
  historyID: string
  driverID: string
  driverName: string
  driverSurname: string
  assignedAt: Date
  unassignedAt: Date | null
  isActive: boolean
}

/**
 * Get all driver assignment history for a vehicle
 */
export async function getVehicleDriverHistory(vehicleID: string): Promise<VehicleDriverInfo[]> {
  const query = `
    SELECT
      vd."historyID",
      vd."driverID",
      w.name as "driverName",
      w.surname as "driverSurname",
      vd."assignedAt",
      vd."unassignedAt",
      (vd."unassignedAt" IS NULL) as "isActive"
    FROM vehicle_drivers vd
    JOIN workers w ON vd."driverID" = w."workerID"
    WHERE vd."vehicleID" = $1
    ORDER BY vd."assignedAt" DESC
  `
  const result = await pool.query<VehicleDriverInfo>(query, [vehicleID])
  return result.rows
}

/**
 * Get current active driver for a vehicle
 */
export async function getCurrentDriver(vehicleID: string): Promise<VehicleDriverInfo | null> {
  const query = `
    SELECT
      vd."historyID",
      vd."driverID",
      w.name as "driverName",
      w.surname as "driverSurname",
      vd."assignedAt",
      vd."unassignedAt",
      true as "isActive"
    FROM vehicle_drivers vd
    JOIN workers w ON vd."driverID" = w."workerID"
    WHERE vd."vehicleID" = $1 AND vd."unassignedAt" IS NULL
    ORDER BY vd."assignedAt" DESC
    LIMIT 1
  `
  const result = await pool.query<VehicleDriverInfo>(query, [vehicleID])
  return result.rows[0] || null
}

/**
 * Assign a driver to a vehicle (creates history record and updates vehicle table)
 * This is the initial assignment (vehicle has no current driver)
 */
export async function assignDriver(
  vehicleID: string,
  driverID: string,
  assignedBy?: string,
  notes?: string
): Promise<VehicleDriverHistory> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check if vehicle already has an active driver
    const checkQuery = `
      SELECT "historyID" FROM vehicle_drivers
      WHERE "vehicleID" = $1 AND "unassignedAt" IS NULL
    `
    const existing = await client.query(checkQuery, [vehicleID])

    if (existing.rows.length > 0) {
      throw new Error('Vehicle already has an active driver. Use changeDriver instead.')
    }

    // Check if driver is already assigned to another vehicle
    const driverCheckQuery = `
      SELECT v."plateNumber"
      FROM vehicles v
      WHERE v."currentDriverID" = $1
    `
    const driverCheck = await client.query(driverCheckQuery, [driverID])

    if (driverCheck.rows.length > 0) {
      throw new Error(
        `Driver is already assigned to vehicle ${driverCheck.rows[0].plateNumber}`
      )
    }

    const historyID = generateId()

    // Create history record
    const insertHistoryQuery = `
      INSERT INTO vehicle_drivers (
        "historyID", "vehicleID", "driverID", "assignedBy", "notes"
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const historyResult = await client.query<VehicleDriverHistory>(insertHistoryQuery, [
      historyID,
      vehicleID,
      driverID,
      assignedBy || null,
      notes || null,
    ])

    // Update vehicle table
    await client.query(
      `UPDATE vehicles SET "currentDriverID" = $1 WHERE "vehicleID" = $2`,
      [driverID, vehicleID]
    )

    // Update worker table
    await client.query(
      `UPDATE workers SET "vehicleID" = $1, "hasVehicle" = true WHERE "workerID" = $2`,
      [vehicleID, driverID]
    )

    await client.query('COMMIT')

    return historyResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Change the driver of a vehicle (unassigns current driver and assigns new one)
 */
export async function changeDriver(
  vehicleID: string,
  newDriverID: string,
  assignedBy?: string,
  notes?: string
): Promise<{ oldHistory: VehicleDriverHistory; newHistory: VehicleDriverHistory }> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get current active driver assignment
    const currentQuery = `
      SELECT * FROM vehicle_drivers
      WHERE "vehicleID" = $1 AND "unassignedAt" IS NULL
      FOR UPDATE
    `
    const currentResult = await client.query<VehicleDriverHistory>(currentQuery, [vehicleID])
    const currentAssignment = currentResult.rows[0]

    if (!currentAssignment) {
      throw new Error('No active driver assignment found. Use assignDriver instead.')
    }

    // Check if new driver is already assigned to another vehicle
    const driverCheckQuery = `
      SELECT v."plateNumber"
      FROM vehicles v
      WHERE v."currentDriverID" = $1 AND v."vehicleID" != $2
    `
    const driverCheck = await client.query(driverCheckQuery, [newDriverID, vehicleID])

    if (driverCheck.rows.length > 0) {
      throw new Error(
        `Driver is already assigned to vehicle ${driverCheck.rows[0].plateNumber}`
      )
    }

    const now = new Date()

    // Close current assignment
    await client.query(
      `UPDATE vehicle_drivers SET "unassignedAt" = $1 WHERE "historyID" = $2`,
      [now, currentAssignment.historyID]
    )

    // Remove vehicle from old driver
    await client.query(
      `UPDATE workers SET "vehicleID" = NULL, "hasVehicle" = false WHERE "workerID" = $1`,
      [currentAssignment.driverID]
    )

    const newHistoryID = generateId()

    // Create new assignment
    const insertQuery = `
      INSERT INTO vehicle_drivers (
        "historyID", "vehicleID", "driverID", "assignedBy", "notes"
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const newResult = await client.query<VehicleDriverHistory>(insertQuery, [
      newHistoryID,
      vehicleID,
      newDriverID,
      assignedBy || null,
      notes || null,
    ])

    // Update vehicle table
    await client.query(
      `UPDATE vehicles SET "currentDriverID" = $1 WHERE "vehicleID" = $2`,
      [newDriverID, vehicleID]
    )

    // Update new driver
    await client.query(
      `UPDATE workers SET "vehicleID" = $1, "hasVehicle" = true WHERE "workerID" = $2`,
      [vehicleID, newDriverID]
    )

    await client.query('COMMIT')

    // Get updated old history
    const oldHistoryResult = await pool.query<VehicleDriverHistory>(
      `SELECT * FROM vehicle_drivers WHERE "historyID" = $1`,
      [currentAssignment.historyID]
    )

    return {
      oldHistory: oldHistoryResult.rows[0],
      newHistory: newResult.rows[0],
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Unassign driver from vehicle (no new driver assigned)
 */
export async function unassignDriver(
  vehicleID: string,
  notes?: string
): Promise<VehicleDriverHistory> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get current active driver assignment
    const currentQuery = `
      SELECT * FROM vehicle_drivers
      WHERE "vehicleID" = $1 AND "unassignedAt" IS NULL
      FOR UPDATE
    `
    const currentResult = await client.query<VehicleDriverHistory>(currentQuery, [vehicleID])
    const currentAssignment = currentResult.rows[0]

    if (!currentAssignment) {
      throw new Error('No active driver assignment found')
    }

    const now = new Date()

    // Close current assignment
    await client.query(
      `UPDATE vehicle_drivers
       SET "unassignedAt" = $1, "notes" = COALESCE("notes" || E'\n' || $2, $2, "notes")
       WHERE "historyID" = $3`,
      [now, notes || null, currentAssignment.historyID]
    )

    // Remove vehicle from driver
    await client.query(
      `UPDATE workers SET "vehicleID" = NULL, "hasVehicle" = false WHERE "workerID" = $1`,
      [currentAssignment.driverID]
    )

    // Update vehicle table
    await client.query(
      `UPDATE vehicles SET "currentDriverID" = NULL WHERE "vehicleID" = $1`,
      [vehicleID]
    )

    await client.query('COMMIT')

    // Get updated history
    const updatedResult = await pool.query<VehicleDriverHistory>(
      `SELECT * FROM vehicle_drivers WHERE "historyID" = $1`,
      [currentAssignment.historyID]
    )

    return updatedResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get all drivers who have ever been assigned to a vehicle
 */
export async function getVehicleDrivers(vehicleID: string): Promise<VehicleDriverInfo[]> {
  return getVehicleDriverHistory(vehicleID)
}

/**
 * Get all vehicles a driver has been assigned to
 */
export async function getDriverVehicleHistory(driverID: string): Promise<any[]> {
  const query = `
    SELECT
      vd."historyID",
      vd."vehicleID",
      v."plateNumber",
      v."type",
      vd."assignedAt",
      vd."unassignedAt",
      (vd."unassignedAt" IS NULL) as "isActive"
    FROM vehicle_drivers vd
    JOIN vehicles v ON vd."vehicleID" = v."vehicleID"
    WHERE vd."driverID" = $1
    ORDER BY vd."assignedAt" DESC
  `
  const result = await pool.query(query, [driverID])
  return result.rows
}
