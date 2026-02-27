import pool from './db'
import { generateId } from './generate-id'

export interface Message {
  messageID: string
  ticketID: string
  userID: string
  message: string
  isAdmin: boolean
  isRead: boolean
  date: Date
  dateRead: Date | null
}

/**
 * Создает новое сообщение в тикете
 */
export async function createMessage(
  ticketID: string,
  userID: string,
  message: string,
  isAdmin: boolean = false
): Promise<Message> {
  const messageID = generateId()
  const date = new Date()

  const query = `
    INSERT INTO messages ("messageID", "ticketID", "userID", "message", "isAdmin", "isRead", "date")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `

  const values = [messageID, ticketID, userID, message, isAdmin, false, date]

  try {
    const result = await pool.query(query, values)
    return result.rows[0]
  } catch (error) {
    console.error('[createMessage] Error creating message:', error)
    throw error
  }
}

/**
 * Получает все сообщения тикета
 */
export async function getMessagesByTicketId(ticketID: string): Promise<Message[]> {
  const query = 'SELECT * FROM messages WHERE "ticketID" = $1 ORDER BY "date" ASC'

  try {
    const result = await pool.query(query, [ticketID])
    return result.rows
  } catch (error) {
    console.error('[getMessagesByTicketId] Error getting messages:', error)
    throw error
  }
}

/**
 * Получает непрочитанные сообщения для пользователя
 */
export async function getUnreadMessagesForUser(ticketID: string, userID: string): Promise<Message[]> {
  const query = `
    SELECT * FROM messages
    WHERE "ticketID" = $1
      AND "userID" != $2
      AND "isRead" = FALSE
    ORDER BY "date" ASC
  `

  try {
    const result = await pool.query(query, [ticketID, userID])
    return result.rows
  } catch (error) {
    console.error('[getUnreadMessagesForUser] Error getting unread messages:', error)
    throw error
  }
}

/**
 * Помечает сообщение как прочитанное
 */
export async function markMessageAsRead(messageID: string): Promise<void> {
  const query = 'UPDATE messages SET "isRead" = TRUE, "dateRead" = $1 WHERE "messageID" = $2'
  const dateRead = new Date()

  try {
    await pool.query(query, [dateRead, messageID])
  } catch (error) {
    console.error('[markMessageAsRead] Error marking message as read:', error)
    throw error
  }
}

/**
 * Помечает все сообщения тикета как прочитанные для конкретного пользователя
 */
export async function markTicketMessagesAsRead(ticketID: string, userID: string): Promise<void> {
  const query = `
    UPDATE messages
    SET "isRead" = TRUE, "dateRead" = $1
    WHERE "ticketID" = $2
      AND "userID" != $3
      AND "isRead" = FALSE
  `
  const dateRead = new Date()

  try {
    await pool.query(query, [dateRead, ticketID, userID])
  } catch (error) {
    console.error('[markTicketMessagesAsRead] Error marking messages as read:', error)
    throw error
  }
}

/**
 * Получает количество непрочитанных сообщений для администратора
 */
export async function getUnreadAdminMessagesCount(): Promise<number> {
  const query = `
    SELECT COUNT(*)
    FROM messages
    WHERE "isAdmin" = FALSE
      AND "isRead" = FALSE
  `

  try {
    const result = await pool.query(query)
    return parseInt(result.rows[0].count)
  } catch (error) {
    console.error('[getUnreadAdminMessagesCount] Error getting unread count:', error)
    throw error
  }
}

/**
 * Получает количество непрочитанных сообщений для пользователя
 */
export async function getUnreadUserMessagesCount(userID: string): Promise<number> {
  const query = `
    SELECT COUNT(*)
    FROM messages
    WHERE "isAdmin" = TRUE
      AND "isRead" = FALSE
      AND "ticketID" IN (
        SELECT "ticketID" FROM ticket WHERE "userID" = $1
      )
  `

  try {
    const result = await pool.query(query, [userID])
    return parseInt(result.rows[0].count)
  } catch (error) {
    console.error('[getUnreadUserMessagesCount] Error getting unread count:', error)
    throw error
  }
}

/**
 * Проверяет доступ пользователя к тикету (только проверка без загрузки данных)
 * Возвращает true если доступ есть, false если нет
 */
export async function checkTicketAccess(
  ticketID: string,
  userID: string,
  isAdmin: boolean
): Promise<boolean> {
  const query = 'SELECT "userID" FROM ticket WHERE "ticketID" = $1 LIMIT 1'

  try {
    const result = await pool.query(query, [ticketID])

    if (result.rows.length === 0) {
      return false // Тикет не существует
    }

    const ticketOwner = result.rows[0].userID

    // Проверяем права доступа
    return ticketOwner === userID || isAdmin
  } catch (error) {
    console.error('[checkTicketAccess] Error:', error)
    throw error
  }
}

/**
 * Получает сообщения тикета с проверкой прав доступа (оптимизированный запрос)
 * Возвращает null если пользователь не имеет доступа к тикету
 */
export async function getMessagesWithAccessCheck(
  ticketID: string,
  userID: string,
  isAdmin: boolean
): Promise<Message[] | null> {
  // Сначала проверяем доступ с минимальным запросом
  const accessQuery = 'SELECT "userID" FROM ticket WHERE "ticketID" = $1 LIMIT 1'

  try {
    const accessResult = await pool.query(accessQuery, [ticketID])

    if (accessResult.rows.length === 0) {
      return null // Тикет не существует
    }

    const ticketOwner = accessResult.rows[0].userID

    // Проверяем права доступа
    if (ticketOwner !== userID && !isAdmin) {
      return null // Нет прав доступа
    }

    // Если доступ есть, получаем сообщения
    const messagesQuery = 'SELECT * FROM messages WHERE "ticketID" = $1 ORDER BY "date" ASC'
    const messagesResult = await pool.query(messagesQuery, [ticketID])

    return messagesResult.rows
  } catch (error) {
    console.error('[getMessagesWithAccessCheck] Error:', error)
    throw error
  }
}
