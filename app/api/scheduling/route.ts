import { NextResponse } from 'next/server'
import { getAnySchedulingSession } from './auth-check'
import { getWorkersByFirmaID, getWorkerByUserID } from '@/lib/workers'
import { getClientsByFirmaID, getClientByUserID } from '@/lib/clients'
import { getTeamsByFirmaID } from '@/lib/teams'
import { getGroupesByFirmaID } from '@/lib/groupes'
import { getServicesByFirmaID } from '@/lib/services'
import { getAppointmentsByFirmaID } from '@/lib/appointments'
import { getReportsByFirmaID } from '@/lib/reports'
import { mapAppointmentToFrontend } from './_helpers'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmaID = session.user.firmaID!
    const userId = session.user.id
    const userName = session.user.name || ''
    const userStatus = session.user.status

    console.log('[Scheduling API] GET for firmaID:', firmaID, 'userId:', userId, 'status:', userStatus)

    const [workersRaw, clientsRaw, teamsRaw, groupesRaw, servicesRaw, appointmentsRaw, reportsRaw] = await Promise.all([
      getWorkersByFirmaID(firmaID),
      getClientsByFirmaID(firmaID),
      getTeamsByFirmaID(firmaID),
      getGroupesByFirmaID(firmaID),
      getServicesByFirmaID(firmaID),
      getAppointmentsByFirmaID(firmaID),
      getReportsByFirmaID(firmaID),
    ])

    // Фильтрация appointments по роли
    let filteredAppointmentsRaw = appointmentsRaw
    let myWorkerID: string | null = null
    let myClientID: string | null = null

    if (userStatus === 1) {
      // Worker: только appointments где он в массиве workerIds
      const myWorker = await getWorkerByUserID(userId, firmaID)
      if (myWorker) {
        myWorkerID = myWorker.workerID
        filteredAppointmentsRaw = appointmentsRaw.filter(a => (a.workerIds || []).includes(myWorker.workerID))
      } else {
        filteredAppointmentsRaw = []
      }
    } else if (userStatus === 2) {
      // Client: только свои appointments
      const myClient = await getClientByUserID(userId, firmaID)
      if (myClient) {
        myClientID = myClient.clientID
        filteredAppointmentsRaw = appointmentsRaw.filter(a => a.clientID === myClient.clientID)
      } else {
        filteredAppointmentsRaw = []
      }
    }

    console.log('[Scheduling API] Raw counts:', {
      workers: workersRaw.length,
      clients: clientsRaw.length,
      appointments: `${filteredAppointmentsRaw.length}/${appointmentsRaw.length}`,
      userStatus,
    })

    // Map DB records to frontend types (xyzID → id)
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

    const workers = workersRaw.map(w => ({
      id: w.workerID,
      userID: w.userID,
      firmaID: w.firmaID,
      name: w.name,
      surname: w.surname || '',
      email: w.email || '',
      phone: w.phone,
      phone2: w.phone2,
      teamId: w.teamId || '',
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
    }))

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
        groupe: groupe ? { id: groupe.id, groupeName: groupe.groupeName, firmaID: groupe.firmaID } : undefined,
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

    const appointments = filteredAppointmentsRaw.map(mapAppointmentToFrontend)

    const reports = reportsRaw.map(r => ({
      id: r.reportID,
      firmaID: r.firmaID,
      workerId: r.workerId,
      appointmentId: r.appointmentId,
      notes: r.notes,
      date: r.date,
      photos: (r.photos || []).map((p: any) => ({
        id: p.photoID,
        url: p.url,
        note: p.note || '',
      })),
    }))

    const user = {
      id: userId,
      firmaID,
      userName,
      status: userStatus,
      myWorkerID,
      myClientID,
    }

    return NextResponse.json({
      user,
      workers,
      clients,
      teams,
      groupes,
      services,
      appointments,
      reports,
      firmaID,
    })
  } catch (error) {
    console.error('[Scheduling API] GET error:', error)
    return NextResponse.json({ error: 'Failed to load scheduling data' }, { status: 500 })
  }
}
