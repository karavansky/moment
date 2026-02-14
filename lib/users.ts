import pool from './db'
import { generateId } from './generateId'

export interface User {
  userID: string
  name: string
  email: string
  token: string | null
  passwordHash: string | null
  emailVerified: boolean
  date: Date
  provider: string
  isAdmin: boolean
  firmaID: string | null
}

/**
 * Создает нового пользователя через OAuth
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
    INSERT INTO users ("userID", "name", "email", "token", "date", "provider", "emailVerified")
    VALUES ($1, $2, $3, $4, $5, $6, TRUE)
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
 * Создает нового пользователя с email+password
 */
export async function createUserWithPassword(
  name: string,
  email: string,
  passwordHash: string,
  firmaID: string
): Promise<User> {
  const userID = generateId(20)
  const date = new Date()

  const query = `
    INSERT INTO users ("userID", "name", "email", "passwordHash", "date", "provider", "emailVerified", "firmaID")
    VALUES ($1, $2, $3, $4, $5, 'credentials', FALSE, $6)
    RETURNING *
  `

  const values = [userID, name, email, passwordHash, date, firmaID]

  console.log('[createUserWithPassword] Creating credentials user:', { userID, name, email, firmaID })

  try {
    const result = await pool.query(query, values)
    console.log('[createUserWithPassword] User created successfully')
    return result.rows[0]
  } catch (error) {
    console.error('[createUserWithPassword] Error:', error)
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
 * Обновляет token пользователя (OAuth)
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

/**
 * Верифицирует email пользователя
 */
export async function verifyUserEmail(userID: string): Promise<void> {
  const query = 'UPDATE users SET "emailVerified" = TRUE WHERE "userID" = $1'

  try {
    await pool.query(query, [userID])
    console.log('[verifyUserEmail] Email verified for userID:', userID)
  } catch (error) {
    console.error('[verifyUserEmail] Error:', error)
    throw error
  }
}

/**
 * Обновляет пароль пользователя
 */
export async function updatePassword(userID: string, passwordHash: string): Promise<void> {
  const query = 'UPDATE users SET "passwordHash" = $1 WHERE "userID" = $2'

  try {
    await pool.query(query, [passwordHash, userID])
    console.log('[updatePassword] Password updated for userID:', userID)
  } catch (error) {
    console.error('[updatePassword] Error:', error)
    throw error
  }
}

/**
 * Получает всех пользователей (без passwordHash и token)
 */
export async function getAllUsers(): Promise<Omit<User, 'passwordHash' | 'token'>[]> {
  const query = `
    SELECT u."userID", u."name", u."email", u."emailVerified", u."date", u."provider", u."isAdmin", u."firmaID", o."name" AS "organisationName"
    FROM users u
    LEFT JOIN organisations o ON u."firmaID" = o."firmaID"
    ORDER BY u."date" DESC
  `

  try {
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('[getAllUsers] Error:', error)
    throw error
  }
}

/**
 * Обновляет данные пользователя (admin)
 */
export async function updateUser(
  userID: string,
  fields: { name?: string; email?: string; isAdmin?: boolean; emailVerified?: boolean }
): Promise<User | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (fields.name !== undefined) {
    setClauses.push(`"name" = $${paramIndex++}`)
    values.push(fields.name)
  }
  if (fields.email !== undefined) {
    setClauses.push(`"email" = $${paramIndex++}`)
    values.push(fields.email)
  }
  if (fields.isAdmin !== undefined) {
    setClauses.push(`"isAdmin" = $${paramIndex++}`)
    values.push(fields.isAdmin)
  }
  if (fields.emailVerified !== undefined) {
    setClauses.push(`"emailVerified" = $${paramIndex++}`)
    values.push(fields.emailVerified)
  }

  if (setClauses.length === 0) return null

  values.push(userID)
  const query = `UPDATE users SET ${setClauses.join(', ')} WHERE "userID" = $${paramIndex} RETURNING *`

  try {
    const result = await pool.query(query, values)
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[updateUser] Error:', error)
    throw error
  }
}

/**
 * Удаляет пользователя
 */
export async function deleteUser(userID: string): Promise<boolean> {
  const query = 'DELETE FROM users WHERE "userID" = $1'

  try {
    const result = await pool.query(query, [userID])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('[deleteUser] Error:', error)
    throw error
  }
}
