import pool from './db'
import { generateId } from './generate-id'

function getChannel(firmaID: string): string {
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyClientChange(firmaID: string, type: 'client_created' | 'client_updated' | 'client_deleted') {
  pool.query(`SELECT pg_notify($1, $2)`, [
    getChannel(firmaID),
    JSON.stringify({ type, firmaID }),
  ]).catch(err => console.error(`[clients] pg_notify ${type} error:`, err))
}

export interface ClientRecord {
  clientID: string
  userID: string | null
  firmaID: string
  name: string
  surname: string | null
  email: string | null
  phone: string | null
  phone2: string | null
  status: number
  groupeID: string | null
  country: string | null
  street: string | null
  postalCode: string | null
  city: string | null
  houseNumber: string | null
  apartment: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  createdAt: Date
}

export async function createClient(data: {
  userID?: string
  firmaID: string
  name: string
  surname?: string
  email?: string
  phone?: string
  phone2?: string
  status?: number
  groupeID?: string
  country?: string
  street?: string
  postalCode?: string
  city?: string
  houseNumber?: string
  apartment?: string
  district?: string
  latitude?: number
  longitude?: number
}): Promise<ClientRecord> {
  const clientID = generateId()

  const query = `
    INSERT INTO clients (
      "clientID", "userID", "firmaID", "name", "surname", "email",
      "phone", "phone2", "status", "groupeID",
      "country", "street", "postalCode", "city", "houseNumber",
      "apartment", "district", "latitude", "longitude"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `

  const values = [
    clientID, data.userID || null, data.firmaID, data.name, data.surname || null,
    data.email || null, data.phone || null, data.phone2 || null,
    data.status ?? 0, data.groupeID || null,
    data.country || null, data.street || null, data.postalCode || null,
    data.city || null, data.houseNumber || null, data.apartment || null,
    data.district || null, data.latitude || null, data.longitude || null,
  ]

  try {
    const result = await pool.query(query, values)
    const created = result.rows[0]
    notifyClientChange(data.firmaID, 'client_created')
    return created
  } catch (error) {
    console.error('[createClient] Error:', error)
    throw error
  }
}

export async function getClientsByFirmaID(firmaID: string): Promise<ClientRecord[]> {
  const query = `
    SELECT c.*, g."groupeName"
    FROM clients c
    LEFT JOIN groupes g ON c."groupeID" = g."groupeID"
    WHERE c."firmaID" = $1
    ORDER BY c."name"
  `

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getClientsByFirmaID] Error:', error)
    throw error
  }
}

export async function getClientByUserID(userID: string, firmaID: string): Promise<ClientRecord | null> {
  const query = `SELECT * FROM clients WHERE "userID" = $1 AND "firmaID" = $2 LIMIT 1`

  try {
    const result = await pool.query(query, [userID, firmaID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getClientByUserID] Error:', error)
    throw error
  }
}

export async function updateClient(
  clientID: string,
  firmaID: string,
  data: {
    name?: string
    surname?: string
    email?: string
    phone?: string
    phone2?: string
    status?: number
    groupeID?: string | null
    country?: string
    street?: string
    postalCode?: string
    city?: string
    houseNumber?: string
    apartment?: string
    district?: string
    latitude?: number | null
    longitude?: number | null
  }
): Promise<ClientRecord | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let idx = 1

  if (data.name !== undefined) { setClauses.push(`"name" = $${idx++}`); values.push(data.name) }
  if (data.surname !== undefined) { setClauses.push(`"surname" = $${idx++}`); values.push(data.surname) }
  if (data.email !== undefined) { setClauses.push(`"email" = $${idx++}`); values.push(data.email) }
  if (data.phone !== undefined) { setClauses.push(`"phone" = $${idx++}`); values.push(data.phone) }
  if (data.phone2 !== undefined) { setClauses.push(`"phone2" = $${idx++}`); values.push(data.phone2) }
  if (data.status !== undefined) { setClauses.push(`"status" = $${idx++}`); values.push(data.status) }
  if (data.groupeID !== undefined) { setClauses.push(`"groupeID" = $${idx++}`); values.push(data.groupeID) }
  if (data.country !== undefined) { setClauses.push(`"country" = $${idx++}`); values.push(data.country) }
  if (data.street !== undefined) { setClauses.push(`"street" = $${idx++}`); values.push(data.street) }
  if (data.postalCode !== undefined) { setClauses.push(`"postalCode" = $${idx++}`); values.push(data.postalCode) }
  if (data.city !== undefined) { setClauses.push(`"city" = $${idx++}`); values.push(data.city) }
  if (data.houseNumber !== undefined) { setClauses.push(`"houseNumber" = $${idx++}`); values.push(data.houseNumber) }
  if (data.apartment !== undefined) { setClauses.push(`"apartment" = $${idx++}`); values.push(data.apartment) }
  if (data.district !== undefined) { setClauses.push(`"district" = $${idx++}`); values.push(data.district) }
  if (data.latitude !== undefined) { setClauses.push(`"latitude" = $${idx++}`); values.push(data.latitude) }
  if (data.longitude !== undefined) { setClauses.push(`"longitude" = $${idx++}`); values.push(data.longitude) }

  if (setClauses.length === 0) return null

  values.push(clientID, firmaID)
  const query = `
    UPDATE clients SET ${setClauses.join(', ')}
    WHERE "clientID" = $${idx++} AND "firmaID" = $${idx}
    RETURNING *
  `

  try {
    const result = await pool.query(query, values)
    const updated = result.rows.length > 0 ? result.rows[0] : null
    if (updated) notifyClientChange(firmaID, 'client_updated')
    return updated
  } catch (error) {
    console.error('[updateClient] Error:', error)
    throw error
  }
}

export async function deleteClient(clientID: string, firmaID: string): Promise<boolean> {
  const query = `DELETE FROM clients WHERE "clientID" = $1 AND "firmaID" = $2`

  try {
    const result = await pool.query(query, [clientID, firmaID])
    const deleted = (result.rowCount ?? 0) > 0
    if (deleted) notifyClientChange(firmaID, 'client_deleted')
    return deleted
  } catch (error) {
    console.error('[deleteClient] Error:', error)
    throw error
  }
}
