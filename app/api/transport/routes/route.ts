import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../../scheduling/auth-check'
import {
  createRoute,
  createRoutesForOrder,
  getRoutesByOrderID,
  getRouteByID,
  updateRoute,
  deleteRoute,
  deleteRoutesByOrderID,
} from '@/lib/routes'
import { generateId } from '@/lib/generate-id'

// GET - Get routes for an order or specific route by ID
export async function GET(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const routeID = searchParams.get('id')
  const orderID = searchParams.get('orderID')

  try {
    if (routeID) {
      // Get specific route
      const route = await getRouteByID(routeID, session.user.firmaID)
      if (!route) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 })
      }
      return NextResponse.json({ route })
    }

    if (orderID) {
      // Get all routes for specific order
      const routes = await getRoutesByOrderID(orderID, session.user.firmaID)
      return NextResponse.json({
        routes: routes.map(r => ({
          id: r.routeID,
          firmaID: r.firmaID,
          orderID: r.orderID,
          sequence: r.sequence,
          pickupAddress: r.pickupAddress,
          dropoffAddress: r.dropoffAddress,
          pickupLat: r.pickupLat,
          pickupLng: r.pickupLng,
          dropoffLat: r.dropoffLat,
          dropoffLng: r.dropoffLng,
          createdAt: r.createdAt,
        })),
      })
    }

    return NextResponse.json(
      { error: 'Either routeID or orderID parameter is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[GET /api/transport/routes] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 })
  }
}

// POST - Create route(s) for an order
export async function POST(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { orderID, routes } = body

    // Validation
    if (!orderID) {
      return NextResponse.json({ error: 'orderID is required' }, { status: 400 })
    }

    // Support both single route and multiple routes
    if (Array.isArray(routes)) {
      // Multiple routes - use transaction
      if (routes.length === 0) {
        return NextResponse.json({ error: 'routes array cannot be empty' }, { status: 400 })
      }

      // Validate each route
      for (const route of routes) {
        if (!route.pickupAddress || !route.dropoffAddress) {
          return NextResponse.json(
            { error: 'pickupAddress and dropoffAddress are required for each route' },
            { status: 400 }
          )
        }
      }

      // Add routeID and auto-sequence if not provided
      const routesWithID = routes.map((route, index) => ({
        routeID: route.id || generateId(),
        sequence: route.sequence !== undefined ? route.sequence : index + 1,
        pickupAddress: route.pickupAddress,
        dropoffAddress: route.dropoffAddress,
        pickupLat: route.pickupLat,
        pickupLng: route.pickupLng,
        dropoffLat: route.dropoffLat,
        dropoffLng: route.dropoffLng,
      }))

      const createdRoutes = await createRoutesForOrder(
        session.user.firmaID,
        orderID,
        routesWithID
      )

      return NextResponse.json({ routes: createdRoutes }, { status: 201 })
    } else {
      // Single route
      const { pickupAddress, dropoffAddress, pickupLat, pickupLng, dropoffLat, dropoffLng, sequence } = body

      if (!pickupAddress || !dropoffAddress) {
        return NextResponse.json(
          { error: 'pickupAddress and dropoffAddress are required' },
          { status: 400 }
        )
      }

      const route = await createRoute({
        routeID: generateId(),
        firmaID: session.user.firmaID,
        orderID,
        sequence: sequence || 1,
        pickupAddress,
        dropoffAddress,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
      })

      return NextResponse.json({ route }, { status: 201 })
    }
  } catch (error) {
    console.error('[POST /api/transport/routes] Error:', error)
    return NextResponse.json({ error: 'Failed to create route(s)' }, { status: 500 })
  }
}

// PUT - Update route
export async function PUT(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, pickupAddress, dropoffAddress, pickupLat, pickupLng, dropoffLat, dropoffLng } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updatedRoute = await updateRoute(id, session.user.firmaID, {
      pickupAddress,
      dropoffAddress,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
    })

    if (!updatedRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    return NextResponse.json({ route: updatedRoute })
  } catch (error) {
    console.error('[PUT /api/transport/routes] Error:', error)
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 })
  }
}

// DELETE - Delete route or all routes for an order
export async function DELETE(request: Request) {
  const session = await getSchedulingSession() // Director only
  if (!session?.user?.firmaID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, orderID } = await request.json()

    if (orderID) {
      // Delete all routes for an order
      const deletedCount = await deleteRoutesByOrderID(orderID, session.user.firmaID)
      return NextResponse.json({ success: true, deletedCount })
    }

    if (id) {
      // Delete specific route
      const deleted = await deleteRoute(id, session.user.firmaID)
      if (!deleted) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Either id or orderID is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[DELETE /api/transport/routes] Error:', error)
    return NextResponse.json({ error: 'Failed to delete route(s)' }, { status: 500 })
  }
}
