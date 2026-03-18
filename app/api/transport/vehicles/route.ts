import { NextResponse } from 'next/server'
import { getSchedulingSession, getAnySchedulingSession } from '../../scheduling/auth-check'
import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehiclesByFirmaID,
  getVehicleByID,
} from '@/lib/vehicles'
import { assignDriver, changeDriver, unassignDriver } from '@/lib/vehicle-drivers'
import { generateId } from '@/lib/generate-id'

export async function GET() {
  try {
    const session = await getAnySchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vehicles = await getVehiclesByFirmaID(session.user.firmaID!)

    const mapped = vehicles.map(v => ({
      id: v.vehicleID,
      firmaID: v.firmaID,
      plateNumber: v.plateNumber,
      type: v.type,
      status: v.status,
      currentDriverID: v.currentDriverID,
      currentDriverName: v.driverName,
      currentDriverSurname: v.driverSurname,
      currentLat: v.currentLat,
      currentLng: v.currentLng,
      lastLocationUpdate: v.lastLocationUpdate,
      createdAt: v.createdAt,
    }))

    return NextResponse.json({ vehicles: mapped })
  } catch (error) {
    console.error('[Transport Vehicles] GET error:', error)
    return NextResponse.json({ error: 'Failed to load vehicles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { plateNumber, type, status, currentDriverID } = body

    if (!plateNumber || !type) {
      return NextResponse.json({ error: 'Plate number and type required' }, { status: 400 })
    }

    const vehicle = await createVehicle({
      vehicleID: generateId(),
      firmaID: session.user.firmaID!,
      plateNumber,
      type,
      status,
      currentDriverID,
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    console.error('[Transport Vehicles] POST error:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, currentDriverID, ...data } = await request.json()
    if (!id) return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })

    const firmaID = session.user.firmaID!

    // Get current vehicle state to detect driver change
    const currentVehicle = await getVehicleByID(id, firmaID)
    if (!currentVehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    // Handle driver assignment changes
    if (currentDriverID !== undefined && currentDriverID !== currentVehicle.currentDriverID) {
      if (currentVehicle.currentDriverID === null && currentDriverID !== null) {
        // First assignment
        await assignDriver(id, currentDriverID, session.user.id, 'Assigned via UI')
      } else if (currentDriverID === null && currentVehicle.currentDriverID !== null) {
        // Unassign driver
        await unassignDriver(id, 'Unassigned via UI')
      } else if (currentDriverID !== null && currentVehicle.currentDriverID !== null) {
        // Change driver
        await changeDriver(id, currentDriverID, session.user.id, 'Changed via UI')
      }
    }

    // Update other vehicle fields
    const vehicle = await updateVehicle(id, firmaID, data)
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    // Get updated vehicle with driver info
    const updatedVehicles = await getVehiclesByFirmaID(firmaID)
    const updatedVehicle = updatedVehicles.find(v => v.vehicleID === id)

    if (!updatedVehicle) {
      return NextResponse.json({ error: 'Vehicle not found after update' }, { status: 404 })
    }

    const response = {
      vehicle: {
        id: updatedVehicle.vehicleID,
        firmaID: updatedVehicle.firmaID,
        plateNumber: updatedVehicle.plateNumber,
        type: updatedVehicle.type,
        status: updatedVehicle.status,
        currentDriverID: updatedVehicle.currentDriverID,
        currentDriverName: updatedVehicle.driverName,
        currentDriverSurname: updatedVehicle.driverSurname,
        currentLat: updatedVehicle.currentLat,
        currentLng: updatedVehicle.currentLng,
        lastLocationUpdate: updatedVehicle.lastLocationUpdate,
        createdAt: updatedVehicle.createdAt,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Transport Vehicles] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSchedulingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })

    const deleted = await deleteVehicle(id, session.user.firmaID!)
    if (!deleted) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Transport Vehicles] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
