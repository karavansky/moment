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

// Функция генерации всех mock данных для транспортной системы
export const getAllTransportMockData = () => {
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
    reasonText: 'Занят другим заказом',
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason2: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: 'Не подходящий тип транспорта',
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason3: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: 'Слишком далеко от текущего местоположения',
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason4: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: 'Не успеваю в указанное время',
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason5: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: 'Завершаю смену',
    isActive: true,
    createdAt: addDays(currentDate, -60),
  }

  const reason6: RejectReason = {
    id: generateId(),
    firmaID: firmaID,
    reasonText: 'Технические проблемы с автомобилем',
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
    notes: 'Требуется помощь с посадкой',
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
        'Köln, Domkloster 4',
        50.9413,
        6.9581,
        'Köln, Hohenzollernring 72',
        50.9410,
        6.9408
      ),
    ],
    // Упрощенные поля для обратной совместимости (берем первый route)
    pickupAddress: 'Köln, Domkloster 4',
    pickupLat: 50.9413,
    pickupLng: 6.9581,
    dropoffAddress: 'Köln, Hohenzollernring 72',
    dropoffLat: 50.9410,
    dropoffLng: 6.9408,
  }

  const order2: Order = {
    id: generateId(),
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle2.id,
    appointmentID: null,
    status: 'ACCEPTED' as OrderStatus,
    scheduledTime: addHours(currentDate, 1),
    pickupAddress: 'Köln, Neumarkt 18',
    pickupLat: 50.9370,
    pickupLng: 6.9464,
    dropoffAddress: 'Köln, Heumarkt 25',
    dropoffLat: 50.9355,
    dropoffLng: 6.9601,
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
  }

  const order3: Order = {
    id: generateId(),
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle1.id,
    appointmentID: null,
    status: 'COMPLETED' as OrderStatus,
    scheduledTime: addHours(currentDate, -3),
    pickupAddress: 'Köln, Rudolfplatz 1',
    pickupLat: 50.9364,
    pickupLng: 6.9402,
    dropoffAddress: 'Köln, Friesenplatz 14',
    dropoffLat: 50.9407,
    dropoffLng: 6.9388,
    passengerName: 'Brad Pitt',
    passengerPhone: '+49 221 345-6789',
    notes: 'Коляска для инвалидов',
    createdAt: addHours(currentDate, -5),
    assignedAt: addHours(currentDate, -4.5),
    acceptedAt: addHours(currentDate, -4),
    arrivedAt: addHours(currentDate, -3.5),
    startedAt: addHours(currentDate, -3),
    completedAt: addHours(currentDate, -2),
    cancelledAt: null,
  }

  const order4: Order = {
    id: generateId(),
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: null,
    driverID: null,
    vehicleID: null,
    appointmentID: null,
    status: 'CREATED' as OrderStatus,
    scheduledTime: addHours(currentDate, 3),
    pickupAddress: 'Köln, Eigelstein 135',
    pickupLat: 50.9491,
    pickupLng: 6.9567,
    dropoffAddress: 'Köln, Zülpicher Straße 28',
    dropoffLat: 50.9296,
    dropoffLng: 6.9377,
    passengerName: 'George Clooney',
    passengerPhone: '+49 221 456-7890',
    notes: 'Важная встреча, не опаздывать',
    createdAt: addHours(currentDate, -0.5),
    assignedAt: null,
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
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
    notes: 'Пассажир на коляске, сложный маршрут с остановками',
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
        'Köln, Aachener Straße 1253',
        50.9380,
        6.8356,
        'Köln, Barbarossaplatz 2',
        50.9279,
        6.9369
      ),
      // Остановка 2: Промежуточная остановка (аптека)
      createRoute(
        firmaID,
        order5ID,
        2,
        'Köln, Barbarossaplatz 2',
        50.9279,
        6.9369,
        'Köln, Neumarkt 10',
        50.9366,
        6.9473
      ),
      // Остановка 3: Финальное место назначения
      createRoute(
        firmaID,
        order5ID,
        3,
        'Köln, Neumarkt 10',
        50.9366,
        6.9473,
        'Köln, Venloer Straße 241',
        50.9469,
        6.9232
      ),
    ],
    // Упрощенные поля для обратной совместимости (первая и последняя точка)
    pickupAddress: 'Köln, Aachener Straße 1253',
    pickupLat: 50.9380,
    pickupLng: 6.8356,
    dropoffAddress: 'Köln, Venloer Straße 241',
    dropoffLat: 50.9469,
    dropoffLng: 6.9232,
  }

  const order6: Order = {
    id: generateId(),
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle1.id,
    appointmentID: null,
    status: 'ASSIGNED' as OrderStatus,
    scheduledTime: addHours(currentDate, 4),
    pickupAddress: 'Köln, Ehrenstraße 55',
    pickupLat: 50.9382,
    pickupLng: 6.9416,
    dropoffAddress: 'Köln, Mittelstraße 12',
    dropoffLat: 50.8941,
    dropoffLng: 6.9929,
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
  }

  const order7: Order = {
    id: generateId(),
    firmaID: firmaID,
    clientID: generateId(),
    dispatcherID: generateId(),
    driverID: generateId(),
    vehicleID: vehicle2.id,
    appointmentID: null,
    status: 'ARRIVED' as OrderStatus,
    scheduledTime: addHours(currentDate, 0.2),
    pickupAddress: 'Köln, Rheinauhafen 1',
    pickupLat: 50.9274,
    pickupLng: 6.9661,
    dropoffAddress: 'Köln, Deutz-Mülheimer Straße 183',
    dropoffLat: 50.9577,
    dropoffLng: 6.9942,
    passengerName: 'Jennifer Lawrence',
    passengerPhone: '+49 221 789-0123',
    notes: 'С большим багажом',
    createdAt: addHours(currentDate, -1.5),
    assignedAt: addHours(currentDate, -1.2),
    acceptedAt: addHours(currentDate, -0.8),
    arrivedAt: addHours(currentDate, -0.1),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
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
