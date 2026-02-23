import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../auth-check'
import { createTeam, updateTeam, deleteTeam, getTeamsByFirmaID } from '@/lib/teams'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const firmaID = session.user.firmaID!
    const teamsRaw = await getTeamsByFirmaID(firmaID)
    const teams = teamsRaw.map(t => ({ id: t.teamID, teamName: t.teamName, firmaID: t.firmaID }))

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('[Scheduling Teams] GET error:', error)
    return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamName, id } = await request.json()
    if (!teamName || !id) return NextResponse.json({ error: 'Team name and id required' }, { status: 400 })

    const team = await createTeam(session.user.firmaID!, teamName, id)
    return NextResponse.json(team)
  } catch (error) {
    console.error('[Scheduling Teams] POST error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, teamName } = await request.json()
    if (!id || !teamName) return NextResponse.json({ error: 'ID and team name required' }, { status: 400 })

    const team = await updateTeam(id, session.user.firmaID!, teamName)
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    return NextResponse.json(team)
  } catch (error) {
    console.error('[Scheduling Teams] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Team ID required' }, { status: 400 })

    const deleted = await deleteTeam(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Scheduling Teams] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
