import pool from './db'
import { generateId } from './generate-id'

export interface Ticket {
  ticketID: string
  userID: string
  subject: string
  category: number
  pripority: number
  date: Date
}

/**
 * Создает новый тикет в базе данных
 */
export async function createTicket(
  userID: string,
  subject: string,
  category: number,
  pripority: number
): Promise<Ticket> {
  const ticketID = generateId()
  const date = new Date()

  const query = `
    INSERT INTO ticket ("ticketID", "userID", "subject", "category", "pripority", "date")
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `

  const values = [ticketID, userID, subject, category, pripority, date]

  try {
    const result = await pool.query(query, values)
    return result.rows[0]
  } catch (error) {
    console.error('[createTicket] Error creating ticket:', error)
    throw error
  }
}

/**
 * Получает все тикеты пользователя
 */
export async function getTicketsByUserId(userID: string): Promise<Ticket[]> {
  const query = 'SELECT * FROM ticket WHERE "userID" = $1 ORDER BY "date" DESC'

  try {
    const result = await pool.query(query, [userID])
    return result.rows
  } catch (error) {
    console.error('[getTicketsByUserId] Error getting tickets by user ID:', error)
    throw error
  }
}

/**
 * Получает тикет по ID
 */
export async function getTicketById(ticketID: string): Promise<Ticket | null> {
  const query = 'SELECT * FROM ticket WHERE "ticketID" = $1 LIMIT 1'

  try {
    const result = await pool.query(query, [ticketID])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[getTicketById] Error getting ticket by ID:', error)
    throw error
  }
}
