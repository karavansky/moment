import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../../scheduling/auth-check'
import {
  createOrder,
  getOrdersByFirmaID,
  getOrderByID,
  updateOrder,
  deleteOrder,
  assignOrderToDriver,
  acceptOrder,
  rejectOrder,
  arriveAtPickup,
  startTrip,
  completeOrder,
  cancelOrder,
} from '@/lib/orders'
import { generateId } from '@/lib/generate-id'

// GET - Get all orders for firma or specific order by ID
export async function GET(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orderID = searchParams.get('id')
  const status = searchParams.get('status')
  const driverID = searchParams.get('driverID')

  try {
    if (orderID) {
      // Get specific order
      const order = await getOrderByID(orderID, session.user.firmaID)
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json({ order })
    }

    // Get all orders for firma
    const orders = await getOrdersByFirmaID(session.user.firmaID)

    // Filter by status if provided
    let filteredOrders = orders
    if (status) {
      filteredOrders = orders.filter(o => o.status === status)
    }

    // Filter by driver if provided
    if (driverID) {
      filteredOrders = filteredOrders.filter(o => o.driverID === driverID)
    }

    return NextResponse.json({
      orders: filteredOrders.map(o => ({
        id: o.orderID,
        firmaID: o.firmaID,
        clientID: o.clientID,
        dispatcherID: o.dispatcherID,
        driverID: o.driverID,
        vehicleID: o.vehicleID,
        appointmentID: o.appointmentID,
        requestedTime: o.requestedTime,
        scheduledTime: o.scheduledTime,
        status: o.status,
        clientComment: o.clientComment,
        phone: o.phone,
        createdAt: o.createdAt,
        assignedAt: o.assignedAt,
        acceptedAt: o.acceptedAt,
        arrivedAt: o.arrivedAt,
        startedAt: o.startedAt,
        completedAt: o.completedAt,
        cancelledAt: o.cancelledAt,
      })),
    })
  } catch (error) {
    console.error('[GET /api/transport/orders] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST - Create new order (Client or Dispatcher)
export async function POST(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      clientID,
      appointmentID,
      requestedTime,
      scheduledTime,
      clientComment,
      phone,
    } = body

    // Validation
    if (!clientID) {
      return NextResponse.json({ error: 'clientID is required' }, { status: 400 })
    }

    const order = await createOrder({
      orderID: generateId(),
      firmaID: session.user.firmaID,
      clientID,
      dispatcherID: session.user.id, // Current user as dispatcher
      appointmentID: appointmentID || null,
      requestedTime: requestedTime ? new Date(requestedTime) : null,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      clientComment,
      phone,
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/transport/orders] Error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

// PUT - Update order or change status
export async function PUT(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, action, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Handle status change actions
    if (action) {
      let updatedOrder

      switch (action) {
        case 'assign':
          // Assign order to driver (Dispatcher only)
          if (session.user.status !== 0 && session.user.status !== 1) {
            return NextResponse.json({ error: 'Only dispatchers can assign orders' }, { status: 403 })
          }
          if (!updateData.driverID || !updateData.vehicleID) {
            return NextResponse.json(
              { error: 'driverID and vehicleID are required for assignment' },
              { status: 400 }
            )
          }
          updatedOrder = await assignOrderToDriver(
            id,
            session.user.firmaID,
            updateData.driverID,
            updateData.vehicleID,
            session.user.id
          )
          break

        case 'accept':
          // Accept order (Driver only)
          updatedOrder = await acceptOrder(id, session.user.id, session.user.firmaID)
          break

        case 'reject':
          // Reject order (Driver only)
          if (!updateData.reasonID) {
            return NextResponse.json({ error: 'reasonID is required for rejection' }, { status: 400 })
          }
          updatedOrder = await rejectOrder(
            id,
            session.user.id,
            session.user.firmaID,
            updateData.reasonID,
            updateData.customReason
          )
          break

        case 'arrive':
          // Driver arrived at pickup
          updatedOrder = await arriveAtPickup(id, session.user.id, session.user.firmaID)
          break

        case 'start':
          // Start trip
          updatedOrder = await startTrip(id, session.user.id, session.user.firmaID)
          break

        case 'complete':
          // Complete trip
          updatedOrder = await completeOrder(id, session.user.id, session.user.firmaID)
          break

        case 'cancel':
          // Cancel order
          updatedOrder = await cancelOrder(id, session.user.firmaID)
          break

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }

      if (!updatedOrder) {
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      return NextResponse.json({ order: updatedOrder })
    }

    // General update (Dispatcher only)
    if (session.user.status !== 0 && session.user.status !== 1) {
      return NextResponse.json({ error: 'Only dispatchers can update orders' }, { status: 403 })
    }

    const updatedOrder = await updateOrder(id, session.user.firmaID, updateData)

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error('[PUT /api/transport/orders] Error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE - Delete order (Dispatcher/Director only)
export async function DELETE(request: Request) {
  const session = await getSchedulingSession() // Director only
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await deleteOrder(id, session.user.firmaID)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/transport/orders] Error:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
