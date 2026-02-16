import pool from './db'
import { generateId } from './generateId'

function getChannel(firmaID: string): string {
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyAppointmentChange(
  firmaID: string,
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted',
  data: { appointmentID: string; workerIds: string[]; clientID: string; isOpen?: boolean; openedAt?: Date | null; closedAt?: Date | null }
) {
  const channel = getChannel(firmaID)
  pool.query(`SELECT pg_notify($1, $2)`, [
    channel,
    JSON.stringify({
      type,
      appointmentID: data.appointmentID,
      workerIds: data.workerIds,
      clientID: data.clientID,
      isOpen: data.isOpen,
      openedAt: data.openedAt,
      closedAt: data.closedAt,
      firmaID,
    }),
  ]).catch(err => console.error(`[appointments] pg_notify ${type} error:`, err))
}

export interface AppointmentRecord {
  appointmentID: string
  firmaID: string
  userID: string
  clientID: string
  workerId: string
  date: Date
  isFixedTime: boolean
  startTime: Date
  endTime: Date
  duration: number
  fahrzeit: number
  isOpen: boolean
  openedAt: Date | null
  closedAt: Date | null
  latitude: number | null
  longitude: number | null
  createdAt: Date
}

export async function createAppointment(
  firmaID: string,
  data: {
    userID: string
    clientID: string
    workerIds: string[]
    date: Date | string
    isFixedTime?: boolean
    startTime: Date | string
    endTime: Date | string
    duration: number
    fahrzeit?: number
    latitude?: number
    longitude?: number
    serviceIds?: string[]
  }
): Promise<AppointmentRecord> {
  const appointmentID = generateId(20)
  const client = await pool.connect()
  const primaryWorkerId = data.workerIds[0] || ''

  try {
    await client.query('BEGIN')

    const query = `
      INSERT INTO appointments (
        "appointmentID", "firmaID", "userID", "clientID", "workerId",
        "date", "isFixedTime", "startTime", "endTime", "duration", "fahrzeit",
        "latitude", "longitude"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `

    const values = [
      appointmentID, firmaID, data.userID, data.clientID, primaryWorkerId,
      data.date, data.isFixedTime || false, data.startTime, data.endTime,
      data.duration, data.fahrzeit || 0, data.latitude || null, data.longitude || null,
    ]

    const result = await client.query(query, values)

    // Insert appointment_workers (many-to-many)
    if (data.workerIds.length > 0) {
      const workerValues = data.workerIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ')
      await client.query(
        `INSERT INTO appointment_workers ("appointmentID", "workerID") VALUES ${workerValues}`,
        [appointmentID, ...data.workerIds]
      )
    }

    // Insert appointment_services
    if (data.serviceIds && data.serviceIds.length > 0) {
      const serviceValues = data.serviceIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ')
      await client.query(
        `INSERT INTO appointment_services ("appointmentID", "serviceID") VALUES ${serviceValues}`,
        [appointmentID, ...data.serviceIds]
      )
    }

    await client.query('COMMIT')

    const created = result.rows[0]
    notifyAppointmentChange(firmaID, 'appointment_created', {
      appointmentID: created.appointmentID,
      workerIds: data.workerIds,
      clientID: created.clientID,
      isOpen: created.isOpen,
    })

    return created
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[createAppointment] Error:', error)
    throw error
  } finally {
    client.release()
  }
}

export async function getAppointmentsByFirmaID(firmaID: string): Promise<any[]> {
  const query = `
    SELECT
      a.*,
      json_build_object(
        'id', c."clientID", 'name', c."name", 'surname', c."surname",
        'email', c."email", 'phone', c."phone", 'phone2', c."phone2",
        'country', c."country", 'street', c."street", 'postalCode', c."postalCode",
        'city', c."city", 'houseNumber', c."houseNumber", 'apartment', c."apartment",
        'district', c."district", 'latitude', c."latitude", 'longitude', c."longitude",
        'status', c."status", 'firmaID', c."firmaID"
      ) AS client,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', w2."workerID", 'name', w2."name", 'surname', w2."surname",
              'email', w2."email", 'firmaID', w2."firmaID", 'teamId', w2."teamId",
              'status', w2."status"
            )
          )
          FROM appointment_workers aw2
          JOIN workers w2 ON aw2."workerID" = w2."workerID"
          WHERE aw2."appointmentID" = a."appointmentID"
        ),
        '[]'
      ) AS workers_data,
      COALESCE(
        (
          SELECT array_agg(aw3."workerID")
          FROM appointment_workers aw3
          WHERE aw3."appointmentID" = a."appointmentID"
        ),
        ARRAY[]::VARCHAR[]
      ) AS "workerIds",
      COALESCE(
        json_agg(
          json_build_object(
            'id', s."serviceID", 'name', s."name", 'duration', s."duration",
            'price', s."price", 'parentId', s."parentId", 'isGroup', s."isGroup",
            'firmaID', s."firmaID", 'order', s."order"
          )
        ) FILTER (WHERE s."serviceID" IS NOT NULL),
        '[]'
      ) AS services
    FROM appointments a
    JOIN clients c ON a."clientID" = c."clientID"
    LEFT JOIN appointment_services aps ON a."appointmentID" = aps."appointmentID"
    LEFT JOIN services s ON aps."serviceID" = s."serviceID"
    WHERE a."firmaID" = $1
    GROUP BY a."appointmentID", c."clientID"
    ORDER BY a."date", a."startTime"
  `

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getAppointmentsByFirmaID] Error:', error)
    throw error
  }
}

export async function updateAppointment(
  appointmentID: string,
  firmaID: string,
  data: {
    date?: Date | string
    isFixedTime?: boolean
    startTime?: Date | string
    endTime?: Date | string
    duration?: number
    fahrzeit?: number
    workerIds?: string[]
    clientID?: string
    isOpen?: boolean
    openedAt?: Date | string | null
    closedAt?: Date | string | null
    latitude?: number | null
    longitude?: number | null
    serviceIds?: string[]
  }
): Promise<AppointmentRecord | null> {
  const dbClient = await pool.connect()

  try {
    await dbClient.query('BEGIN')

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 1

    if (data.date !== undefined) { setClauses.push(`"date" = $${idx++}`); values.push(data.date) }
    if (data.isFixedTime !== undefined) { setClauses.push(`"isFixedTime" = $${idx++}`); values.push(data.isFixedTime) }
    if (data.startTime !== undefined) { setClauses.push(`"startTime" = $${idx++}`); values.push(data.startTime) }
    if (data.endTime !== undefined) { setClauses.push(`"endTime" = $${idx++}`); values.push(data.endTime) }
    if (data.duration !== undefined) { setClauses.push(`"duration" = $${idx++}`); values.push(data.duration) }
    if (data.fahrzeit !== undefined) { setClauses.push(`"fahrzeit" = $${idx++}`); values.push(data.fahrzeit) }
    if (data.clientID !== undefined) { setClauses.push(`"clientID" = $${idx++}`); values.push(data.clientID) }
    if (data.isOpen !== undefined) { setClauses.push(`"isOpen" = $${idx++}`); values.push(data.isOpen) }
    if (data.openedAt !== undefined) { setClauses.push(`"openedAt" = $${idx++}`); values.push(data.openedAt) }
    if (data.closedAt !== undefined) { setClauses.push(`"closedAt" = $${idx++}`); values.push(data.closedAt) }
    if (data.latitude !== undefined) { setClauses.push(`"latitude" = $${idx++}`); values.push(data.latitude) }
    if (data.longitude !== undefined) { setClauses.push(`"longitude" = $${idx++}`); values.push(data.longitude) }
    // Обновляем workerId (legacy) первым из массива
    if (data.workerIds !== undefined && data.workerIds.length > 0) {
      setClauses.push(`"workerId" = $${idx++}`)
      values.push(data.workerIds[0])
    }

    let result = null
    if (setClauses.length > 0) {
      values.push(appointmentID, firmaID)
      const query = `
        UPDATE appointments SET ${setClauses.join(', ')}
        WHERE "appointmentID" = $${idx++} AND "firmaID" = $${idx}
        RETURNING *
      `
      const res = await dbClient.query(query, values)
      result = res.rows.length > 0 ? res.rows[0] : null
    } else {
      // Нет полей для UPDATE, но могут быть workerIds/serviceIds
      const res = await dbClient.query(
        `SELECT * FROM appointments WHERE "appointmentID" = $1 AND "firmaID" = $2`,
        [appointmentID, firmaID]
      )
      result = res.rows.length > 0 ? res.rows[0] : null
    }

    // Update appointment_workers if provided
    if (data.workerIds !== undefined) {
      await dbClient.query(
        `DELETE FROM appointment_workers WHERE "appointmentID" = $1`,
        [appointmentID]
      )
      if (data.workerIds.length > 0) {
        const workerValues = data.workerIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ')
        await dbClient.query(
          `INSERT INTO appointment_workers ("appointmentID", "workerID") VALUES ${workerValues}`,
          [appointmentID, ...data.workerIds]
        )
      }
    }

    // Update services if provided
    if (data.serviceIds !== undefined) {
      await dbClient.query(
        `DELETE FROM appointment_services WHERE "appointmentID" = $1`,
        [appointmentID]
      )
      if (data.serviceIds.length > 0) {
        const serviceValues = data.serviceIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ')
        await dbClient.query(
          `INSERT INTO appointment_services ("appointmentID", "serviceID") VALUES ${serviceValues}`,
          [appointmentID, ...data.serviceIds]
        )
      }
    }

    await dbClient.query('COMMIT')

    if (result) {
      // Получаем актуальный список workerIds после обновления
      const workerIdsResult = await pool.query(
        `SELECT "workerID" FROM appointment_workers WHERE "appointmentID" = $1`,
        [appointmentID]
      )
      const workerIds = workerIdsResult.rows.map((r: any) => r.workerID)

      notifyAppointmentChange(firmaID, 'appointment_updated', {
        appointmentID: result.appointmentID,
        workerIds,
        clientID: result.clientID,
        isOpen: result.isOpen,
        openedAt: result.openedAt,
        closedAt: result.closedAt,
      })
    }

    return result
  } catch (error) {
    await dbClient.query('ROLLBACK')
    console.error('[updateAppointment] Error:', error)
    throw error
  } finally {
    dbClient.release()
  }
}

export async function deleteAppointment(appointmentID: string, firmaID: string): Promise<boolean> {
  try {
    // Fetch workerIds and clientID before delete for notification
    const existing = await pool.query(
      `SELECT a."appointmentID", a."clientID",
              COALESCE(array_agg(aw."workerID"), ARRAY[]::VARCHAR[]) AS "workerIds"
       FROM appointments a
       LEFT JOIN appointment_workers aw ON a."appointmentID" = aw."appointmentID"
       WHERE a."appointmentID" = $1 AND a."firmaID" = $2
       GROUP BY a."appointmentID"`,
      [appointmentID, firmaID]
    )

    const result = await pool.query(
      `DELETE FROM appointments WHERE "appointmentID" = $1 AND "firmaID" = $2`,
      [appointmentID, firmaID]
    )

    const deleted = (result.rowCount ?? 0) > 0
    if (deleted && existing.rows[0]) {
      const row = existing.rows[0]
      notifyAppointmentChange(firmaID, 'appointment_deleted', {
        appointmentID: row.appointmentID,
        workerIds: (row.workerIds || []).filter(Boolean),
        clientID: row.clientID,
      })
    }

    return deleted
  } catch (error) {
    console.error('[deleteAppointment] Error:', error)
    throw error
  }
}
