import pool from './db'
import { generateId } from './generateId'

export interface GroupeRecord {
  groupeID: string
  firmaID: string
  groupeName: string
  createdAt: Date
}

export async function createGroupe(firmaID: string, groupeName: string): Promise<GroupeRecord> {
  const groupeID = generateId(20)

  const query = `
    INSERT INTO groupes ("groupeID", "firmaID", "groupeName")
    VALUES ($1, $2, $3)
    RETURNING *
  `

  try {
    const result = await pool.query(query, [groupeID, firmaID, groupeName])
    return result.rows[0]
  } catch (error) {
    console.error('[createGroupe] Error:', error)
    throw error
  }
}

export async function getGroupesByFirmaID(firmaID: string): Promise<GroupeRecord[]> {
  const query = `SELECT * FROM groupes WHERE "firmaID" = $1 ORDER BY "groupeName"`

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows
  } catch (error) {
    console.error('[getGroupesByFirmaID] Error:', error)
    throw error
  }
}

export async function updateGroupe(groupeID: string, firmaID: string, groupeName: string): Promise<GroupeRecord | null> {
  const query = `
    UPDATE groupes SET "groupeName" = $1
    WHERE "groupeID" = $2 AND "firmaID" = $3
    RETURNING *
  `

  try {
    const result = await pool.query(query, [groupeName, groupeID, firmaID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[updateGroupe] Error:', error)
    throw error
  }
}

export async function deleteGroupe(groupeID: string, firmaID: string): Promise<boolean> {
  const query = `DELETE FROM groupes WHERE "groupeID" = $1 AND "firmaID" = $2`

  try {
    const result = await pool.query(query, [groupeID, firmaID])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('[deleteGroupe] Error:', error)
    throw error
  }
}
