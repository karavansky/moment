import pool from './db'
import { generateId } from './generateId'

export interface User {
  userID: string
  name: string
  email: string
  token: string
  date: Date
  provider: string
  isAdmin: boolean
}

/**
 * Создает нового пользователя в базе данных
 */
export async function createUser(
  name: string,
  email: string,
  token: string,
  provider: string
): Promise<User> {
  const userID = generateId(20)
  const date = new Date()

  const query = `
    INSERT INTO users ("userID", "name", "email", "token", "date", "provider")
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `

  const values = [userID, name, email, token, date, provider]

  console.log('[createUser] Creating user with values:', { userID, name, email, provider })

  try {
    const result = await pool.query(query, values)
    console.log('[createUser] User created successfully:', result.rows[0])
    return result.rows[0]
  } catch (error) {
    console.error('[createUser] Error creating user:', error)
    throw error
  }
}

/**
 * Получает пользователя по email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const query = 'SELECT * FROM users WHERE "email" = $1 LIMIT 1'

  console.log('[getUserByEmail] Looking for user with email:', email)

  try {
    const result = await pool.query(query, [email])
    console.log('[getUserByEmail] Query result:', result.rows.length > 0 ? 'User found' : 'User not found')
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getUserByEmail] Error getting user by email:', error)
    throw error
  }
}

/**
 * Получает пользователя по userID
 */
export async function getUserById(userID: string): Promise<User | null> {
  const query = 'SELECT * FROM users WHERE "userID" = $1 LIMIT 1'

  try {
    const result = await pool.query(query, [userID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getUserById] Error getting user by ID:', error)
    throw error
  }
}

/**
 * Обновляет token пользователя
 */
export async function updateUserToken(userID: string, token: string): Promise<void> {
  const query = 'UPDATE users SET "token" = $1 WHERE "userID" = $2'

  console.log('[updateUserToken] Updating token for userID:', userID)

  try {
    await pool.query(query, [token, userID])
    console.log('[updateUserToken] Token updated successfully')
  } catch (error) {
    console.error('[updateUserToken] Error updating user token:', error)
    throw error
  }
}
