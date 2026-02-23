import pool from './db'

function getChannel(firmaID: string): string {
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyTeamChange(firmaID: string, type: 'team_created' | 'team_updated' | 'team_deleted') {
  pool.query(`SELECT pg_notify($1, $2)`, [
    getChannel(firmaID),
    JSON.stringify({ type, firmaID }),
  ]).catch(err => console.error(`[teams] pg_notify ${type} error:`, err))
}

export interface TeamRecord {
  teamID: string
  firmaID: string
  teamName: string
  createdAt: Date
}

export async function createTeam(firmaID: string, teamName: string, teamID: string): Promise<TeamRecord> {
  const id = teamID

  const query = `
    INSERT INTO teams ("teamID", "firmaID", "teamName")
    VALUES ($1, $2, $3)
    RETURNING *
  `

  try {
    const result = await pool.query(query, [id, firmaID, teamName])
    const created = result.rows[0]
    notifyTeamChange(firmaID, 'team_created')
    return created
  } catch (error) {
    console.error('[createTeam] Error:', error)
    throw error
  }
}

export async function getTeamsByFirmaID(firmaID: string): Promise<TeamRecord[]> {
  const query = `SELECT * FROM teams WHERE "firmaID" = $1 ORDER BY "teamName"`

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getTeamsByFirmaID] Error:', error)
    throw error
  }
}

export async function updateTeam(teamID: string, firmaID: string, teamName: string): Promise<TeamRecord | null> {
  const query = `
    UPDATE teams SET "teamName" = $1
    WHERE "teamID" = $2 AND "firmaID" = $3
    RETURNING *
  `

  try {
    const result = await pool.query(query, [teamName, teamID, firmaID])
    const updated = result.rows.length > 0 ? result.rows[0] : null
    if (updated) notifyTeamChange(firmaID, 'team_updated')
    return updated
  } catch (error) {
    console.error('[updateTeam] Error:', error)
    throw error
  }
}

export async function deleteTeam(teamID: string, firmaID: string): Promise<boolean> {
  const query = `DELETE FROM teams WHERE "teamID" = $1 AND "firmaID" = $2`

  try {
    const result = await pool.query(query, [teamID, firmaID])
    const deleted = (result.rowCount ?? 0) > 0
    if (deleted) notifyTeamChange(firmaID, 'team_deleted')
    return deleted
  } catch (error) {
    console.error('[deleteTeam] Error:', error)
    throw error
  }
}
