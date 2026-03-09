import pool from './db'
import type { RejectReasonDB, OrderRejectDB } from '../types/transport'

function getChannel(firmaID: string): string {
  return `transport_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyRejectReasonChange(
  firmaID: string,
  type: 'reject_reason_created' | 'reject_reason_updated' | 'reject_reason_deleted'
) {
  pool
    .query(`SELECT pg_notify($1, $2)`, [getChannel(firmaID), JSON.stringify({ type, firmaID })])
    .catch(err => console.error(`[reject-reasons] pg_notify ${type} error:`, err))
}

// ================================================
// REJECT REASONS (справочник)
// ================================================

export async function createRejectReason(data: {
  reasonID: string
  firmaID: string
  reasonText: string
  isActive?: boolean
}): Promise<RejectReasonDB> {
  const query = `
    INSERT INTO reject_reasons (
      "reasonID", "firmaID", "reasonText", "isActive"
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `

  const values = [data.reasonID, data.firmaID, data.reasonText, data.isActive ?? true]

  const result = await pool.query(query, values)
  const created = result.rows[0]

  notifyRejectReasonChange(data.firmaID, 'reject_reason_created')

  return created
}

export async function getRejectReasonsByFirmaID(firmaID: string): Promise<RejectReasonDB[]> {
  const query = `
    SELECT * FROM reject_reasons
    WHERE "firmaID" = $1
    ORDER BY "reasonText" ASC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

export async function getActiveRejectReasons(firmaID: string): Promise<RejectReasonDB[]> {
  const query = `
    SELECT * FROM reject_reasons
    WHERE "firmaID" = $1 AND "isActive" = true
    ORDER BY "reasonText" ASC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

export async function getRejectReasonByID(
  reasonID: string,
  firmaID: string
): Promise<RejectReasonDB | null> {
  const query = `
    SELECT * FROM reject_reasons
    WHERE "reasonID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [reasonID, firmaID])
  return result.rows[0] || null
}

export async function updateRejectReason(
  reasonID: string,
  firmaID: string,
  data: {
    reasonText?: string
    isActive?: boolean
  }
): Promise<RejectReasonDB | null> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.reasonText !== undefined) {
    fields.push(`"reasonText" = $${paramIndex++}`)
    values.push(data.reasonText)
  }

  if (data.isActive !== undefined) {
    fields.push(`"isActive" = $${paramIndex++}`)
    values.push(data.isActive)
  }

  if (fields.length === 0) {
    return getRejectReasonByID(reasonID, firmaID)
  }

  values.push(reasonID, firmaID)

  const query = `
    UPDATE reject_reasons
    SET ${fields.join(', ')}
    WHERE "reasonID" = $${paramIndex++} AND "firmaID" = $${paramIndex++}
    RETURNING *
  `

  const result = await pool.query(query, values)
  const updated = result.rows[0] || null

  if (updated) {
    notifyRejectReasonChange(firmaID, 'reject_reason_updated')
  }

  return updated
}

export async function deleteRejectReason(reasonID: string, firmaID: string): Promise<boolean> {
  const query = `
    DELETE FROM reject_reasons
    WHERE "reasonID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [reasonID, firmaID])
  const deleted = (result.rowCount ?? 0) > 0

  if (deleted) {
    notifyRejectReasonChange(firmaID, 'reject_reason_deleted')
  }

  return deleted
}

// ================================================
// ORDER REJECTS (история отказов водителей)
// ================================================

export async function createOrderReject(data: {
  rejectID: string
  orderID: string
  driverID: string
  reasonID?: string
  customReason?: string
}): Promise<OrderRejectDB> {
  const query = `
    INSERT INTO order_rejects (
      "rejectID", "orderID", "driverID", "reasonID", "customReason"
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `

  const values = [
    data.rejectID,
    data.orderID,
    data.driverID,
    data.reasonID || null,
    data.customReason || null,
  ]

  const result = await pool.query(query, values)
  return result.rows[0]
}

export async function getRejectsByOrderID(orderID: string): Promise<OrderRejectDB[]> {
  const query = `
    SELECT * FROM order_rejects
    WHERE "orderID" = $1
    ORDER BY "createdAt" ASC
  `

  const result = await pool.query(query, [orderID])
  return result.rows
}

export async function getRejectsByDriverID(driverID: string): Promise<OrderRejectDB[]> {
  const query = `
    SELECT * FROM order_rejects
    WHERE "driverID" = $1
    ORDER BY "createdAt" DESC
  `

  const result = await pool.query(query, [driverID])
  return result.rows
}

// Get reject statistics for driver
export async function getDriverRejectStats(driverID: string) {
  const query = `
    SELECT
      COUNT(*) as "totalRejects",
      COUNT(CASE WHEN "reasonID" IS NOT NULL THEN 1 END) as "withReason",
      COUNT(CASE WHEN "customReason" IS NOT NULL THEN 1 END) as "withCustomReason",
      COUNT(CASE WHEN DATE("createdAt") >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as "last7Days"
    FROM order_rejects
    WHERE "driverID" = $1
  `

  const result = await pool.query(query, [driverID])
  return result.rows[0]
}

// Get most common reject reasons for firma
export async function getTopRejectReasons(firmaID: string, limit: number = 10) {
  const query = `
    SELECT
      rr."reasonID",
      rr."reasonText",
      COUNT(ore."rejectID") as "rejectCount"
    FROM reject_reasons rr
    LEFT JOIN order_rejects ore ON ore."reasonID" = rr."reasonID"
    WHERE rr."firmaID" = $1
    GROUP BY rr."reasonID", rr."reasonText"
    ORDER BY "rejectCount" DESC, rr."reasonText" ASC
    LIMIT $2
  `

  const result = await pool.query(query, [firmaID, limit])
  return result.rows
}
