import { NextResponse } from 'next/server'
import { getSchedulingSession } from '../auth-check'
import { createClient, updateClient, deleteClient } from '@/lib/clients'

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
