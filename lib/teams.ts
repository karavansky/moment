import pool from './db'
import { generateId } from './generateId'

export interface TeamRecord {
  teamID: string
  firmaID: string
  teamName: string
  createdAt: Date
}

export async function createTeam(firmaID: string, teamName: string): Promise<TeamRecord> {
  const teamID = generateId(20)

  const query = `
    INSERT INTO teams ("teamID", "firmaID", "teamName")
    VALUES ($1, $2, $3)
    RETURNING *
  `

  try {
    const result = await pool.query(query, [teamID, firmaID, teamName])
    return result.rows[0]
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
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[updateTeam] Error:', error)
    throw error
  }
}

export async function deleteTeam(teamID: string, firmaID: string): Promise<boolean> {
  const query = `DELETE FROM teams WHERE "teamID" = $1 AND "firmaID" = $2`

  try {
    const result = await pool.query(query, [teamID, firmaID])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('[deleteTeam] Error:', error)
    throw error
  }
}
