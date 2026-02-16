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
