import pool from './db'
import type { OrderDB, OrderStatus } from '../types/transport'
import { sendPushToUser } from './push-notifications'
import { generateId } from './generate-id'

function getChannel(firmaID: string): string {
  return `transport_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

function notifyOrderChange(
  firmaID: string,
  type:
    | 'order_created'
    | 'order_updated'
    | 'order_deleted'
    | 'order_assigned'
    | 'order_accepted'
    | 'order_rejected'
    | 'order_completed',
  orderID: string,
  driverID?: string | null,
  status?: OrderStatus
) {
  pool
    .query(`SELECT pg_notify($1, $2)`, [
      getChannel(firmaID),
      JSON.stringify({ type, firmaID, orderID, driverID, status }),
    ])
    .catch(err => console.error(`[orders] pg_notify ${type} error:`, err))
}

// ================================================
// CREATE ORDER
// ================================================

export async function createOrder(data: {
  orderID: string
  firmaID: string
  clientID: string
  dispatcherID?: string
  appointmentID?: string | null
  requestedTime?: Date | null
  scheduledTime?: Date | null
  clientComment?: string
  phone?: string
}): Promise<OrderDB> {
  // Определяем статус:
  // - PENDING если нет appointmentID (Workflow 2: клиент создает заказ)
  // - CREATED если есть appointmentID (Workflow 1: админ создает через appointment)
  const status = data.appointmentID ? 'CREATED' : 'PENDING'

  const query = `
    INSERT INTO orders (
      "orderID", "firmaID", "clientID", "dispatcherID", "appointmentID",
      "requestedTime", "scheduledTime", "status", "clientComment", "phone"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `

  const values = [
    data.orderID,
    data.firmaID,
    data.clientID,
    data.dispatcherID || null,
    data.appointmentID || null,
    data.requestedTime || null,
    data.scheduledTime || null,
    status,
    data.clientComment || null,
    data.phone || null,
  ]

  const result = await pool.query(query, values)
  const created = result.rows[0]

  notifyOrderChange(data.firmaID, 'order_created', data.orderID)

  return created
}

// ================================================
// GET ORDERS
// ================================================

export async function getOrdersByFirmaID(firmaID: string): Promise<OrderDB[]> {
  const query = `
    SELECT * FROM orders
    WHERE "firmaID" = $1
    ORDER BY "createdAt" DESC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

export async function getOrderByID(orderID: string, firmaID: string): Promise<OrderDB | null> {
  const query = `
    SELECT * FROM orders
    WHERE "orderID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [orderID, firmaID])
  return result.rows[0] || null
}

// Get orders by status
export async function getOrdersByStatus(
  firmaID: string,
  status: OrderStatus
): Promise<OrderDB[]> {
  const query = `
    SELECT * FROM orders
    WHERE "firmaID" = $1 AND "status" = $2
    ORDER BY "scheduledTime" ASC NULLS LAST, "createdAt" ASC
  `

  const result = await pool.query(query, [firmaID, status])
  return result.rows
}

// Get orders for specific driver
export async function getOrdersByDriverID(
  driverID: string,
  firmaID: string
): Promise<OrderDB[]> {
  const query = `
    SELECT * FROM orders
    WHERE "driverID" = $1 AND "firmaID" = $2
    ORDER BY "createdAt" DESC
  `

  const result = await pool.query(query, [driverID, firmaID])
  return result.rows
}

// Get active order for driver (only one active trip per driver)
export async function getActiveOrderForDriver(
  driverID: string,
  firmaID: string
): Promise<OrderDB | null> {
  const query = `
    SELECT * FROM orders
    WHERE "driverID" = $1
      AND "firmaID" = $2
      AND "status" IN ('ACCEPTED', 'ARRIVED', 'IN_PROGRESS')
    ORDER BY "acceptedAt" DESC
    LIMIT 1
  `

  const result = await pool.query(query, [driverID, firmaID])
  return result.rows[0] || null
}

// Get orders by client
export async function getOrdersByClientID(
  clientID: string,
  firmaID: string
): Promise<OrderDB[]> {
  const query = `
    SELECT * FROM orders
    WHERE "clientID" = $1 AND "firmaID" = $2
    ORDER BY "createdAt" DESC
  `

  const result = await pool.query(query, [clientID, firmaID])
  return result.rows
}

// Get pending orders (not assigned yet) for dispatcher
export async function getPendingOrders(firmaID: string): Promise<OrderDB[]> {
  const query = `
    SELECT * FROM orders
    WHERE "firmaID" = $1 AND "status" IN ('PENDING', 'CREATED')
    ORDER BY "requestedTime" ASC NULLS LAST, "scheduledTime" ASC NULLS LAST, "createdAt" ASC
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

// Get active orders (in progress) for real-time tracking
export async function getActiveOrders(firmaID: string): Promise<OrderDB[]> {
  const query = `
    SELECT * FROM orders
    WHERE "firmaID" = $1
      AND "status" IN ('ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS')
    ORDER BY "acceptedAt" ASC NULLS LAST, "assignedAt" ASC NULLS LAST
  `

  const result = await pool.query(query, [firmaID])
  return result.rows
}

// ================================================
// UPDATE ORDER
// ================================================

export async function updateOrder(
  orderID: string,
  firmaID: string,
  data: {
    dispatcherID?: string
    driverID?: string | null
    vehicleID?: string | null
    appointmentID?: string | null
    requestedTime?: Date | null
    scheduledTime?: Date | null
    status?: OrderStatus
    clientComment?: string
    phone?: string
    assignedAt?: Date
    acceptedAt?: Date
    arrivedAt?: Date
    startedAt?: Date
    completedAt?: Date
    cancelledAt?: Date
  }
): Promise<OrderDB | null> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.dispatcherID !== undefined) {
    fields.push(`"dispatcherID" = $${paramIndex++}`)
    values.push(data.dispatcherID)
  }

  if (data.driverID !== undefined) {
    fields.push(`"driverID" = $${paramIndex++}`)
    values.push(data.driverID)
  }

  if (data.vehicleID !== undefined) {
    fields.push(`"vehicleID" = $${paramIndex++}`)
    values.push(data.vehicleID)
  }

  if (data.appointmentID !== undefined) {
    fields.push(`"appointmentID" = $${paramIndex++}`)
    values.push(data.appointmentID)
  }

  if (data.requestedTime !== undefined) {
    fields.push(`"requestedTime" = $${paramIndex++}`)
    values.push(data.requestedTime)
  }

  if (data.scheduledTime !== undefined) {
    fields.push(`"scheduledTime" = $${paramIndex++}`)
    values.push(data.scheduledTime)
  }

  if (data.status !== undefined) {
    fields.push(`"status" = $${paramIndex++}`)
    values.push(data.status)
  }

  if (data.clientComment !== undefined) {
    fields.push(`"clientComment" = $${paramIndex++}`)
    values.push(data.clientComment)
  }

  if (data.phone !== undefined) {
    fields.push(`"phone" = $${paramIndex++}`)
    values.push(data.phone)
  }

  if (data.assignedAt !== undefined) {
    fields.push(`"assignedAt" = $${paramIndex++}`)
    values.push(data.assignedAt)
  }

  if (data.acceptedAt !== undefined) {
    fields.push(`"acceptedAt" = $${paramIndex++}`)
    values.push(data.acceptedAt)
  }

  if (data.arrivedAt !== undefined) {
    fields.push(`"arrivedAt" = $${paramIndex++}`)
    values.push(data.arrivedAt)
  }

  if (data.startedAt !== undefined) {
    fields.push(`"startedAt" = $${paramIndex++}`)
    values.push(data.startedAt)
  }

  if (data.completedAt !== undefined) {
    fields.push(`"completedAt" = $${paramIndex++}`)
    values.push(data.completedAt)
  }

  if (data.cancelledAt !== undefined) {
    fields.push(`"cancelledAt" = $${paramIndex++}`)
    values.push(data.cancelledAt)
  }

  if (fields.length === 0) {
    return getOrderByID(orderID, firmaID)
  }

  values.push(orderID, firmaID)

  const query = `
    UPDATE orders
    SET ${fields.join(', ')}
    WHERE "orderID" = $${paramIndex++} AND "firmaID" = $${paramIndex++}
    RETURNING *
  `

  const result = await pool.query(query, values)
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_updated', orderID, updated.driverID, updated.status)
  }

  return updated
}

// ================================================
// ASSIGN ORDER TO DRIVER
// ================================================

export async function assignOrderToDriver(
  orderID: string,
  firmaID: string,
  driverID: string,
  vehicleID: string,
  dispatcherID: string
): Promise<OrderDB | null> {
  const query = `
    UPDATE orders
    SET
      "driverID" = $1,
      "vehicleID" = $2,
      "dispatcherID" = $3,
      "status" = 'ASSIGNED',
      "assignedAt" = NOW()
    WHERE "orderID" = $4 AND "firmaID" = $5
    RETURNING *
  `

  const result = await pool.query(query, [driverID, vehicleID, dispatcherID, orderID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_assigned', orderID, driverID, 'ASSIGNED')

    // Send push notification to driver
    await sendOrderPushToDriver(driverID, orderID, 'assigned', firmaID)
  }

  return updated
}

// ================================================
// DRIVER ACTIONS
// ================================================

// Driver accepts order
export async function acceptOrder(
  orderID: string,
  driverID: string,
  firmaID: string
): Promise<OrderDB | null> {
  const query = `
    UPDATE orders
    SET
      "status" = 'ACCEPTED',
      "acceptedAt" = NOW()
    WHERE "orderID" = $1 AND "driverID" = $2 AND "firmaID" = $3 AND "status" = 'ASSIGNED'
    RETURNING *
  `

  const result = await pool.query(query, [orderID, driverID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_accepted', orderID, driverID, 'ACCEPTED')

    // Notify dispatcher
    await sendOrderPushToDispatchers(firmaID, orderID, 'accepted')
  }

  return updated
}

// Driver arrives at pickup location
export async function arriveAtPickup(
  orderID: string,
  driverID: string,
  firmaID: string
): Promise<OrderDB | null> {
  const query = `
    UPDATE orders
    SET
      "status" = 'ARRIVED',
      "arrivedAt" = NOW()
    WHERE "orderID" = $1 AND "driverID" = $2 AND "firmaID" = $3 AND "status" = 'ACCEPTED'
    RETURNING *
  `

  const result = await pool.query(query, [orderID, driverID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_updated', orderID, driverID, 'ARRIVED')

    // Notify client that driver arrived
    // TODO: Implement client push notifications
  }

  return updated
}

// Driver starts trip
export async function startTrip(
  orderID: string,
  driverID: string,
  firmaID: string
): Promise<OrderDB | null> {
  const query = `
    UPDATE orders
    SET
      "status" = 'IN_PROGRESS',
      "startedAt" = NOW()
    WHERE "orderID" = $1 AND "driverID" = $2 AND "firmaID" = $3 AND "status" = 'ARRIVED'
    RETURNING *
  `

  const result = await pool.query(query, [orderID, driverID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_updated', orderID, driverID, 'IN_PROGRESS')
  }

  return updated
}

// Driver completes trip
export async function completeOrder(
  orderID: string,
  driverID: string,
  firmaID: string
): Promise<OrderDB | null> {
  const query = `
    UPDATE orders
    SET
      "status" = 'COMPLETED',
      "completedAt" = NOW()
    WHERE "orderID" = $1 AND "driverID" = $2 AND "firmaID" = $3 AND "status" = 'IN_PROGRESS'
    RETURNING *
  `

  const result = await pool.query(query, [orderID, driverID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_completed', orderID, driverID, 'COMPLETED')

    // Notify dispatcher
    await sendOrderPushToDispatchers(firmaID, orderID, 'completed')
  }

  return updated
}

// Driver rejects order
export async function rejectOrder(
  orderID: string,
  driverID: string,
  firmaID: string,
  reasonID: string,
  customReason?: string
): Promise<OrderDB | null> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Insert reject record
    await client.query(
      `INSERT INTO order_rejects ("orderRejectID", "firmaID", "orderID", "driverID", "reasonID", "customReason")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateId(), firmaID, orderID, driverID, reasonID, customReason || null]
    )

    // Update order - remove driver assignment and set status back to CREATED
    const updateResult = await client.query(
      `UPDATE orders
       SET "driverID" = NULL, "vehicleID" = NULL, "status" = 'CREATED', "assignedAt" = NULL
       WHERE "orderID" = $1 AND "firmaID" = $2 AND "driverID" = $3 AND "status" = 'ASSIGNED'
       RETURNING *`,
      [orderID, firmaID, driverID]
    )

    await client.query('COMMIT')

    const updated = updateResult.rows[0] || null

    if (updated) {
      notifyOrderChange(firmaID, 'order_rejected', orderID, null, 'CREATED')
      // Notify dispatchers about rejection
      await sendOrderPushToDispatchers(firmaID, orderID, 'rejected' as any)
    }

    return updated
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Cancel order (by dispatcher or client)
export async function cancelOrder(
  orderID: string,
  firmaID: string,
  cancelledBy?: string
): Promise<OrderDB | null> {
  const query = `
    UPDATE orders
    SET
      "status" = 'CANCELLED',
      "cancelledAt" = NOW()
    WHERE "orderID" = $1 AND "firmaID" = $2 AND "status" NOT IN ('COMPLETED', 'CANCELLED')
    RETURNING *
  `

  const result = await pool.query(query, [orderID, firmaID])
  const updated = result.rows[0] || null

  if (updated) {
    notifyOrderChange(firmaID, 'order_updated', orderID, updated.driverID, 'CANCELLED')

    // Notify driver if order was assigned
    if (updated.driverID) {
      await sendOrderPushToDriver(updated.driverID, orderID, 'cancelled', firmaID)
    }
  }

  return updated
}

// ================================================
// DELETE ORDER
// ================================================

export async function deleteOrder(orderID: string, firmaID: string): Promise<boolean> {
  const query = `
    DELETE FROM orders
    WHERE "orderID" = $1 AND "firmaID" = $2
  `

  const result = await pool.query(query, [orderID, firmaID])
  const deleted = (result.rowCount ?? 0) > 0

  if (deleted) {
    notifyOrderChange(firmaID, 'order_deleted', orderID)
  }

  return deleted
}

// ================================================
// PUSH NOTIFICATIONS
// ================================================

async function sendOrderPushToDriver(
  driverID: string,
  orderID: string,
  action: 'assigned' | 'cancelled',
  firmaID: string
) {
  try {
    // Get driver's user info
    const workerResult = await pool.query(
      `SELECT "userID", "name" FROM workers WHERE "workerID" = $1 AND "firmaID" = $2`,
      [driverID, firmaID]
    )

    if (workerResult.rows.length === 0) return

    const worker = workerResult.rows[0]
    if (!worker.userID) return

    // Get order details
    const order = await getOrderByID(orderID, firmaID)
    if (!order) return

    const title =
      action === 'assigned' ? 'New Order Assigned' : 'Order Cancelled'
    const body =
      action === 'assigned'
        ? `You have been assigned to a new order #${orderID.slice(0, 8)}`
        : `Order #${orderID.slice(0, 8)} has been cancelled`

    await sendPushToUser(worker.userID, {
      title,
      body,
      url: '/driver',
      tag: `order_${orderID}`,
    })
  } catch (error) {
    console.error('[orders] Failed to send push to driver:', error)
  }
}

async function sendOrderPushToDispatchers(
  firmaID: string,
  orderID: string,
  action: 'accepted' | 'completed'
) {
  try {
    // Get all directors (status=0) for this firma
    const directorsResult = await pool.query(
      `SELECT "userID" FROM users WHERE "firmaID" = $1 AND "status" = 0`,
      [firmaID]
    )

    const order = await getOrderByID(orderID, firmaID)
    if (!order) return

    const title =
      action === 'accepted' ? 'Order Accepted' : 'Order Completed'
    const body =
      action === 'accepted'
        ? `Driver accepted order #${orderID.slice(0, 8)}`
        : `Order #${orderID.slice(0, 8)} has been completed`

    for (const director of directorsResult.rows) {
      await sendPushToUser(director.userID, {
        title,
        body,
        url: `/dispatcher/${orderID}`,
        tag: `order_${orderID}`,
      })
    }
  } catch (error) {
    console.error('[orders] Failed to send push to dispatchers:', error)
  }
}

// ================================================
// STATISTICS
// ================================================

export async function getOrderStats(firmaID: string) {
  const query = `
    SELECT
      COUNT(*) as "totalOrders",
      COUNT(CASE WHEN "status" IN ('PENDING', 'CREATED') THEN 1 END) as "pending",
      COUNT(CASE WHEN "status" = 'ASSIGNED' THEN 1 END) as "assigned",
      COUNT(CASE WHEN "status" IN ('ACCEPTED', 'ARRIVED', 'IN_PROGRESS') THEN 1 END) as "active",
      COUNT(CASE WHEN "status" = 'COMPLETED' AND DATE("completedAt") = CURRENT_DATE THEN 1 END) as "completedToday",
      COUNT(CASE WHEN "status" = 'CANCELLED' AND DATE("cancelledAt") = CURRENT_DATE THEN 1 END) as "cancelledToday"
    FROM orders
    WHERE "firmaID" = $1
  `

  const result = await pool.query(query, [firmaID])
  return result.rows[0]
}
