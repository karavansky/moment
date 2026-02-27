import pool from './db'
import { generateId } from './generate-id'

export interface Session {
  sessionID: string
  userID: string
  expiresAt: Date
  createdAt: Date
  userAgent: string | null
  ip: string | null
}

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function createSession(
  userID: string,
  userAgent?: string,
  ip?: string
): Promise<Session> {
  const sessionID = generateId()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS)

  const query = `
    INSERT INTO sessions ("sessionID", "userID", "expiresAt", "userAgent", "ip")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `
  const values = [sessionID, userID, expiresAt, userAgent || null, ip || null]

  try {
    const result = await pool.query(query, values)
    console.log('[createSession] Session created for userID:', userID)
    return result.rows[0]
  } catch (error) {
    console.error('[createSession] Error:', error)
    throw error
  }
}

export async function getSession(sessionID: string): Promise<Session | null> {
  const query = `
    SELECT * FROM sessions
    WHERE "sessionID" = $1 AND "expiresAt" > NOW()
  `

  try {
    const result = await pool.query(query, [sessionID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getSession] Error:', error)
    throw error
  }
}

export async function getUserSessions(userID: string): Promise<Session[]> {
  const query = `
    SELECT * FROM sessions
    WHERE "userID" = $1 AND "expiresAt" > NOW()
    ORDER BY "createdAt" DESC
  `

  try {
    const result = await pool.query(query, [userID])
    return result.rows
  } catch (error) {
    console.error('[getUserSessions] Error:', error)
    throw error
  }
}

export async function deleteSession(sessionID: string): Promise<void> {
  const query = 'DELETE FROM sessions WHERE "sessionID" = $1'

  try {
    await pool.query(query, [sessionID])
    console.log('[deleteSession] Session deleted:', sessionID)
  } catch (error) {
    console.error('[deleteSession] Error:', error)
    throw error
  }
}

export async function deleteAllUserSessions(userID: string): Promise<void> {
  const query = 'DELETE FROM sessions WHERE "userID" = $1'

  try {
    const result = await pool.query(query, [userID])
    console.log('[deleteAllUserSessions] Deleted sessions for userID:', userID, 'count:', result.rowCount)
  } catch (error) {
    console.error('[deleteAllUserSessions] Error:', error)
    throw error
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  const query = 'DELETE FROM sessions WHERE "expiresAt" <= NOW()'

  try {
    const result = await pool.query(query)
    const count = result.rowCount || 0
    if (count > 0) {
      console.log('[cleanupExpiredSessions] Cleaned up sessions:', count)
    }
    return count
  } catch (error) {
    console.error('[cleanupExpiredSessions] Error:', error)
    throw error
  }
}
