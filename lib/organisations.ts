import pool from './db'
import { generateId } from './generate-id'

export interface Organisation {
  firmaID: string
  name: string
  createdAt: Date
}

export async function createOrganisation(name: string): Promise<Organisation> {
  const firmaID = generateId()

  const query = `
    INSERT INTO organisations ("firmaID", "name")
    VALUES ($1, $2)
    RETURNING *
  `

  try {
    const result = await pool.query(query, [firmaID, name])
    return result.rows[0]
  } catch (error) {
    console.error('[createOrganisation] Error:', error)
    throw error
  }
}

export async function updateOrganisation(firmaID: string, name: string): Promise<Organisation | null> {
  const query = 'UPDATE organisations SET "name" = $1 WHERE "firmaID" = $2 RETURNING *'

  try {
    const result = await pool.query(query, [name, firmaID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[updateOrganisation] Error:', error)
    throw error
  }
}

export async function getOrganisationById(firmaID: string): Promise<Organisation | null> {
  const query = 'SELECT * FROM organisations WHERE "firmaID" = $1 LIMIT 1'

  try {
    const result = await pool.query(query, [firmaID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getOrganisationById] Error:', error)
    throw error
  }
}
