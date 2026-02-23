import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createGroupe, updateGroupe, deleteGroupe, getGroupesByFirmaID } from '@/lib/groupes'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const firmaID = session.user.firmaID!
    const groupesRaw = await getGroupesByFirmaID(firmaID)
    const groupes = groupesRaw.map(g => ({ id: g.groupeID, groupeName: g.groupeName, firmaID: g.firmaID }))

    return NextResponse.json({ groupes })
  } catch (error) {
    console.error('[Scheduling Groupes] GET error:', error)
    return NextResponse.json({ error: 'Failed to load groupes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupeName } = await request.json()
    if (!groupeName) return NextResponse.json({ error: 'Groupe name required' }, { status: 400 })

    const groupe = await createGroupe(session.user.firmaID!, groupeName)
    return NextResponse.json(groupe)
  } catch (error) {
    console.error('[Scheduling Groupes] POST error:', error)
    return NextResponse.json({ error: 'Failed to create groupe' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, groupeName } = await request.json()
    if (!id || !groupeName) return NextResponse.json({ error: 'ID and groupe name required' }, { status: 400 })

    const groupe = await updateGroupe(id, session.user.firmaID!, groupeName)
    if (!groupe) return NextResponse.json({ error: 'Groupe not found' }, { status: 404 })
    return NextResponse.json(groupe)
  } catch (error) {
    console.error('[Scheduling Groupes] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update groupe' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Groupe ID required' }, { status: 400 })

    const deleted = await deleteGroupe(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Groupe not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Scheduling Groupes] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete groupe' }, { status: 500 })
  }
}
