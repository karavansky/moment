import pool from './db'
import { generateId } from './generateId'

function getChannel(firmaID: string): string {
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyServiceChange(firmaID: string, type: 'service_created' | 'service_updated' | 'service_deleted') {
  pool.query(`SELECT pg_notify($1, $2)`, [
    getChannel(firmaID),
    JSON.stringify({ type, firmaID }),
  ]).catch(err => console.error(`[services] pg_notify ${type} error:`, err))
}

export interface ServiceRecord {
  serviceID: string
  firmaID: string
  name: string
  description: string | null
  duration: number
  price: number | null
  parentId: string | null
  isGroup: boolean
  order: number
  createdAt: Date
}

export async function createService(
  firmaID: string,
  data: {
    name: string
    description?: string
    duration?: number
    price?: number
    parentId?: string | null
    isGroup?: boolean
    order?: number
  }
): Promise<ServiceRecord> {
  const serviceID = generateId(20)

  const query = `
    INSERT INTO services ("serviceID", "firmaID", "name", "description", "duration", "price", "parentId", "isGroup", "order")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `

  const values = [
    serviceID,
    firmaID,
    data.name,
    data.description || null,
    data.duration || 0,
    data.price ?? null,
    data.parentId || null,
    data.isGroup || false,
    data.order || 0,
  ]

  try {
    const result = await pool.query(query, values)
    const created = result.rows[0]
    notifyServiceChange(firmaID, 'service_created')
    return created
  } catch (error) {
    console.error('[createService] Error:', error)
    throw error
  }
}

export async function getServicesByFirmaID(firmaID: string): Promise<ServiceRecord[]> {
  const query = `
    SELECT * FROM services
    WHERE "firmaID" = $1
    ORDER BY "order", "name"
  `

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getServicesByFirmaID] Error:', error)
    throw error
  }
}

export async function updateService(
  serviceID: string,
  firmaID: string,
  data: {
    name?: string
    description?: string
    duration?: number
    price?: number | null
    parentId?: string | null
    isGroup?: boolean
    order?: number
  }
): Promise<ServiceRecord | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let idx = 1

  if (data.name !== undefined) { setClauses.push(`"name" = $${idx++}`); values.push(data.name) }
  if (data.description !== undefined) { setClauses.push(`"description" = $${idx++}`); values.push(data.description) }
  if (data.duration !== undefined) { setClauses.push(`"duration" = $${idx++}`); values.push(data.duration) }
  if (data.price !== undefined) { setClauses.push(`"price" = $${idx++}`); values.push(data.price) }
  if (data.parentId !== undefined) { setClauses.push(`"parentId" = $${idx++}`); values.push(data.parentId) }
  if (data.isGroup !== undefined) { setClauses.push(`"isGroup" = $${idx++}`); values.push(data.isGroup) }
  if (data.order !== undefined) { setClauses.push(`"order" = $${idx++}`); values.push(data.order) }

  if (setClauses.length === 0) return null

  values.push(serviceID, firmaID)
  const query = `
    UPDATE services SET ${setClauses.join(', ')}
    WHERE "serviceID" = $${idx++} AND "firmaID" = $${idx}
    RETURNING *
  `

  try {
    const result = await pool.query(query, values)
    const updated = result.rows.length > 0 ? result.rows[0] : null
    if (updated) notifyServiceChange(firmaID, 'service_updated')
    return updated
  } catch (error) {
    console.error('[updateService] Error:', error)
    throw error
  }
}

export async function deleteService(serviceID: string, firmaID: string): Promise<boolean> {
  const query = `DELETE FROM services WHERE "serviceID" = $1 AND "firmaID" = $2`

  try {
    const result = await pool.query(query, [serviceID, firmaID])
    const deleted = (result.rowCount ?? 0) > 0
    if (deleted) notifyServiceChange(firmaID, 'service_deleted')
    return deleted
  } catch (error) {
    console.error('[deleteService] Error:', error)
    throw error
  }
}
