import pool from './db'
import { generateId } from './generateId'

export type TokenType = 'email_verify' | 'password_reset'

export interface VerificationToken {
  tokenID: string
  userID: string
  token: string
  type: TokenType
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

const TOKEN_EXPIRY: Record<TokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000, // 24 hours
  password_reset: 60 * 60 * 1000,     // 1 hour
}

export async function createVerificationToken(
  userID: string,
  type: TokenType
): Promise<string> {
  const tokenID = generateId(20)
  const token = generateId(64)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY[type])

  const query = `
    INSERT INTO verification_tokens ("tokenID", "userID", "token", "type", "expiresAt")
    VALUES ($1, $2, $3, $4, $5)
  `
  const values = [tokenID, userID, token, type, expiresAt]

  try {
    await pool.query(query, values)
    console.log(`[createVerificationToken] Created ${type} token for userID:`, userID)
    return token
  } catch (error) {
    console.error('[createVerificationToken] Error:', error)
    throw error
  }
}

export async function getVerificationToken(token: string): Promise<VerificationToken | null> {
  const query = `
    SELECT * FROM verification_tokens
    WHERE "token" = $1 AND "expiresAt" > NOW() AND "usedAt" IS NULL
  `

  try {
    const result = await pool.query(query, [token])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getVerificationToken] Error:', error)
    throw error
  }
}

export async function markTokenUsed(tokenID: string): Promise<void> {
  const query = 'UPDATE verification_tokens SET "usedAt" = NOW() WHERE "tokenID" = $1'

  try {
    await pool.query(query, [tokenID])
    console.log('[markTokenUsed] Token marked as used:', tokenID)
  } catch (error) {
    console.error('[markTokenUsed] Error:', error)
    throw error
  }
}
