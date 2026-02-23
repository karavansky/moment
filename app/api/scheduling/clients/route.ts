import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createClient, updateClient, deleteClient, getClientsByFirmaID } from '@/lib/clients'
import { getGroupesByFirmaID } from '@/lib/groupes'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const firmaID = session.user.firmaID!
    const [clientsRaw, groupesRaw] = await Promise.all([
      getClientsByFirmaID(firmaID),
      getGroupesByFirmaID(firmaID),
    ])

    const groupes = groupesRaw.map(g => ({ id: g.groupeID, groupeName: g.groupeName, firmaID: g.firmaID }))
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

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('[Scheduling Clients] GET error:', error)
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const client = await createClient({ ...body, firmaID: session.user.firmaID! })
    return NextResponse.json(client)
  } catch (error) {
    console.error('[Scheduling Clients] POST error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...data } = await request.json()
    if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

    const client = await updateClient(id, session.user.firmaID!, data)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    return NextResponse.json(client)
  } catch (error) {
    console.error('[Scheduling Clients] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

    const deleted = await deleteClient(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Scheduling Clients] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
