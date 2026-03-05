/**
 * /api/test/next-auth — Load testing endpoint WITH authentication
 * Mirrors /api/test/next but requires a valid session (auth overhead included)
 * Used to benchmark Next.js vs Vapor with real-world JWT verification cost.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  // Verify session — this is the authentication overhead we want to measure
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [
      workersResult,
      clientsResult,
      appointmentsResult,
      teamsResult,
      groupesResult,
      servicesResult,
      reportsResult,
    ] = await Promise.all([
      pool.query(`
        SELECT w.*,
               t."teamName",
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
        ORDER BY w."name"
      `),
      pool.query(`
        SELECT c.*, g."groupeName"
        FROM clients c
        LEFT JOIN groupes g ON c."groupeID" = g."groupeID"
        ORDER BY c."name"
      `),
      pool.query(`
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
            (SELECT json_agg(json_build_object(
                'id', w2."workerID", 'name', w2."name", 'surname', w2."surname",
                'email', w2."email", 'firmaID', w2."firmaID", 'teamId', w2."teamId", 'status', w2."status"
              ))
             FROM appointment_workers aw2
             JOIN workers w2 ON aw2."workerID" = w2."workerID"
             WHERE aw2."appointmentID" = a."appointmentID"), '[]'
          ) AS workers_data,
          COALESCE(
            (SELECT array_agg(aw3."workerID") FROM appointment_workers aw3
             WHERE aw3."appointmentID" = a."appointmentID"), ARRAY[]::VARCHAR[]
          ) AS "workerIds",
          COALESCE(
            json_agg(json_build_object(
              'id', s."serviceID", 'name', s."name", 'duration', s."duration",
              'price', s."price", 'parentId', s."parentId", 'isGroup', s."isGroup",
              'firmaID', s."firmaID", 'order', s."order"
            )) FILTER (WHERE s."serviceID" IS NOT NULL), '[]'
          ) AS services
        FROM appointments a
        JOIN clients c ON a."clientID" = c."clientID"
        LEFT JOIN appointment_services aps ON a."appointmentID" = aps."appointmentID"
        LEFT JOIN services s ON aps."serviceID" = s."serviceID"
        GROUP BY a."appointmentID", c."clientID"
        ORDER BY a."date", a."startTime"
      `),
      pool.query(`SELECT * FROM teams ORDER BY "teamName"`),
      pool.query(`SELECT * FROM groupes ORDER BY "groupeName"`),
      pool.query(`SELECT * FROM services ORDER BY "order"`),
      pool.query(`
        SELECT r.*,
               COALESCE(
                 json_agg(json_build_object('photoID', rp."photoID", 'url', rp."url", 'note', rp."note"))
                 FILTER (WHERE rp."photoID" IS NOT NULL), '[]'
               ) AS photos
        FROM reports r
        LEFT JOIN report_photos rp ON r."reportID" = rp."reportID"
        GROUP BY r."reportID"
      `),
    ])

    return NextResponse.json({
      workers: workersResult.rows,
      clients: clientsResult.rows,
      appointments: appointmentsResult.rows,
      teams: teamsResult.rows,
      groupes: groupesResult.rows,
      services: servicesResult.rows,
      reports: reportsResult.rows,
    })
  } catch (error) {
    console.error('[test/next-auth] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
