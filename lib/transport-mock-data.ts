import {
  Vehicle,
  VehicleType,
  VehicleStatus,
  RejectReason,
  Order,
  OrderStatus,
  Route,
} from '@/types/transport'
import { generateId } from './generate-id'

// Функция для добавления дней к дате
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Функция для добавления часов к дате
const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

// Helper функция для создания маршрута
const createRoute = (
  firmaID: string,
  orderID: string,
  sequence: number,
  pickupAddress: string,
  pickupLat: number,
  pickupLng: number,
  dropoffAddress: string,
  dropoffLat: number,
  dropoffLng: number
): Route => ({
  id: generateId(),
  firmaID,
  orderID,
  sequence,
  pickupAddress,
  dropoffAddress,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  createdAt: new Date(),
})

type TranslateFn = (key: string, fallback?: string) => string

// Функция генерации всех mock данных для транспортной системы
export const getAllTransportMockData = (t?: TranslateFn) => {
  const tr = (key: string, fallback: string) => t ? t(key, fallback) : fallback
  const currentDate = new Date()
  const firmaID = '3Eoxlmzdr4uEJggFueFnB'

  // Vehicles - автопарк из 5 машин разных типов
  const vehicle1: Vehicle = {
    id: generateId(),
    firmaID: firmaID,
    plateNumber: 'A123BC777',
    type: 'STANDARD' as VehicleType,
    status: 'ACTIVE' as VehicleStatus,
    currentDriverID: null,
    currentLat: null,
    currentLng: null,
    lastLocationUpdate: null,
    createdAt: addDays(currentDate, -30),
  }

  const vehicle2: Vehicle = {
    id: generateId(),
    firmaID: firmaID,
    plateNumber: 'K-AB 1234',
    type: 'MINIVAN' as VehicleType,
    status: 'ACTIVE' as VehicleStatus,
    currentDriverID: null,
    currentLat: 50.9375,
    currentLng: 6.9603,
    lastLocationUpdate: addHours(currentDate, -1),
    createdAt: addDays(currentDate, -25),
  }

  const vehicle3: Vehicle = {
    id: generateId(),
    firmaID: firmaID,
    plateNumber: 'K-EF 9012',
    type: 'WHEELCHAIR' as VehicleType,
    status: 'ACTIVE' as VehicleStatus,
    currentDriverID: null,
    currentLat: 50.9288,
    currentLng: 6.9451,
    lastLocationUpdate: addHours(currentDate, -0.5),
    createdAt: addDays(currentDate, -20),
  }

  const vehicle4: Vehicle = {
    id: generateId(),
    firmaID: firmaID,
    plateNumber: 'D012HI777',
    type: 'STANDARD' as VehicleType,
    status: 'REPAIR' as VehicleStatus,
    currentDriverID: null,
    currentLat: null,
    currentLng: null,
    lastLocationUpdate: null,
    createdAt: addDays(currentDate, -15),
  }

  const vehicle5: Vehicle = {
    id: generateId(),
    firmaID: firmaID,
    plateNumber: 'E345JK777',
    type: 'MINIVAN' as VehicleType,
    status: 'INACTIVE' as VehicleStatus,
    currentDriverID: null,
    currentLat: null,
    currentLng: null,
    lastLocationUpdate: null,
    createdAt: addDays(currentDate, -10),
  }

  const vehicles = [vehicle1, vehicle2, vehicle3, vehicle4, vehicle5]

  // Reject Reasons - 6 стандартных причин отказа
  const reason1: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: tr('mockData.rejectReasons.busy', 'Busy with another order'),
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason2: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: tr('mockData.rejectReasons.wrongVehicle', 'Wrong vehicle type'),
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason3: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: tr('mockData.rejectReasons.tooFar', 'Too far from current location'),
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason4: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: tr('mockData.rejectReasons.noTime', 'Cannot make it on time'),
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason5: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: tr('mockData.rejectReasons.shiftEnding', 'Shift ending'),
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason6: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: tr('mockData.rejectReasons.technicalIssue', 'Technical issues with vehicle'),
    isActive: false,
    createdAt: addDays(currentDate, -60),
  }

  const rejectReasons = [reason1, reason2, reason3, reason4, reason5, reason6]

  // Orders - несколько тестовых заказов в разных статусах
  // Köln coordinates range: ~50.88-51.00 lat, ~6.90-7.05 lng
  const order1ID = generateId()
  const order1: Order = {
    id: order1ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: null,
    driverID: null,
    vehicleID: null,
    appointmentID: null,
    status: 'CREATED' as OrderStatus,
    scheduledTime: addHours(currentDate, 2),
    passengerName: 'Tom Hanks',
    passengerPhone: '+49 221 123-4567',
    notes: tr('mockData.notes.boardingHelp', 'Boarding assistance needed'),
    createdAt: addHours(currentDate, -1),
    assignedAt: null,
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    // Маршрут (новая структура с routes[])
    routes: [
      createRoute(
        firmaID,
        order1ID,
        1,
        'Domkloster 4, 50667 Köln',
        50.9413,
        6.9581,
        'Hohenzollernring 72, 50672 Köln',
        50.9410,
        6.9408
      ),
    ],
    // Упрощенные поля для обратной совместимости (берем первый route)
    pickupAddress: 'Domkloster 4, 50667 Köln',
    pickupLat: 50.9413,
    pickupLng: 6.9581,
    dropoffAddress: 'Hohenzollernring 72, 50672 Köln',
    dropoffLat: 50.9410,
    dropoffLng: 6.9408,
  }

  const order2ID = generateId()
  const order2: Order = {
    id: order2ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle2.id,
    appointmentID: null,
    status: 'ACCEPTED' as OrderStatus,
    scheduledTime: addHours(currentDate, 1),
    passengerName: 'Meryl Streep',
    passengerPhone: '+49 221 234-5678',
    notes: null,
    createdAt: addHours(currentDate, -2),
    assignedAt: addHours(currentDate, -1.5),
    acceptedAt: addHours(currentDate, -1),
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    routes: [
      createRoute(
        firmaID,
        order2ID,
        1,
        'Neumarkt 18, 50667 Köln',
        50.9370,
        6.9464,
        'Heumarkt 25, 50667 Köln',
        50.9355,
        6.9601
      ),
    ],
    pickupAddress: 'Neumarkt 18, 50667 Köln',
    pickupLat: 50.9370,
    pickupLng: 6.9464,
    dropoffAddress: 'Heumarkt 25, 50667 Köln',
    dropoffLat: 50.9355,
    dropoffLng: 6.9601,
  }

  const order3ID = generateId()
  const order3: Order = {
    id: order3ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle1.id,
    appointmentID: null,
    status: 'COMPLETED' as OrderStatus,
    scheduledTime: addHours(currentDate, -3),
    passengerName: 'Brad Pitt',
    passengerPhone: '+49 221 345-6789',
    notes: tr('mockData.notes.wheelchair', 'Wheelchair required'),
    createdAt: addHours(currentDate, -5),
    assignedAt: addHours(currentDate, -4.5),
    acceptedAt: addHours(currentDate, -4),
    arrivedAt: addHours(currentDate, -3.5),
    startedAt: addHours(currentDate, -3),
    completedAt: addHours(currentDate, -2),
    cancelledAt: null,
    routes: [
      createRoute(
        firmaID,
        order3ID,
        1,
        'Rudolfplatz 1, 50674 Köln',
        50.9364,
        6.9402,
        'Friesenplatz 14, 50672 Köln',
        50.9407,
        6.9388
      ),
    ],
    pickupAddress: 'Rudolfplatz 1, 50674 Köln',
    pickupLat: 50.9364,
    pickupLng: 6.9402,
    dropoffAddress: 'Friesenplatz 14, 50672 Köln',
    dropoffLat: 50.9407,
    dropoffLng: 6.9388,
  }

  const order4ID = generateId()
  const order4: Order = {
    id: order4ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: null,
    driverID: null,
    vehicleID: null,
    appointmentID: null,
    status: 'CREATED' as OrderStatus,
    scheduledTime: addHours(currentDate, 3),
    passengerName: 'George Clooney',
    passengerPhone: '+49 221 456-7890',
    notes: tr('mockData.notes.importantMeeting', 'Important meeting, do not be late'),
    createdAt: addHours(currentDate, -0.5),
    assignedAt: null,
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    routes: [
      createRoute(
        firmaID,
        order4ID,
        1,
        'Eigelstein 135, 50668 Köln',
        50.9491,
        6.9567,
        'Zülpicher Straße 28, 50674 Köln',
        50.9296,
        6.9377
      ),
    ],
    pickupAddress: 'Eigelstein 135, 50668 Köln',
    pickupLat: 50.9491,
    pickupLng: 6.9567,
    dropoffAddress: 'Zülpicher Straße 28, 50674 Köln',
    dropoffLat: 50.9296,
    dropoffLng: 6.9377,
  }

  const order5ID = generateId()
  const order5: Order = {
    id: order5ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle3.id,
    appointmentID: null,
    status: 'IN_PROGRESS' as OrderStatus,
    scheduledTime: addHours(currentDate, 0.5),
    passengerName: 'Angelina Jolie',
    passengerPhone: '+49 221 567-8901',
    notes: tr('mockData.notes.wheelchairComplex', 'Wheelchair passenger, complex route with stops'),
    createdAt: addHours(currentDate, -3),
    assignedAt: addHours(currentDate, -2.5),
    acceptedAt: addHours(currentDate, -2),
    arrivedAt: addHours(currentDate, -1),
    startedAt: addHours(currentDate, -0.5),
    completedAt: null,
    cancelledAt: null,
    // Сложный маршрут с 3 остановками (промежуточные точки)
    routes: [
      // Остановка 1: Забрать пассажира
      createRoute(
        firmaID,
        order5ID,
        1,
        'Aachener Straße 1253, 50829 Köln',
        50.9380,
        6.8356,
        'Barbarossaplatz 2, 50674 Köln',
        50.9279,
        6.9369
      ),
      // Остановка 2: Промежуточная остановка (аптека)
      createRoute(
        firmaID,
        order5ID,
        2,
        'Barbarossaplatz 2, 50674 Köln',
        50.9279,
        6.9369,
        'Neumarkt 10, 50667 Köln',
        50.9366,
        6.9473
      ),
      // Остановка 3: Финальное место назначения
      createRoute(
        firmaID,
        order5ID,
        3,
        'Neumarkt 10, 50667 Köln',
        50.9366,
        6.9473,
        'Venloer Straße 241, 50823 Köln',
        50.9469,
        6.9232
      ),
    ],
    // Упрощенные поля для обратной совместимости (первая и последняя точка)
    pickupAddress: 'Aachener Straße 1253, 50829 Köln',
    pickupLat: 50.9380,
    pickupLng: 6.8356,
    dropoffAddress: 'Venloer Straße 241, 50823 Köln',
    dropoffLat: 50.9469,
    dropoffLng: 6.9232,
  }

  const order6ID = generateId()
  const order6: Order = {
    id: order6ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle1.id,
    appointmentID: null,
    status: 'ASSIGNED' as OrderStatus,
    scheduledTime: addHours(currentDate, 4),
    passengerName: 'Leonardo DiCaprio',
    passengerPhone: '+49 221 678-9012',
    notes: null,
    createdAt: addHours(currentDate, -0.3),
    assignedAt: addHours(currentDate, -0.1),
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    routes: [
      createRoute(
        firmaID,
        order6ID,
        1,
        'Ehrenstraße 55, 50672 Köln',
        50.9382,
        6.9416,
        'Mittelstraße 12, 50672 Köln',
        50.8941,
        6.9929
      ),
    ],
    pickupAddress: 'Ehrenstraße 55, 50672 Köln',
    pickupLat: 50.9382,
    pickupLng: 6.9416,
    dropoffAddress: 'Mittelstraße 12, 50672 Köln',
    dropoffLat: 50.8941,
    dropoffLng: 6.9929,
  }

  const order7ID = generateId()
  const order7: Order = {
    id: order7ID,
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle2.id,
    appointmentID: null,
    status: 'ARRIVED' as OrderStatus,
    scheduledTime: addHours(currentDate, 0.2),
    passengerName: 'Jennifer Lawrence',
    passengerPhone: '+49 221 789-0123',
    notes: tr('mockData.notes.largeLuggage', 'With large luggage'),
    createdAt: addHours(currentDate, -1.5),
    assignedAt: addHours(currentDate, -1.2),
    acceptedAt: addHours(currentDate, -0.8),
    arrivedAt: addHours(currentDate, -0.1),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    routes: [
      createRoute(
        firmaID,
        order7ID,
        1,
        'Rheinauhafen 1, 50678 Köln',
        50.9274,
        6.9661,
        'Deutz-Mülheimer Straße 183, 51063 Köln',
        50.9577,
        6.9942
      ),
    ],
    pickupAddress: 'Rheinauhafen 1, 50678 Köln',
    pickupLat: 50.9274,
    pickupLng: 6.9661,
    dropoffAddress: 'Deutz-Mülheimer Straße 183, 51063 Köln',
    dropoffLat: 50.9577,
    dropoffLng: 6.9942,
  }

  const orders = [order1, order2, order3, order4, order5, order6, order7]

  return {
    firmaID,
    vehicles,
    rejectReasons,
    orders,
  }
}

export default getAllTransportMockData
