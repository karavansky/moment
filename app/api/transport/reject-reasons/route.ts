import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../../scheduling/auth-check'
import {
  createRejectReason,
  updateRejectReason,
  deleteRejectReason,
  getRejectReasonsByFirmaID,
} from '@/lib/reject-reasons'
import { generateId } from '@/lib/generate-id'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reasons = await getRejectReasonsByFirmaID(session.user.firmaID!)

    const mapped = reasons.map(r => ({
      id: r.reasonID,
      firmaID: r.firmaID,
      reasonText: r.reasonText,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ reasons: mapped })
  } catch (error) {
    console.error('[Transport RejectReasons] GET error:', error)
    return NextResponse.json({ error: 'Failed to load reject reasons' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { reasonText, isActive } = await request.json()
    if (!reasonText) {
      return NextResponse.json({ error: 'Reason text required' }, { status: 400 })
    }

    const reason = await createRejectReason({
      reasonID: generateId(),
      firmaID: session.user.firmaID!,
      reasonText,
      isActive,
    })

    return NextResponse.json(reason)
  } catch (error) {
    console.error('[Transport RejectReasons] POST error:', error)
    return NextResponse.json({ error: 'Failed to create reject reason' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, ...data } = await request.json()
    if (!id) return NextResponse.json({ error: 'Reason ID required' }, { status: 400 })

    const reason = await updateRejectReason(id, session.user.firmaID!, data)
    if (!reason) return NextResponse.json({ error: 'Reason not found' }, { status: 404 })

    return NextResponse.json(reason)
  } catch (error) {
    console.error('[Transport RejectReasons] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update reject reason' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Reason ID required' }, { status: 400 })

    const deleted = await deleteRejectReason(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Reason not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Transport RejectReasons] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete reject reason' }, { status: 500 })
  }
}
