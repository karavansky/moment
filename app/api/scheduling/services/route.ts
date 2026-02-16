import { NextResponse } from 'next/server'
import { getSchedulingSession } from '../auth-check'
import { createService, updateService, deleteService } from '@/lib/services'

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const service = await createService(session.user.firmaID!, body)
    return NextResponse.json(service)
  } catch (error) {
    console.error('[Scheduling Services] POST error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...data } = await request.json()
    if (!id) return NextResponse.json({ error: 'Service ID required' }, { status: 400 })

    const service = await updateService(id, session.user.firmaID!, data)
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    return NextResponse.json(service)
  } catch (error) {
    console.error('[Scheduling Services] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Service ID required' }, { status: 400 })

    const deleted = await deleteService(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Scheduling Services] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
