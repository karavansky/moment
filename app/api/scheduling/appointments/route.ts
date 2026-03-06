import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createAppointment, updateAppointment, deleteAppointment, getAppointmentsByFirmaID } from '@/lib/appointments'
import { getWorkerByUserID } from '@/lib/workers'
import { getClientByUserID } from '@/lib/clients'
import { getReportsByFirmaID } from '@/lib/reports'
import { mapAppointmentToFrontend } from '../_helpers'

/**
 * GET /api/scheduling/appointments
 * Lightweight endpoint — returns only appointments (with role-based filtering).
 * Used by SSE refresh to avoid refetching all scheduling data.
 */
export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmaID = session.user.firmaID!
    const userId = session.user.id
    const userStatus = session.user.status

    const [appointmentsRaw, reportsRaw] = await Promise.all([
      getAppointmentsByFirmaID(firmaID),
      getReportsByFirmaID(firmaID),
    ])

    // Role-based filtering: worker видит только свои, client — свои
    let filtered = appointmentsRaw
    if (userStatus === 1) {
      const myWorker = await getWorkerByUserID(userId, firmaID)
      filtered = myWorker
        ? appointmentsRaw.filter(a => (a.workerIds || []).includes(myWorker.workerID))
        : []
    } else if (userStatus === 2) {
      const myClient = await getClientByUserID(userId, firmaID)
      filtered = myClient
        ? appointmentsRaw.filter(a => a.clientID === myClient.clientID)
        : []
    }

    // Map reports to frontend format
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

    // Map appointments and attach reports to each appointment
    const appointments = filtered.map(aptRaw => {
      const apt = mapAppointmentToFrontend(aptRaw)
      // Attach reports for this appointment
      apt.reports = reports.filter(r => r.appointmentId === apt.id)
      return apt
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('[Scheduling Appointments] GET error:', error)
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const appointment = await createAppointment(session.user.firmaID!, {
      ...body,
      userID: session.user.id,
    })
    return NextResponse.json(appointment)
  } catch (error) {
    console.error('[Scheduling Appointments] POST error:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAnySchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userStatus = session.user.status
    const firmaID = session.user.firmaID!

    // Client (status=2) не может обновлять appointments
    if (userStatus === 2) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, ...data } = await request.json()
    console.error(`[API PUT /appointments] id=${id}, data=${JSON.stringify(data)}, userStatus=${userStatus}`)
    if (!id) return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })

    // Worker (status=1): может только isOpen/openedAt/closedAt для своих appointments
    if (userStatus === 1) {
      const myWorker = await getWorkerByUserID(session.user.id, firmaID)
      if (!myWorker) {
        return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      }

      // Ограничить поля: worker может только open/close
      const allowedData: Record<string, any> = {}
      if (data.isOpen !== undefined) allowedData.isOpen = data.isOpen
      if (data.openedAt !== undefined) allowedData.openedAt = data.openedAt
      if (data.closedAt !== undefined) allowedData.closedAt = data.closedAt

      if (Object.keys(allowedData).length === 0) {
        return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 })
      }

      const appointment = await updateAppointment(id, firmaID, allowedData)
      if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

      return NextResponse.json(appointment)
    }

    // Director (status=0/null): полный доступ
    console.error(`[API PUT /appointments] Calling updateAppointment with id=${id}, firmaID=${firmaID}`)
    const appointment = await updateAppointment(id, firmaID, data)
    console.error(`[API PUT /appointments] updateAppointment returned:`, appointment ? 'success' : 'null')
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    return NextResponse.json(appointment)
  } catch (error) {
    console.error('[Scheduling Appointments] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })

    const deleted = await deleteAppointment(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Scheduling Appointments] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
  }
}
