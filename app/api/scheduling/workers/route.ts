import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createWorker, updateWorker, deleteWorker, getWorkersByFirmaID } from '@/lib/workers'
import { getTeamsByFirmaID } from '@/lib/teams'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const firmaID = session.user.firmaID!
    const [workersRaw, teamsRaw] = await Promise.all([
      getWorkersByFirmaID(firmaID),
      getTeamsByFirmaID(firmaID),
    ])

    const teams = teamsRaw.map(t => ({ id: t.teamID, teamName: t.teamName, firmaID: t.firmaID }))
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
        teamId: w.teamId || '',
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
      }
    })

    return NextResponse.json({ workers })
  } catch (error) {
    console.error('[Scheduling Workers] GET error:', error)
    return NextResponse.json({ error: 'Failed to load workers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...rest } = await request.json()
    if (!id) return NextResponse.json({ error: 'Worker ID required' }, { status: 400 })
    const worker = await createWorker({ ...rest, workerID: id, firmaID: session.user.firmaID! })
    return NextResponse.json(worker)
  } catch (error) {
    console.error('[Scheduling Workers] POST error:', error)
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...data } = await request.json()
    if (!id) return NextResponse.json({ error: 'Worker ID required' }, { status: 400 })

    const worker = await updateWorker(id, session.user.firmaID!, data)
    if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    return NextResponse.json(worker)
  } catch (error) {
    console.error('[Scheduling Workers] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Worker ID required' }, { status: 400 })

    const deleted = await deleteWorker(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Scheduling Workers] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete worker' }, { status: 500 })
  }
}
