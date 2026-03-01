import pool from './db'

function getChannel(firmaID: string): string {
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyWorkerChange(
  firmaID: string,
  type: 'worker_created' | 'worker_updated' | 'worker_deleted'
) {
  pool
    .query(`SELECT pg_notify($1, $2)`, [getChannel(firmaID), JSON.stringify({ type, firmaID })])
    .catch(err => console.error(`[workers] pg_notify ${type} error:`, err))
}

export interface WorkerRecord {
  workerID: string
  userID: string | null
  firmaID: string
  name: string
  surname: string | null
  email: string | null
  phone: string | null
  phone2: string | null
  teamId: string | null
  isAdress: boolean
  status: number
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
  lastLoginAt?: Date | null
  pushNotificationsEnabled?: boolean | null
  geolocationEnabled?: boolean | null
  hasPushSubscription?: boolean | null
  pwaVersion?: string | null
  osVersion?: string | null
  batteryLevel?: number | null
  batteryStatus?: string | null
}

export async function createWorker(data: {
  workerID: string
  userID?: string
  firmaID: string
  name: string
  surname?: string
  email?: string
  phone?: string
  phone2?: string
  teamId?: string
  isAdress?: boolean
  status?: number
  country?: string
  street?: string
  postalCode?: string
  city?: string
  houseNumber?: string
  apartment?: string
  district?: string
  latitude?: number
  longitude?: number
}): Promise<WorkerRecord> {
  const workerID = data.workerID

  const query = `
    INSERT INTO workers (
      "workerID", "userID", "firmaID", "name", "surname", "email",
      "phone", "phone2", "teamId", "isAdress", "status",
      "country", "street", "postalCode", "city", "houseNumber",
      "apartment", "district", "latitude", "longitude"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `

  const values = [
    workerID,
    data.userID || null,
    data.firmaID,
    data.name,
    data.surname || null,
    data.email || null,
    data.phone || null,
    data.phone2 || null,
    data.teamId || null,
    data.isAdress ?? false,
    data.status ?? 0,
    data.country || null,
    data.street || null,
    data.postalCode || null,
    data.city || null,
    data.houseNumber || null,
    data.apartment || null,
    data.district || null,
    data.latitude || null,
    data.longitude || null,
  ]

  try {
    const result = await pool.query(query, values)
    const created = result.rows[0]
    notifyWorkerChange(data.firmaID, 'worker_created')
    return created
  } catch (error) {
    console.error('[createWorker] Error:', error)
    throw error
  }
}

export async function getWorkersByFirmaID(firmaID: string): Promise<WorkerRecord[]> {
  const query = `
    SELECT w.*, t."teamName",
           u."date" AS "lastLoginAt",
           u."pushNotificationsEnabled",
           u."geolocationEnabled",
           u."pwaVersion",
           u."osVersion",
           u."batteryLevel",
           u."batteryStatus",
           EXISTS(SELECT 1 FROM push_subscriptions ps WHERE ps."userID" = w."userID") AS "hasPushSubscription"
    FROM workers w
    LEFT JOIN teams t ON w."teamId" = t."teamID"
    LEFT JOIN users u ON w."userID" = u."userID"
    WHERE w."firmaID" = $1
    ORDER BY w."name"
  `

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getWorkersByFirmaID] Error:', error)
    throw error
  }
}

export async function getWorkerByUserID(
  userID: string,
  firmaID: string
): Promise<WorkerRecord | null> {
  const query = `SELECT * FROM workers WHERE "userID" = $1 AND "firmaID" = $2 LIMIT 1`

  try {
    const result = await pool.query(query, [userID, firmaID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getWorkerByUserID] Error:', error)
    throw error
  }
}

export async function updateWorker(
  workerID: string,
  firmaID: string,
  data: {
    name?: string
    surname?: string
    email?: string
    phone?: string
    phone2?: string
    teamId?: string | null
    isAdress?: boolean
    status?: number
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
): Promise<WorkerRecord | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let idx = 1

  if (data.name !== undefined) {
    setClauses.push(`"name" = $${idx++}`)
    values.push(data.name)
  }
  if (data.surname !== undefined) {
    setClauses.push(`"surname" = $${idx++}`)
    values.push(data.surname)
  }
  if (data.email !== undefined) {
    setClauses.push(`"email" = $${idx++}`)
    values.push(data.email)
  }
  if (data.phone !== undefined) {
    setClauses.push(`"phone" = $${idx++}`)
    values.push(data.phone)
  }
  if (data.phone2 !== undefined) {
    setClauses.push(`"phone2" = $${idx++}`)
    values.push(data.phone2)
  }
  if (data.teamId !== undefined) {
    setClauses.push(`"teamId" = $${idx++}`)
    values.push(data.teamId || null)
  }
  if (data.isAdress !== undefined) {
    setClauses.push(`"isAdress" = $${idx++}`)
    values.push(data.isAdress)
  }
  if (data.status !== undefined) {
    setClauses.push(`"status" = $${idx++}`)
    values.push(data.status)
  }
  if (data.country !== undefined) {
    setClauses.push(`"country" = $${idx++}`)
    values.push(data.country)
  }
  if (data.street !== undefined) {
    setClauses.push(`"street" = $${idx++}`)
    values.push(data.street)
  }
  if (data.postalCode !== undefined) {
    setClauses.push(`"postalCode" = $${idx++}`)
    values.push(data.postalCode)
  }
  if (data.city !== undefined) {
    setClauses.push(`"city" = $${idx++}`)
    values.push(data.city)
  }
  if (data.houseNumber !== undefined) {
    setClauses.push(`"houseNumber" = $${idx++}`)
    values.push(data.houseNumber)
  }
  if (data.apartment !== undefined) {
    setClauses.push(`"apartment" = $${idx++}`)
    values.push(data.apartment)
  }
  if (data.district !== undefined) {
    setClauses.push(`"district" = $${idx++}`)
    values.push(data.district)
  }
  if (data.latitude !== undefined) {
    setClauses.push(`"latitude" = $${idx++}`)
    values.push(data.latitude)
  }
  if (data.longitude !== undefined) {
    setClauses.push(`"longitude" = $${idx++}`)
    values.push(data.longitude)
  }

  if (setClauses.length === 0) return null

  values.push(workerID, firmaID)
  const query = `
    UPDATE workers SET ${setClauses.join(', ')}
    WHERE "workerID" = $${idx++} AND "firmaID" = $${idx}
    RETURNING *
  `

  try {
    const result = await pool.query(query, values)
    const updated = result.rows.length > 0 ? result.rows[0] : null
    if (updated) notifyWorkerChange(firmaID, 'worker_updated')
    return updated
  } catch (error) {
    console.error('[updateWorker] Error:', error)
    throw error
  }
}

export async function deleteWorker(workerID: string, firmaID: string): Promise<boolean> {
  const query = `DELETE FROM workers WHERE "workerID" = $1 AND "firmaID" = $2`

  try {
    const result = await pool.query(query, [workerID, firmaID])
    const deleted = (result.rowCount ?? 0) > 0
    if (deleted) notifyWorkerChange(firmaID, 'worker_deleted')
    return deleted
  } catch (error) {
    console.error('[deleteWorker] Error:', error)
    throw error
  }
}
