import pool from './db'
import { generateId } from './generateId'

export interface ReportRecord {
  reportID: string
  firmaID: string
  workerId: string
  appointmentId: string
  notes: string | null
  date: Date
  createdAt: Date
  openAt: Date | null
  closeAt: Date | null
  openLatitude: number | null
  openLongitude: number | null
  openAddress: string | null
  openDistanceToAppointment: number | null
  closeLatitude: number | null
  closeLongitude: number | null
  closeAddress: string | null
  closeDistanceToAppointment: number | null
}

export interface ReportWithPhotos extends ReportRecord {
  photos: { photoID: string; url: string; note: string }[]
}

export async function createReport(
  firmaID: string,
  data: {
    workerId: string
    appointmentId: string
    notes?: string
    photos?: { url: string; note?: string }[]
  }
): Promise<ReportRecord> {
  const reportID = generateId(20)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const query = `
      INSERT INTO reports ("reportID", "firmaID", "workerId", "appointmentId", "notes")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const result = await client.query(query, [
      reportID, firmaID, data.workerId, data.appointmentId, data.notes || null,
    ])

    // Insert photos
    if (data.photos && data.photos.length > 0) {
      for (const photo of data.photos) {
        const photoID = generateId(20)
        await client.query(
          `INSERT INTO report_photos ("photoID", "reportID", "url", "note") VALUES ($1, $2, $3, $4)`,
          [photoID, reportID, photo.url, photo.note || '']
        )
      }
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[createReport] Error:', error)
    throw error
  } finally {
    client.release()
  }
}

export async function createReportSession(
  firmaID: string,
  data: {
    reportID?: string
    workerId: string
    appointmentId: string
    openLatitude?: number
    openLongitude?: number
    openAddress?: string
    openDistanceToAppointment?: number
  }
): Promise<ReportRecord> {
  const reportID = data.reportID ?? generateId(20)
  // openAt is set by the DB server via NOW() to prevent client clock manipulation
  const query = `
    INSERT INTO reports ("reportID", "firmaID", "workerId", "appointmentId", "openAt",
      "openLatitude", "openLongitude", "openAddress", "openDistanceToAppointment")
    VALUES ($1,$2,$3,$4, NOW(), $5,$6,$7,$8)
    RETURNING *`
  const result = await pool.query(query, [
    reportID, firmaID, data.workerId, data.appointmentId,
    data.openLatitude ?? null, data.openLongitude ?? null,
    data.openAddress ?? null, data.openDistanceToAppointment ?? null,
  ])
  return result.rows[0]
}

export async function updateReport(
  reportID: string,
  firmaID: string,
  data: {
    closeSession?: boolean
    notes?: string
    openLatitude?: number
    openLongitude?: number
    openAddress?: string
    openDistanceToAppointment?: number
    closeLatitude?: number
    closeLongitude?: number
    closeAddress?: string
    closeDistanceToAppointment?: number
  }
): Promise<ReportRecord | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let idx = 1

  // closeAt is set by the DB server via NOW() to prevent client clock manipulation
  if (data.closeSession) { setClauses.push('"closeAt" = NOW()') }
  if (data.notes !== undefined) { setClauses.push(`"notes" = $${idx++}`); values.push(data.notes) }
  if (data.openLatitude !== undefined) { setClauses.push(`"openLatitude" = $${idx++}`); values.push(data.openLatitude) }
  if (data.openLongitude !== undefined) { setClauses.push(`"openLongitude" = $${idx++}`); values.push(data.openLongitude) }
  if (data.openAddress !== undefined) { setClauses.push(`"openAddress" = $${idx++}`); values.push(data.openAddress) }
  if (data.openDistanceToAppointment !== undefined) { setClauses.push(`"openDistanceToAppointment" = $${idx++}`); values.push(data.openDistanceToAppointment) }
  if (data.closeLatitude !== undefined) { setClauses.push(`"closeLatitude" = $${idx++}`); values.push(data.closeLatitude) }
  if (data.closeLongitude !== undefined) { setClauses.push(`"closeLongitude" = $${idx++}`); values.push(data.closeLongitude) }
  if (data.closeAddress !== undefined) { setClauses.push(`"closeAddress" = $${idx++}`); values.push(data.closeAddress) }
  if (data.closeDistanceToAppointment !== undefined) { setClauses.push(`"closeDistanceToAppointment" = $${idx++}`); values.push(data.closeDistanceToAppointment) }

  if (setClauses.length === 0) return null

  values.push(reportID, firmaID)
  const result = await pool.query(
    `UPDATE reports SET ${setClauses.join(', ')} WHERE "reportID" = $${idx++} AND "firmaID" = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] ?? null
}

export async function addPhotoToReport(
  reportID: string,
  photoId: string,
  data: { url: string; note: string }
): Promise<void> {
  await pool.query(
    `INSERT INTO report_photos ("photoID", "reportID", "url", "note") VALUES ($1, $2, $3, $4)`,
    [photoId, reportID, data.url, data.note]
  )
}

export async function removePhotoFromReport(photoID: string): Promise<void> {
  await pool.query(`DELETE FROM report_photos WHERE "photoID" = $1`, [photoID])
}

export async function getReportsByFirmaID(firmaID: string): Promise<ReportWithPhotos[]> {
  const query = `
    SELECT
      r.*,
      COALESCE(
        json_agg(
          json_build_object('photoID', p."photoID", 'url', p."url", 'note', p."note")
        ) FILTER (WHERE p."photoID" IS NOT NULL),
        '[]'
      ) AS photos
    FROM reports r
    LEFT JOIN report_photos p ON r."reportID" = p."reportID"
    WHERE r."firmaID" = $1
    GROUP BY r."reportID"
    ORDER BY r."date" DESC
  `

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getReportsByFirmaID] Error:', error)
    throw error
  }
}
