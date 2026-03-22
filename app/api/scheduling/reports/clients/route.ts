import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * GET /api/scheduling/reports/clients
 * Returns appointments grouped by clients with filters
 * Access: status=0 (Directors) and status=7 (Sport- und Bäderamt)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Check access: только status=0 или status=7
    if (!session?.user?.firmaID || (session.user.status !== 0 && session.user.status !== 7)) {
      return NextResponse.json({
        error: 'NO_PERMISSION',
        message: 'Sie haben keine Berechtigung, Berichte anzuzeigen.'
      }, { status: 403 })
    }

    const firmaID = session.user.firmaID
    const { searchParams } = new URL(request.url)

    // Фильтры из query параметров
    const dateFrom = searchParams.get('dateFrom') // YYYY-MM-DD
    const dateTo = searchParams.get('dateTo')     // YYYY-MM-DD
    const clientID = searchParams.get('clientID')
    const workerID = searchParams.get('workerID')
    const serviceID = searchParams.get('serviceID')

    // Базовый SQL запрос
    let sql = `
      SELECT
        a."appointmentID",
        a."clientID",
        a.date,
        a."startTime",
        a."endTime",
        a.duration,
        a."isFixedTime",
        c.name as "clientName",
        c.surname as "clientSurname",
        c.street as "clientStreet",
        c."houseNumber" as "clientHouseNumber",
        c."postalCode" as "clientPostalCode",
        c.city as "clientCity",
        -- Workers (многие-ко-многим через appointment_workers)
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', w."workerID",
              'name', w.name,
              'surname', w.surname
            )
          ) FILTER (WHERE w."workerID" IS NOT NULL),
          '[]'
        ) as workers,
        -- Services (многие-ко-многим через appointment_services)
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s."serviceID",
              'name', s.name
            )
          ) FILTER (WHERE s."serviceID" IS NOT NULL),
          '[]'
        ) as services
      FROM appointments a
      INNER JOIN clients c ON a."clientID" = c."clientID"
      LEFT JOIN appointment_workers aw ON a."appointmentID" = aw."appointmentID"
      LEFT JOIN workers w ON aw."workerID" = w."workerID"
      LEFT JOIN appointment_services asrv ON a."appointmentID" = asrv."appointmentID"
      LEFT JOIN services s ON asrv."serviceID" = s."serviceID"
      WHERE a."firmaID" = $1
    `

    const params: any[] = [firmaID]
    let paramIndex = 2

    // Добавляем фильтры
    if (dateFrom) {
      sql += ` AND a.date >= $${paramIndex}`
      params.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      sql += ` AND a.date <= $${paramIndex}`
      params.push(dateTo)
      paramIndex++
    }

    if (clientID) {
      sql += ` AND a."clientID" = $${paramIndex}`
      params.push(clientID)
      paramIndex++
    }

    if (workerID) {
      sql += ` AND aw."workerID" = $${paramIndex}`
      params.push(workerID)
      paramIndex++
    }

    if (serviceID) {
      sql += ` AND asrv."serviceID" = $${paramIndex}`
      params.push(serviceID)
      paramIndex++
    }

    // Группировка и сортировка
    sql += `
      GROUP BY
        a."appointmentID",
        a."clientID",
        a.date,
        a."startTime",
        a."endTime",
        a.duration,
        a."isFixedTime",
        c.name,
        c.surname,
        c.street,
        c."houseNumber",
        c."postalCode",
        c.city
      ORDER BY
        c.surname ASC,
        c.name ASC,
        a.date ASC,
        a."startTime" ASC
    `

    const result = await pool.query(sql, params)

    // Форматируем результат
    const appointments = result.rows.map((row: any) => ({
      id: row.appointmentID,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      duration: row.duration,
      isFixedTime: row.isFixedTime,
      client: {
        id: row.clientID,
        name: row.clientName,
        surname: row.clientSurname,
        fullName: `${row.clientSurname} ${row.clientName}`,
        address: `${row.clientStreet} ${row.clientHouseNumber}, ${row.clientPostalCode} ${row.clientCity}`,
      },
      workers: row.workers.map((w: any) => ({
        id: w.id,
        name: w.name,
        surname: w.surname,
        fullName: `${w.surname} ${w.name}`,
      })),
      services: row.services.map((s: any) => ({
        id: s.id,
        name: s.name,
      })),
    }))

    return NextResponse.json({
      appointments,
      count: appointments.length
    })
  } catch (error) {
    console.error('[Reports Clients] GET error:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Fehler beim Laden der Berichte.'
    }, { status: 500 })
  }
}
