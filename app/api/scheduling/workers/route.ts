import { NextResponse } from 'next/server'
import { getSchedulingSession } from '../auth-check'
import { createWorker, updateWorker, deleteWorker } from '@/lib/workers'

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const worker = await createWorker({ ...body, firmaID: session.user.firmaID! })
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
