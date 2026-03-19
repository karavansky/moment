// Transport System Types
// Corporate taxi/transport management system

// ================================================
// VEHICLE TYPES
// ================================================

export type VehicleType = 'STANDARD' | 'MINIVAN' | 'WHEELCHAIR'

export type VehicleStatus = 'ACTIVE' | 'REPAIR' | 'INACTIVE'

export interface Vehicle {
  id: string // vehicleID
  firmaID: string
  plateNumber: string
  type: VehicleType
  status: VehicleStatus
  currentDriverID?: string | null
  currentDriverName?: string | null
  currentDriverSurname?: string | null
  currentLat?: number | null
  currentLng?: number | null
  currentSpeed?: number | null
  lastLocationUpdate?: Date | null
  createdAt: Date | string
  // Relations
  currentDriver?: Worker | null
}

// Database model (matches PostgreSQL column names)
export interface VehicleDB {
  vehicleID: string
  firmaID: string
  plateNumber: string
  type: VehicleType
  status: VehicleStatus
  currentDriverID?: string | null
  currentLat?: number | null
  currentLng?: number | null
  currentSpeed?: number | null
  lastLocationUpdate?: Date | null
  createdAt: Date
}

// ================================================
// ORDER TYPES
// ================================================

export type OrderStatus =
  | 'PENDING'       // Ожидает назначения (без appointment)
  | 'CREATED'       // Создан и назначен appointment
  | 'ASSIGNED'      // Назначен диспетчером водителю
  | 'ACCEPTED'      // Принят водителем
  | 'ARRIVED'       // Водитель на месте
  | 'IN_PROGRESS'   // Поездка началась
  | 'COMPLETED'     // Поездка завершена
  | 'CANCELLED'     // Отменен

export interface Order {
  id: string // orderID
  firmaID: string
  clientID: string
  dispatcherID?: string | null
  driverID?: string | null
  vehicleID?: string | null
  appointmentID?: string | null // NULL для PENDING заказов (Workflow 2)
  requestedTime?: Date | null // Желаемое время подачи от клиента
  scheduledTime?: Date | null
  status: OrderStatus
  clientComment?: string | null
  phone?: string | null
  createdAt: Date
  assignedAt?: Date | null
  acceptedAt?: Date | null
  arrivedAt?: Date | null
  startedAt?: Date | null
  completedAt?: Date | null
  cancelledAt?: Date | null
  // Relations
  client?: Client
  dispatcher?: User | null
  driver?: Worker | null
  vehicle?: Vehicle | null
  appointment?: Appointment | null
  routes?: Route[]
  rejects?: OrderReject[]

  // Simplified fields (for UI/mock data compatibility)
  // These can be used instead of routes[] array for simple single-destination orders
  pickupAddress?: string
  pickupLat?: number | null
  pickupLng?: number | null
  dropoffAddress?: string
  dropoffLat?: number | null
  dropoffLng?: number | null
  passengerName?: string
  passengerPhone?: string
  notes?: string | null
}

// Database model
export interface OrderDB {
  orderID: string
  firmaID: string
  clientID: string
  dispatcherID?: string | null
  driverID?: string | null
  vehicleID?: string | null
  appointmentID?: string | null
  requestedTime?: Date | null
  scheduledTime?: Date | null
  status: OrderStatus
  clientComment?: string | null
  phone?: string | null
  createdAt: Date
  assignedAt?: Date | null
  acceptedAt?: Date | null
  arrivedAt?: Date | null
  startedAt?: Date | null
  completedAt?: Date | null
  cancelledAt?: Date | null
}

// ================================================
// ROUTE TYPES
// ================================================

export interface Route {
  id: string // routeID
  firmaID: string
  orderID?: string | null // Временная связь (Workflow 2)
  appointmentID?: string | null // Основная связь после назначения
  sequence: number // Порядок остановок (1, 2, 3...)
  pickupAddress: string
  dropoffAddress: string
  pickupLat?: number | null
  pickupLng?: number | null
  dropoffLat?: number | null
  dropoffLng?: number | null
  createdAt: Date
  // Relations
  order?: Order
  appointment?: Appointment
}

// Database model
export interface RouteDB {
  routeID: string
  firmaID: string
  orderID?: string | null
  appointmentID?: string | null
  sequence: number
  pickupAddress: string
  dropoffAddress: string
  pickupLat?: number | null
  pickupLng?: number | null
  dropoffLat?: number | null
  dropoffLng?: number | null
  createdAt: Date
}

// ================================================
// REJECT REASON TYPES
// ================================================

export interface RejectReason {
  id: string // reasonID
  firmaID: string
  reasonText: string
  isActive: boolean
  createdAt: Date
}

// Database model
export interface RejectReasonDB {
  reasonID: string
  firmaID: string
  reasonText: string
  isActive: boolean
  createdAt: Date
}

// ================================================
// ORDER REJECT TYPES
// ================================================

export interface OrderReject {
  id: string // rejectID
  orderID: string
  driverID: string
  reasonID?: string | null
  customReason?: string | null
  createdAt: Date
  // Relations
  order?: Order
  driver?: Worker
  reason?: RejectReason | null
}

// Database model
export interface OrderRejectDB {
  rejectID: string
  orderID: string
  driverID: string
  reasonID?: string | null
  customReason?: string | null
  createdAt: Date
}

// ================================================
// TRACK POINT TYPES (GPS Tracking)
// ================================================

export interface TrackPoint {
  id: number // BigInt auto-increment
  orderID: string
  vehicleID: string
  driverID: string
  latitude: number
  longitude: number
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  recordedAt: Date // When GPS point was recorded (device time)
  createdAt: Date // When inserted to database (server time)
}

// Database model with PostGIS geometry
export interface TrackPointDB {
  id: number
  orderID: string
  vehicleID: string
  driverID: string
  location: string // PostGIS GEOMETRY(POINT, 4326) - stored as WKT or GeoJSON
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  recordedAt: Date
  createdAt: Date
}

// GPS coordinates (for API input/output)
export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  timestamp?: Date // recordedAt
}

// ================================================
// WORKER EXTENSIONS (Transport-specific)
// ================================================

import type { Worker, Client, User, Appointment } from './scheduling'

// Extended Worker type with transport fields
export interface TransportWorker extends Worker {
  hasVehicle?: boolean
  vehicleID?: string | null
  isOnline?: boolean
  vehicle?: Vehicle | null
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

// Create Vehicle
export interface CreateVehicleData {
  plateNumber: string
  type: VehicleType
  status?: VehicleStatus
  currentDriverID?: string
}

// Update Vehicle
export interface UpdateVehicleData {
  plateNumber?: string
  type?: VehicleType
  status?: VehicleStatus
  currentDriverID?: string | null
  currentLat?: number | null
  currentLng?: number | null
}

// Create Order
export interface CreateOrderData {
  clientID: string
  appointmentID?: string | null // NULL для Workflow 2 (клиент создает заказ)
  requestedTime?: Date | null // Желаемое время подачи (Workflow 2)
  scheduledTime?: Date | null // Точное время (Workflow 1)
  clientComment?: string
  phone?: string
  routes: Array<{
    sequence: number
    pickupAddress: string
    dropoffAddress: string
    pickupLat?: number
    pickupLng?: number
    dropoffLat?: number
    dropoffLng?: number
  }>
}

// Update Order
export interface UpdateOrderData {
  dispatcherID?: string
  driverID?: string | null
  vehicleID?: string | null
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

// Reject Order
export interface RejectOrderData {
  reasonID?: string
  customReason?: string
}

// Location Update (GPS tracking)
export interface LocationUpdateData {
  orderID: string
  vehicleID: string
  latitude: number
  longitude: number
  speed?: number
  heading?: number
  accuracy?: number
  timestamp?: Date // recordedAt
}

// Bulk Location Update
export interface BulkLocationUpdateData {
  updates: LocationUpdateData[]
}

// ================================================
// SSE EVENT TYPES (Real-time)
// ================================================

export type TransportEventType =
  | 'vehicle_created'
  | 'vehicle_updated'
  | 'vehicle_deleted'
  | 'vehicle_location_update'
  | 'order_created'
  | 'order_updated'
  | 'order_deleted'
  | 'order_assigned'
  | 'order_accepted'
  | 'order_rejected'
  | 'order_completed'
  | 'driver_online'
  | 'driver_offline'
  | 'reject_reason_created'
  | 'reject_reason_updated'
  | 'reject_reason_deleted'

export interface TransportEvent {
  type: TransportEventType
  firmaID: string
  vehicleID?: string
  orderID?: string
  driverID?: string
  dispatcherID?: string
  status?: OrderStatus
  location?: {
    lat: number
    lng: number
  }
  timestamp?: Date
}

// ================================================
// DISPATCHER VIEW TYPES
// ================================================

// Vehicle with real-time location and status for dispatcher map
export interface DispatcherVehicle extends Vehicle {
  driver?: TransportWorker | null
  currentOrder?: Order | null
  distanceFromPickup?: number // meters
}

// Order with full details for dispatcher panel
export interface DispatcherOrder extends Order {
  client: Client
  driver?: TransportWorker | null
  vehicle?: Vehicle | null
  routes: Route[]
  estimatedPickupTime?: Date
  distanceToClient?: number // meters
  nearbyVehicles?: DispatcherVehicle[] // For auto-assignment
}

// ================================================
// DRIVER VIEW TYPES (PWA)
// ================================================

// Order notification for driver
export interface DriverOrderNotification {
  orderID: string
  clientName: string
  clientAddress: string
  pickupAddress: string
  dropoffAddress: string
  scheduledTime?: Date | null
  clientComment?: string | null
  distanceToPickup: number // meters
  estimatedTime: number // minutes
  expiresAt: Date // Countdown timer (e.g., 30 seconds to accept)
}

// Active order details for driver during trip
export interface DriverActiveOrder extends Order {
  client: Client
  routes: Route[]
  currentRouteIndex: number
  nextStop?: Route
  totalDistance?: number // meters
  estimatedDuration?: number // minutes
}

// ================================================
// STATISTICS TYPES
// ================================================

export interface TransportStats {
  totalVehicles: number
  activeVehicles: number
  onlineDrivers: number
  totalOrders: number
  activeOrders: number
  completedToday: number
  cancelledToday: number
  averageRating?: number
  averageResponseTime?: number // seconds
}

export interface DriverStats {
  driverID: string
  driverName: string
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  rejectedOrders: number
  averageRating?: number
  totalDistance?: number // km
  totalDuration?: number // hours
  lastOrderDate?: Date
}
