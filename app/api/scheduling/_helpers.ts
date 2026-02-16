/**
 * Maps raw DB appointment row to frontend Appointment format.
 * Shared between GET /api/scheduling and GET /api/scheduling/appointments.
 */
export function mapAppointmentToFrontend(a: any) {
  return {
    id: a.appointmentID,
    firmaID: a.firmaID,
    userID: a.userID,
    clientID: a.clientID,
    workerId: a.workerId,
    workerIds: a.workerIds || [],
    date: a.date,
    isFixedTime: a.isFixedTime,
    startTime: a.startTime,
    endTime: a.endTime,
    duration: a.duration,
    fahrzeit: a.fahrzeit,
    isOpen: a.isOpen,
    openedAt: a.openedAt,
    closedAt: a.closedAt,
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
      teamId: w.teamId || '',
      status: w.status,
      isAdress: false,
    })),
    client: a.client ? {
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
    } : undefined,
  }
}
