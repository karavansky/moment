import pool from './db'
import { generateId } from './generate-id'
import { deleteS3File } from './s3'
import { sendPushToWorkers, sendPushToDirectors } from './push-notifications'

function getChannel(firmaID: string): string {
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyAppointmentChange(
  firmaID: string,
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted',
  data: {
    appointmentID: string
    workerIds: string[]
    clientID: string
    isOpen?: boolean
    openedAt?: Date | null
    closedAt?: Date | null
  }
) {
  const channel = getChannel(firmaID)
  pool
    .query(`SELECT pg_notify($1, $2)`, [
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
    ])
    .catch(err => console.error(`[appointments] pg_notify ${type} error:`, err))
}

async function getClientName(clientID: string): Promise<string> {
  try {
    const result = await pool.query(`SELECT "name", "surname" FROM clients WHERE "clientID" = $1`, [
      clientID,
    ])
    if (result.rows[0]) {
      return `${result.rows[0].name} ${result.rows[0].surname || ''}`.trim()
    }
  } catch {}
  return 'a client'
}

async function getWorkerNames(workerIds: string[]): Promise<string> {
  if (workerIds.length === 0) return ''
  try {
    const placeholders = workerIds.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query(
      `SELECT "name", "surname" FROM workers WHERE "workerID" IN (${placeholders})`,
      workerIds
    )
    return result.rows.map((r: any) => `${r.name} ${r.surname || ''}`.trim()).join(', ')
  } catch {}
  return ''
}

/**
 * Send push notifications for appointment changes. Fire-and-forget.
 */
function sendAppointmentPush(
  firmaID: string,
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted',
  data: {
    appointmentID: string
    workerIds: string[]
    clientID: string
    isOpen?: boolean
    previousWorkerIds?: string[]
    previousIsOpen?: boolean
    timeChanged?: boolean
  }
) {
  // Fire-and-forget: don't block API response
  ;(async () => {
    try {
      const clientName = await getClientName(data.clientID)

      if (type === 'appointment_created') {
        await sendPushToWorkers(data.workerIds, {
          title: 'New Appointment',
          body: `You have been assigned to an appointment with ${clientName}.`,
          url: '/dienstplan',
          tag: `appointment-${data.appointmentID}`,
        })
      }

      if (type === 'appointment_updated') {
        // isOpen transition → push to directors
        if (data.isOpen === true && data.previousIsOpen !== true) {
          const workerNames = await getWorkerNames(data.workerIds)
          await sendPushToDirectors(firmaID, {
            title: 'Appointment Started',
            body: `${workerNames} started an appointment with ${clientName}.`,
            url: `/map/${data.appointmentID}`,
            tag: `appointment-open-${data.appointmentID}`,
          })
        } else if (data.isOpen === false && data.previousIsOpen === true) {
          const workerNames = await getWorkerNames(data.workerIds)
          await sendPushToDirectors(firmaID, {
            title: 'Appointment Finished',
            body: `${workerNames} finished an appointment with ${clientName}.`,
            url: `/dienstplan`,
            tag: `appointment-close-${data.appointmentID}`,
          })
        } else if (data.timeChanged) {
          console.log(`[push-debug] Triggering push to workers (${data.workerIds}) for timeChanged`)
          // Time or date changed -> push to workers
          await sendPushToWorkers(data.workerIds, {
            title: 'Appointment Time Changed',
            body: `Your appointment with ${clientName} has been rescheduled.`,
            url: '/dienstplan',
            tag: `appointment-rescheduled-${data.appointmentID}`,
          })
        } else {
          console.log(
            `[push-debug] No push condition met. isOpen: ${data.isOpen}, prevIsOpen: ${data.previousIsOpen}, timeChanged: ${data.timeChanged}`
          )
        }

        // Worker additions/removals
        if (data.previousWorkerIds) {
          const added = data.workerIds.filter(id => !data.previousWorkerIds!.includes(id))
          const removed = data.previousWorkerIds.filter(id => !data.workerIds.includes(id))

          if (added.length > 0) {
            await sendPushToWorkers(added, {
              title: 'New Assignment',
              body: `You have been assigned to an appointment with ${clientName}.`,
              url: '/dienstplan',
              tag: `appointment-${data.appointmentID}`,
            })
          }
          if (removed.length > 0) {
            await sendPushToWorkers(removed, {
              title: 'Assignment Removed',
              body: `You have been removed from an appointment with ${clientName}.`,
              url: '/dienstplan',
              tag: `appointment-${data.appointmentID}`,
            })
          }
        }
      }

      if (type === 'appointment_deleted') {
        await sendPushToWorkers(data.workerIds, {
          title: 'Appointment Cancelled',
          body: `Your appointment with ${clientName} has been cancelled.`,
          url: '/dienstplan',
          tag: `appointment-${data.appointmentID}`,
        })
      }
    } catch (err) {
      console.error(`[appointments] Push notification error for ${type}:`, err)
    }
  })()
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
  const appointmentID = generateId()
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
      appointmentID,
      firmaID,
      data.userID,
      data.clientID,
      primaryWorkerId,
      data.date,
      data.isFixedTime || false,
      data.startTime,
      data.endTime,
      data.duration,
      data.fahrzeit || 0,
      data.latitude || null,
      data.longitude || null,
    ]

    const result = await client.query(query, values)

    // Insert appointment_workers (many-to-many)
    if (data.workerIds.length > 0) {
      const workerValues = data.workerIds.map((_, i) => `($1, $${i + 2})`).join(', ')
      await client.query(
        `INSERT INTO appointment_workers ("appointmentID", "workerID") VALUES ${workerValues}`,
        [appointmentID, ...data.workerIds]
      )
    }

    // Insert appointment_services
    if (data.serviceIds && data.serviceIds.length > 0) {
      const serviceValues = data.serviceIds.map((_, i) => `($1, $${i + 2})`).join(', ')
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
    sendAppointmentPush(firmaID, 'appointment_created', {
      appointmentID: created.appointmentID,
      workerIds: data.workerIds,
      clientID: created.clientID,
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

    // Fetch existing appointment to diff changes BEFORE doing updates
    const existingRes = await dbClient.query(
      `SELECT "isOpen", "date", "startTime" FROM appointments WHERE "appointmentID" = $1 AND "firmaID" = $2`,
      [appointmentID, firmaID]
    )
    const existingAppointment = existingRes.rows[0]

    let previousIsOpen: boolean | undefined
    let timeChanged = false

    if (existingAppointment) {
      previousIsOpen = existingAppointment.isOpen

      // PG creates Date objects in Local Time matching the wall-clock text from the DB.
      // So we must use .getFullYear() / .getHours() etc. to get the actual calendar representation.
      const ed = existingAppointment.date
      const existingDateStr = ed
        ? `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`
        : ''

      const newDateStr =
        data.date && typeof data.date === 'string'
          ? data.date.split('T')[0]
          : data.date
            ? new Date(data.date).toISOString().split('T')[0]
            : existingDateStr

      const isDateChanged = newDateStr !== existingDateStr

      // Format "HH:mm" directly from both to prevent time-shifting
      const est = existingAppointment.startTime
      const existingTimeStr = est
        ? `${String(est.getHours()).padStart(2, '0')}:${String(est.getMinutes()).padStart(2, '0')}`
        : ''

      // data.startTime from UI comes as ISO string (UTC). But wait!
      // If UI sends '2026-02-28T10:00:00.000Z', what is '10:00'? Is it local or UTC?
      // UI created it via .setHours() from local time, so the string representation might be UTC shifted!
      // Example: local 10:00 AM -> UI sends '09:00:00.000Z'.
      // If UI sends '09:00:00.000Z', how do we compare to DB wall-clock?
      // new Date('2026-02-28T09:00:00.000Z').getHours() gives us Local Time 10!
      const newTimeStr = data.startTime
        ? `${String(new Date(data.startTime).getHours()).padStart(2, '0')}:${String(new Date(data.startTime).getMinutes()).padStart(2, '0')}`
        : existingTimeStr

      const isTimeChanged = newTimeStr !== existingTimeStr

      console.log(`[push-debug] date: ${newDateStr} vs ${existingDateStr} -> ${isDateChanged}`)
      console.log(`[push-debug] startTime: ${newTimeStr} vs ${existingTimeStr} -> ${isTimeChanged}`)

      if (isDateChanged || isTimeChanged) {
        timeChanged = true
      }
      console.log(`[push-debug] timeChanged evaluated to: ${timeChanged}`)
    }

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 1

    if (data.date !== undefined) {
      setClauses.push(`"date" = $${idx++}`)
      values.push(data.date)
    }
    if (data.isFixedTime !== undefined) {
      setClauses.push(`"isFixedTime" = $${idx++}`)
      values.push(data.isFixedTime)
    }
    if (data.startTime !== undefined) {
      setClauses.push(`"startTime" = $${idx++}`)
      values.push(data.startTime)
    }
    if (data.endTime !== undefined) {
      setClauses.push(`"endTime" = $${idx++}`)
      values.push(data.endTime)
    }
    if (data.duration !== undefined) {
      setClauses.push(`"duration" = $${idx++}`)
      values.push(data.duration)
    }
    if (data.fahrzeit !== undefined) {
      setClauses.push(`"fahrzeit" = $${idx++}`)
      values.push(data.fahrzeit)
    }
    if (data.clientID !== undefined) {
      setClauses.push(`"clientID" = $${idx++}`)
      values.push(data.clientID)
    }
    if (data.isOpen !== undefined) {
      setClauses.push(`"isOpen" = $${idx++}`)
      values.push(data.isOpen)
    }
    if (data.openedAt !== undefined) {
      setClauses.push(`"openedAt" = $${idx++}`)
      values.push(data.openedAt)
    }
    if (data.closedAt !== undefined) {
      setClauses.push(`"closedAt" = $${idx++}`)
      values.push(data.closedAt)
    }
    if (data.latitude !== undefined) {
      setClauses.push(`"latitude" = $${idx++}`)
      values.push(data.latitude)
    }
    if (data.longitude !== undefined) {
      setClauses.push(`"longitude" = $${idx++}`)
      values.push(data.longitude)
    }
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

    // Capture previous workerIds before updating (for push notification diff)
    let previousWorkerIds: string[] | undefined
    if (data.workerIds !== undefined) {
      const prev = await dbClient.query(
        `SELECT "workerID" FROM appointment_workers WHERE "appointmentID" = $1`,
        [appointmentID]
      )
      previousWorkerIds = prev.rows.map((r: any) => r.workerID)
    }

    // Update appointment_workers if provided
    if (data.workerIds !== undefined) {
      await dbClient.query(`DELETE FROM appointment_workers WHERE "appointmentID" = $1`, [
        appointmentID,
      ])
      if (data.workerIds.length > 0) {
        const workerValues = data.workerIds.map((_, i) => `($1, $${i + 2})`).join(', ')
        await dbClient.query(
          `INSERT INTO appointment_workers ("appointmentID", "workerID") VALUES ${workerValues}`,
          [appointmentID, ...data.workerIds]
        )
      }
    }

    // Update services if provided
    if (data.serviceIds !== undefined) {
      await dbClient.query(`DELETE FROM appointment_services WHERE "appointmentID" = $1`, [
        appointmentID,
      ])
      if (data.serviceIds.length > 0) {
        const serviceValues = data.serviceIds.map((_, i) => `($1, $${i + 2})`).join(', ')
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
      sendAppointmentPush(firmaID, 'appointment_updated', {
        appointmentID: result.appointmentID,
        workerIds,
        clientID: result.clientID,
        isOpen: result.isOpen,
        previousWorkerIds,
        previousIsOpen,
        timeChanged,
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
    // Fetch photo URLs before delete for S3 cleanup (cascade will remove DB records)
    const photosResult = await pool.query(
      `SELECT rp."url" FROM report_photos rp
       JOIN reports r ON rp."reportID" = r."reportID"
       WHERE r."appointmentId" = $1`,
      [appointmentID]
    )
    const photoUrls: string[] = photosResult.rows.map((r: any) => r.url).filter(Boolean)

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
      const workerIds = (row.workerIds || []).filter(Boolean)
      notifyAppointmentChange(firmaID, 'appointment_deleted', {
        appointmentID: row.appointmentID,
        workerIds,
        clientID: row.clientID,
      })
      sendAppointmentPush(firmaID, 'appointment_deleted', {
        appointmentID: row.appointmentID,
        workerIds,
        clientID: row.clientID,
      })

      // Delete report photos from S3 (fire-and-forget, errors are logged inside)
      for (const url of photoUrls) {
        deleteS3File(url)
      }
    }

    return deleted
  } catch (error) {
    console.error('[deleteAppointment] Error:', error)
    throw error
  }
}
