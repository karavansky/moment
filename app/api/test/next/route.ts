import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { mapAppointmentToFrontend } from '../../scheduling/_helpers'

export async function GET() {
  try {
    const workersRawQuery = pool.query(`
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
      ORDER BY w."name"
    `)

    const clientsRawQuery = pool.query(`
      SELECT c.*, g."groupeName"
      FROM clients c
      LEFT JOIN groupes g ON c."groupeID" = g."groupeID"
      ORDER BY c."name"
    `)

    const appointmentsRawQuery = pool.query(`
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
              'email', w2."email", 'firmaID', w2."firmaID", 'teamId', w2."teamId",
              'status', w2."status"
          ))
          FROM appointment_workers aw2
          JOIN workers w2 ON aw2."workerID" = w2."workerID"
          WHERE aw2."appointmentID" = a."appointmentID"), '[]'
        ) AS workers_data,
        COALESCE(
          (SELECT array_agg(aw3."workerID")
          FROM appointment_workers aw3
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
    `)

    const reportsRawQuery = pool.query(`
      SELECT r.*,
             COALESCE(
               json_agg(json_build_object(
                 'photoID', rp."photoID", 'url', rp."url", 'note', rp."note"
               )) FILTER (WHERE rp."photoID" IS NOT NULL), '[]'
             ) AS photos
      FROM reports r
      LEFT JOIN report_photos rp ON r."reportID" = rp."reportID"
      GROUP BY r."reportID"
    `)

    const [
      workersRawRes,
      clientsRawRes,
      teamsRawRes,
      groupesRawRes,
      servicesRawRes,
      appointmentsRawRes,
      reportsRawRes,
    ] = await Promise.all([
      workersRawQuery,
      clientsRawQuery,
      pool.query(`SELECT * FROM teams`),
      pool.query(`SELECT * FROM groupes`),
      pool.query(`SELECT * FROM services`),
      appointmentsRawQuery,
      reportsRawQuery,
    ])

    const workersRaw = workersRawRes.rows
    const clientsRaw = clientsRawRes.rows
    const teamsRaw = teamsRawRes.rows
    const groupesRaw = groupesRawRes.rows
    const servicesRaw = servicesRawRes.rows
    const appointmentsRaw = appointmentsRawRes.rows
    const reportsRaw = reportsRawRes.rows

    const teams = teamsRaw.map(t => ({
      id: t.teamID,
      teamName: t.teamName,
      firmaID: t.firmaID,
    }))

    const groupes = groupesRaw.map(g => ({
      id: g.groupeID,
      groupeName: g.groupeName,
      firmaID: g.firmaID,
    }))

    const workers = workersRaw.map(w => {
      const team = w.teamId ? teams.find(t => t.id === w.teamId) : undefined
      return {
        id: w.workerID,
        userID: w.userID,
        firmaID: w.firmaID,
        name: w.name,
        surname: w.surname || '',
        email: w.email || '',
        phone: w.phone,
        phone2: w.phone2,
        teamId: w.teamId || null,
        team: team ? { id: team.id, teamName: team.teamName, firmaID: team.firmaID } : undefined,
        isAdress: w.isAdress,
        status: w.status,
        country: w.country,
        street: w.street,
        postalCode: w.postalCode,
        city: w.city,
        houseNumber: w.houseNumber,
        apartment: w.apartment,
        district: w.district,
        latitude: w.latitude,
        longitude: w.longitude,
        lastLoginAt: w.lastLoginAt ? new Date(w.lastLoginAt).toISOString() : null,
        pushNotificationsEnabled: w.pushNotificationsEnabled ?? null,
        geolocationEnabled: w.geolocationEnabled ?? null,
        hasPushSubscription: w.hasPushSubscription ?? null,
        pwaVersion: w.pwaVersion ?? null,
        osVersion: w.osVersion ?? null,
        batteryLevel: w.batteryLevel ?? null,
        batteryStatus: w.batteryStatus ?? null,
      }
    })

    const clients = clientsRaw.map(c => {
      const groupe = c.groupeID ? groupes.find(g => g.id === c.groupeID) : undefined
      return {
        id: c.clientID,
        firmaID: c.firmaID,
        name: c.name,
        surname: c.surname || '',
        email: c.email,
        phone: c.phone,
        phone2: c.phone2,
        status: c.status,
        country: c.country || '',
        street: c.street || '',
        postalCode: c.postalCode || '',
        city: c.city || '',
        houseNumber: c.houseNumber || '',
        apartment: c.apartment,
        district: c.district,
        latitude: c.latitude || 0,
        longitude: c.longitude || 0,
        groupe: groupe
          ? { id: groupe.id, groupeName: groupe.groupeName, firmaID: groupe.firmaID }
          : undefined,
      }
    })

    const services = servicesRaw.map(s => ({
      id: s.serviceID,
      firmaID: s.firmaID,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price ? Number(s.price) : undefined,
      parentId: s.parentId,
      isGroup: s.isGroup,
      order: s.order,
    }))

    const appointments = appointmentsRaw.map(mapAppointmentToFrontend)

    const reports = reportsRaw.map(r => ({
      id: r.reportID,
      firmaID: r.firmaID,
      type: r.type,
      workerId: r.workerId,
      appointmentId: r.appointmentId,
      notes: r.notes,
      date: r.date,
      openAt: r.openAt,
      closeAt: r.closeAt,
      openLatitude: r.openLatitude,
      openLongitude: r.openLongitude,
      openAddress: r.openAddress,
      openDistanceToAppointment: r.openDistanceToAppointment,
      closeLatitude: r.closeLatitude,
      closeLongitude: r.closeLongitude,
      closeAddress: r.closeAddress,
      closeDistanceToAppointment: r.closeDistanceToAppointment,
      photos: (r.photos || []).map((p: any) => ({
        id: p.photoID,
        url: p.url,
        note: p.note || '',
      })),
    }))

    return NextResponse.json({
      workers,
      clients,
      teams,
      groupes,
      services,
      appointments,
      reports,
    })
  } catch (error) {
    console.error('[Scheduling Test API] GET error:', error)
    return NextResponse.json({ error: 'Failed to load scheduling data' }, { status: 500 })
  }
}
