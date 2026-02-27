import pool from './db'
import { generateId } from './generate-id'

export interface Invite {
  inviteID: string
  token: string
  firmaID: string
  createdBy: string
  status: number
  createdAt: Date
}

export interface InviteWithOrg extends Invite {
  organisationName: string
}

export async function createInvite(
  firmaID: string,
  createdBy: string,
  status: number
): Promise<Invite> {
  const inviteID = generateId()
  const token = generateId(64)

  const query = `
    INSERT INTO invites ("inviteID", "token", "firmaID", "createdBy", "status")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `

  try {
    const result = await pool.query(query, [inviteID, token, firmaID, createdBy, status])
    console.log('[createInvite] Invite created for firmaID:', firmaID, 'status:', status)
    return result.rows[0]
  } catch (error) {
    console.error('[createInvite] Error:', error)
    throw error
  }
}

export async function getInviteByToken(token: string): Promise<InviteWithOrg | null> {
  const query = `
    SELECT i.*, o."name" AS "organisationName"
    FROM invites i
    JOIN organisations o ON i."firmaID" = o."firmaID"
    WHERE i."token" = $1
  `

  try {
    const result = await pool.query(query, [token])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getInviteByToken] Error:', error)
    throw error
  }
}
