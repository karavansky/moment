import type { Report } from '@/types/scheduling'

/**
 * Normalize a Date or date string to YYYY-MM-DD format.
 * PostgreSQL DATE columns come as Date objects at UTC midnight via pg driver,
 * so we use UTC methods to extract the correct date regardless of server timezone.
 */
function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null
  // If already a YYYY-MM-DD string, return as-is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = value instanceof Date ? value : new Date(value)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Raw DB appointment row type (from PostgreSQL query)
 */
interface AppointmentDBRow {
  appointmentID: string
  firmaID: string
  userID: string
  clientID: string
  workerId: string
  workerIds?: string[]
  date: Date | string | null
  isFixedTime?: boolean
  startTime?: Date | string
  endTime?: Date | string
  duration: number
  fahrzeit?: number
  isOpen?: boolean
  openedAt?: Date | string
  closedAt?: Date | string
  createdAt?: Date | string
  editedAt?: Date | string
  latitude?: number
  longitude?: number
  services?: any[]
  workers_data?: any[]
  client?: any
}

/**
 * Maps raw DB appointment row to frontend Appointment format.
 * Shared between GET /api/scheduling and GET /api/scheduling/appointments.
 * Note: reports field should be added separately by the caller.
 */
export function mapAppointmentToFrontend(a: AppointmentDBRow) {
  return {
    id: a.appointmentID,
    firmaID: a.firmaID,
    userID: a.userID,
    clientID: a.clientID,
    workerId: a.workerId,
    workerIds: a.workerIds || [],
    date: toDateOnly(a.date),
    isFixedTime: a.isFixedTime,
    startTime: a.startTime ? new Date(a.startTime).toISOString() : undefined,
    endTime: a.endTime ? new Date(a.endTime).toISOString() : undefined,
    duration: a.duration,
    fahrzeit: a.fahrzeit,
    isOpen: a.isOpen,
    openedAt: a.openedAt ? new Date(a.openedAt).toISOString() : undefined,
    closedAt: a.closedAt ? new Date(a.closedAt).toISOString() : undefined,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    editedAt: a.editedAt ? new Date(a.editedAt).toISOString() : undefined,
    latitude: a.latitude,
    longitude: a.longitude,
    services: (a.services || []).map((s: any) => ({
      id: s.id,
      firmaID: s.firmaID,
      name: s.name,
      duration: s.duration,
      price: s.price ? Number(s.price) : undefined,
      parentId: s.parentId,
      isGroup: s.isGroup || false,
      order: s.order || 0,
    })),
    worker: (a.workers_data || []).map((w: any) => ({
      id: w.id,
      firmaID: w.firmaID,
      name: w.name,
      surname: w.surname || '',
      email: w.email || '',
      teamId: w.teamId || null,
      status: w.status,
      isAdress: false,
    })),
    client: a.client
      ? {
          id: a.client.id,
          firmaID: a.client.firmaID,
          name: a.client.name,
          surname: a.client.surname || '',
          status: a.client.status,
          country: a.client.country || '',
          street: a.client.street || '',
          postalCode: a.client.postalCode || '',
          city: a.client.city || '',
          houseNumber: a.client.houseNumber || '',
          latitude: a.client.latitude || 0,
          longitude: a.client.longitude || 0,
        }
      : undefined,
    reports: [] as Report[], // Default empty array, caller should populate
  }
}
