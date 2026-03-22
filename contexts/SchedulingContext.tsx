'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
  useCallback,
} from 'react'
import {
  Appointment,
  Worker,
  Client,
  Team,
  Groupe,
  User,
  Report,
  Service,
  ServiceTreeItem,
  Notif,
} from '@/types/scheduling'
import type { Vehicle, RejectReason, Order } from '@/types/transport'
import getAllSampleObjects from '@/lib/scheduling-mock-data'
import { useNotifications } from '@/contexts/NotificationContext'
import { generateId } from '@/lib/generate-id'
import { useAuth } from '@/components/AuthProvider'
import { toLocalDateString, parseLocalDate } from '@/lib/calendar-utils'
import { useSchedulingEvents, SchedulingEvent } from '@/hooks/useSchedulingEvents'

// Мост между двумя Providers-экземплярами (/ и /[lang]/)
// Живёт на уровне JS-модуля: переживает SPA-навигацию, сбрасывается при F5
// ВАЖНО: В dev mode при HMR модуль может перезагружаться, поэтому дублируем в sessionStorage
const appointmentOverrides: Record<string, Partial<Appointment>> = {}

// Helper functions to sync with sessionStorage
const STORAGE_KEY = 'appointmentOverrides'

function loadOverridesFromStorage() {
  if (typeof window === 'undefined') return
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      Object.assign(appointmentOverrides, parsed)
      console.log('[SchedulingContext] Loaded appointmentOverrides from sessionStorage:', Object.keys(appointmentOverrides))
    }
  } catch (e) {
    console.error('[SchedulingContext] Failed to load appointmentOverrides from sessionStorage:', e)
  }
}

function saveOverridesToStorage() {
  if (typeof window === 'undefined') return
  try {
    const json = JSON.stringify(appointmentOverrides)
    sessionStorage.setItem(STORAGE_KEY, json)
    console.log('[SchedulingContext] Saved appointmentOverrides to sessionStorage:', Object.keys(appointmentOverrides), 'bytes:', json.length)
  } catch (e) {
    console.error('[SchedulingContext] Failed to save appointmentOverrides to sessionStorage:', e)
  }
}

// Load on module initialization
loadOverridesFromStorage()

// Типы для группированных данных
interface GroupedClients {
  group: Groupe
  clients: Client[]
}

export interface TeamsWithWorkers {
  team: Team
  workers: Worker[]
}

export interface ServiceOption {
  id: string
  name: string
  fullPath: string
}

export interface ServiceGroupForSelect {
  id: string
  label: string
  options: ServiceOption[]
}

export interface ServicesForSelect {
  rootServices: ServiceOption[]
  groups: ServiceGroupForSelect[]
}

// Тип для состояния планирования
interface SchedulingState {
  user: User | null
  teams: Team[]
  groups: Groupe[]
  workers: Worker[]
  clients: Client[]
  appointments: Appointment[]
  reports: Report[]
  services: ServiceTreeItem[]
  vehicles: Vehicle[]
  rejectReasons: RejectReason[]
  orders: Order[]
  firmaID: string
  isLoading: boolean
  isLiveMode: boolean
  selectedWorker: Worker | null
  selectedClient: Client | null
  selectedDate: Date
  selectedAppointment: Appointment | null
}

// Appointment с обязательным client для отображения на карте
export interface AppointmentWithClient extends Appointment {
  client: Client
}

// Тип для вычисляемых данных (derived state)
interface SchedulingDerived {
  groupedClients: GroupedClients[]
  teamsWithWorkers: TeamsWithWorkers[]
  todayAppointments: AppointmentWithClient[]
  servicesForSelect: ServicesForSelect
}

// Тип для действий (actions)
interface SchedulingActions {
  setSelectedWorker: (worker: Worker | null) => void
  setSelectedClient: (client: Client | null) => void
  setSelectedDate: (date: Date) => void
  setSelectedAppointment: (appointment: Appointment | null) => void
  addAppointment: (appointment: Appointment) => void
  updateAppointment: (appointment: Appointment, skipNetwork?: boolean) => void
  deleteAppointment: (id: string) => void
  moveAppointmentToDate: (appointmentId: string, newDate: Date) => void
  addClient: (client: Client) => void
  updateClient: (client: Client) => void
  deleteClient: (id: string) => Promise<void>
  addTeam: (team: Team) => void
  addWorker: (worker: Worker) => void
  updateWorker: (worker: Worker) => void
  deleteWorker: (id: string) => Promise<void>
  addService: (service: ServiceTreeItem) => void
  updateService: (service: ServiceTreeItem) => void
  deleteService: (id: string) => void
  refreshData: () => void
  refreshAppointments: () => Promise<void>
  refreshWorkers: () => Promise<void>
  refreshClients: () => Promise<void>
  refreshTeams: () => Promise<void>
  refreshGroups: () => Promise<void>
  refreshServices: () => Promise<void>
  upsertReport: (report: Report) => void
  openAppointment: (appointmentId: string, workerId: string) => void
  closeAppointment: (appointmentId: string) => void
  setAppointmentOverride: (appointmentId: string, override: Partial<Appointment>) => void
  getAppointmentWithOverrides: (appointmentId: string) => Appointment | undefined
  clearAppointmentOverride: (appointmentId: string) => void
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (vehicle: Vehicle) => void
  deleteVehicle: (id: string) => void
  addRejectReason: (reason: RejectReason) => void
  updateRejectReason: (reason: RejectReason) => void
  deleteRejectReason: (id: string) => void
}

// Комбинированный тип для контекста
type SchedulingContextType = SchedulingState & SchedulingActions & SchedulingDerived

// Создаем контекст
const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined)

// Helper: fetch с обработкой ошибок
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include session cookies for authentication
    ...options,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))

    // For permission errors (403), log as warning instead of error
    if (res.status === 403 && data.error === 'NO_PERMISSION') {
      console.warn('[apiFetch] Permission denied:', data.message)
    } else {
      console.error('[apiFetch] Error response:', { url, status: res.status, error: data.error || data })
    }

    throw new Error(data.error || `API error ${res.status}`)
  }
  return res.json()
}

// Провайдер контекста
export const SchedulingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 8))
  const { addNotification } = useNotifications()
  const { session, status: authStatus } = useAuth()

  // Определяем режим: live (авторизованный с firmaID) или mock (демо)
  // status=0 (директор), 1 (worker), 2 (client), 7 (Sport- und Bäderamt), null/undefined (до миграции)
  const userStatus = session?.user?.status
  const isLiveMode =
    authStatus === 'authenticated' &&
    (userStatus === 0 || userStatus === 1 || userStatus === 2 || userStatus === 7 || userStatus == null) &&
    !!session?.user?.firmaID

  console.log('[SchedulingProvider] Mode check:', {
    authStatus,
    userStatus: session?.user?.status,
    firmaID: session?.user?.firmaID,
    isLiveMode,
  })
  const isLiveModeRef = useRef(isLiveMode)
  isLiveModeRef.current = isLiveMode
  const stateRef = useRef<SchedulingState | null>(null)

  const [state, setState] = useState<SchedulingState>({
    user: null,
    teams: [],
    groups: [],
    workers: [],
    clients: [],
    appointments: [],
    reports: [],
    services: [],
    vehicles: [],
    rejectReasons: [],
    orders: [],
    firmaID: '',
    isLoading: true,
    isLiveMode: false,
    selectedWorker: null,
    selectedClient: null,
    selectedDate: new Date(),
    selectedAppointment: null,
  })
  stateRef.current = state

  useEffect(() => {
    console.log(`🟢 SchedulingProvider MOUNTED [${mountIdRef.current}]`)
    return () => {
      console.log(`🔴 SchedulingProvider UNMOUNTED [${mountIdRef.current}]`)
    }
  }, [])

  // Загрузка mock данных
  const loadMockData = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const mockData = getAllSampleObjects()

      let appointments = mockData.appointments
      const overrideKeys = Object.keys(appointmentOverrides)
      if (overrideKeys.length > 0) {
        appointments = appointments.map(apt => {
          const overrides = appointmentOverrides[apt.id]
          return overrides ? { ...apt, ...overrides } : apt
        })
      }

      setState(prev => {
        // Preserve selectedAppointment by finding the updated version in new appointments
        const updatedSelectedAppointment = prev.selectedAppointment
          ? appointments.find((apt: Appointment) => apt.id === prev.selectedAppointment?.id) || prev.selectedAppointment
          : null

        return {
          ...prev,
          user: mockData.user,
          teams: mockData.teams,
          groups: mockData.groups,
          workers: mockData.workers,
          clients: mockData.clients,
          appointments,
          reports: mockData.reports,
          services: mockData.services,
          vehicles: mockData.vehicles || [],
          rejectReasons: mockData.rejectReasons || [],
          firmaID: mockData.firmaID,
          isLoading: false,
          isLiveMode: false,
          selectedAppointment: updatedSelectedAppointment,
          // Don't reset selectedWorker/Client/Date - preserve current state
          // selectedWorker: null,
          // selectedClient: null,
          // selectedDate: new Date(),
        }
      })

      console.log('Mock data loaded successfully:', {
        workers: mockData.workers.length,
        clients: mockData.clients.length,
        appointments: mockData.appointments.length,
      })
    } catch (error) {
      console.error('Error loading mock data:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Загрузка реальных данных из API
  const loadLiveData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const data = await apiFetch('/api/scheduling')

      // Convert date strings from JSON to Date objects
      const appointments = (data.appointments || []).map((apt: Record<string, unknown>) => ({
        ...apt,
        date: parseLocalDate(apt.date as string),
        startTime: apt.startTime ? new Date(apt.startTime as string) : apt.startTime,
        endTime: apt.endTime ? new Date(apt.endTime as string) : apt.endTime,
        openedAt: apt.openedAt ? new Date(apt.openedAt as string) : apt.openedAt,
        closedAt: apt.closedAt ? new Date(apt.closedAt as string) : apt.closedAt,
      }))

      setState(prev => {
        // Preserve selectedAppointment by finding the updated version in new appointments
        const updatedSelectedAppointment = prev.selectedAppointment
          ? appointments.find((apt: Appointment) => apt.id === prev.selectedAppointment?.id) || prev.selectedAppointment
          : null

        console.log('[SchedulingContext] loadLiveData setState:', {
          hadSelectedAppointment: !!prev.selectedAppointment,
          prevSelectedAppointmentId: prev.selectedAppointment?.id,
          foundUpdatedAppointment: !!updatedSelectedAppointment,
          updatedAppointmentId: updatedSelectedAppointment?.id,
          updatedAppointmentReportsCount: updatedSelectedAppointment?.reports?.length,
        })

        return {
          ...prev,
          user: data.user,
          teams: data.teams,
          groups: data.groupes,
          workers: data.workers,
          clients: data.clients,
          appointments,
          reports: data.reports,
          services: data.services,
          vehicles: data.vehicles || [],
          rejectReasons: data.rejectReasons || [],
          firmaID: data.firmaID,
          isLoading: false,
          isLiveMode: true,
          selectedAppointment: updatedSelectedAppointment,
          // Don't reset selectedWorker/Client/Date - preserve current state
          // selectedWorker: null,
          // selectedClient: null,
          // selectedDate: new Date(),
        }
      })

      console.log('[SchedulingContext] loadLiveData completed:', {
        workers: data.workers.length,
        clients: data.clients.length,
        appointments: data.appointments.length,
        openAppointments: appointments.filter((a: Appointment) => a.isOpen).map((a: Appointment) => ({ id: a.id, isOpen: a.isOpen })),
      })
    } catch (error) {
      console.error('Error loading live data:', error)
      // Не fallback на mock — показываем пустое состояние для авторизованного пользователя
      setState(prev => ({ ...prev, isLoading: false, isLiveMode: true }))
    }
  }, [])

  // Лёгкое обновление только appointments (для SSE-событий)
  const refreshAppointments = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/appointments')
      const appointments = (data.appointments || []).map((apt: Record<string, unknown>) => ({
        ...apt,
        date: parseLocalDate(apt.date as string),
        startTime: apt.startTime ? new Date(apt.startTime as string) : apt.startTime,
        endTime: apt.endTime ? new Date(apt.endTime as string) : apt.endTime,
        openedAt: apt.openedAt ? new Date(apt.openedAt as string) : apt.openedAt,
        closedAt: apt.closedAt ? new Date(apt.closedAt as string) : apt.closedAt,
      }))

      setState(prev => ({ ...prev, appointments }))
      console.log('[SSE] Appointments refreshed:', appointments.length)
    } catch (error) {
      console.error('[SSE] Failed to refresh appointments:', error)
    }
  }, [])

  const refreshWorkers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/workers')
      setState(prev => ({ ...prev, workers: data.workers || [] }))
      console.log('[SSE] Workers refreshed:', (data.workers || []).length)
    } catch (error) {
      console.error('[SSE] Failed to refresh workers:', error)
    }
  }, [])

  const refreshClients = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/clients')
      setState(prev => ({ ...prev, clients: data.clients || [] }))
      console.log('[SSE] Clients refreshed:', (data.clients || []).length)
    } catch (error) {
      console.error('[SSE] Failed to refresh clients:', error)
    }
  }, [])

  const refreshTeams = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/teams')
      setState(prev => ({ ...prev, teams: data.teams || [] }))
      console.log('[SSE] Teams refreshed:', (data.teams || []).length)
    } catch (error) {
      console.error('[SSE] Failed to refresh teams:', error)
    }
  }, [])

  const refreshGroups = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/groupes')
      setState(prev => ({ ...prev, groups: data.groupes || [] }))
      console.log('[SSE] Groups refreshed:', (data.groupes || []).length)
    } catch (error) {
      console.error('[SSE] Failed to refresh groups:', error)
    }
  }, [])

  const refreshServices = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/services')
      setState(prev => ({ ...prev, services: data.services || [] }))
      console.log('[SSE] Services refreshed:', (data.services || []).length)
    } catch (error) {
      console.error('[SSE] Failed to refresh services:', error)
    }
  }, [])

  const refreshReports = useCallback(async () => {
    try {
      const data = await apiFetch('/api/scheduling/reports')
      setState(prev => ({ ...prev, reports: data.reports || [] }))
      console.log('[SSE] Reports refreshed:', (data.reports || []).length)
    } catch (error) {
      console.error('[SSE] Failed to refresh reports:', error)
    }
  }, [])

  // Инициализация данных — зависит от auth
  useEffect(() => {
    if (authStatus === 'loading') return

    if (isLiveMode) {
      loadLiveData()
    } else {
      loadMockData()
    }
  }, [authStatus, isLiveMode, loadLiveData, loadMockData])

  // SSE: подписка на real-time события
  const handleSchedulingEvent = useCallback(
    (event: SchedulingEvent) => {
      // Обработка событий workers/clients/teams/groups/services
      if (
        event.type === 'worker_created' ||
        event.type === 'worker_updated' ||
        event.type === 'worker_deleted'
      ) {
        refreshWorkers()
        return
      }
      if (
        event.type === 'client_created' ||
        event.type === 'client_updated' ||
        event.type === 'client_deleted'
      ) {
        refreshClients()
        return
      }
      if (
        event.type === 'team_created' ||
        event.type === 'team_updated' ||
        event.type === 'team_deleted'
      ) {
        refreshTeams()
        return
      }
      if (
        event.type === 'groupe_created' ||
        event.type === 'groupe_updated' ||
        event.type === 'groupe_deleted'
      ) {
        refreshGroups()
        return
      }
      if (
        event.type === 'service_created' ||
        event.type === 'service_updated' ||
        event.type === 'service_deleted'
      ) {
        refreshServices()
        return
      }

      if (!event.appointmentID) return

      // Для worker/client: событие релевантно если:
      // 1) appointment назначен на этого worker/client (workerIds includes myWorkerID), ИЛИ
      // 2) appointment уже есть в локальном state (мог быть переназначен ОТ этого worker/client)
      const user = stateRef.current?.user
      const existsLocally = stateRef.current?.appointments.some(
        apt => apt.id === event.appointmentID
      )
      const eventWorkerIds = event.workerIds || []
      if (user?.myWorkerID && !eventWorkerIds.includes(user.myWorkerID) && !existsLocally) return
      if (user?.myClientID && event.clientID !== user.myClientID && !existsLocally) return

      if (event.type === 'appointment_created') {
        refreshAppointments()
        // In-app toast for worker: new appointment assigned
        if (user?.myWorkerID && eventWorkerIds.includes(user.myWorkerID)) {
          queueMicrotask(() => {
            addNotification({
              id: generateId(),
              userID: 'system',
              type: 'info',
              title: 'New Appointment',
              message: 'You have been assigned to a new appointment.',
              date: new Date(),
              isRead: false,
              actionProps: {
                children: 'View',
                href: '/dienstplan',
                variant: 'primary',
              },
            })
          })
        }
        return
      }

      if (event.type === 'appointment_deleted') {
        // In-app toast for worker: appointment cancelled
        if (user?.myWorkerID && existsLocally) {
          queueMicrotask(() => {
            addNotification({
              id: generateId(),
              userID: 'system',
              type: 'warning',
              title: 'Appointment Cancelled',
              message: 'An appointment you were assigned to has been cancelled.',
              date: new Date(),
              isRead: false,
            })
          })
        }
        refreshAppointments()
        return
      }

      if (event.type === 'appointment_updated') {
        setState(prev => {
          const existing = prev.appointments.find(apt => apt.id === event.appointmentID)
          if (!existing) {
            // Appointment не в локальном state — возможно, назначен на этого работника
            refreshAppointments()
            return prev
          }

          // Быстрый путь: если только isOpen изменился — inline update без рефреша
          const isOpenChanged = event.isOpen !== undefined && event.isOpen !== existing.isOpen
          const workersChanged = (() => {
            const existingWorkerIds = existing.worker?.map(w => w.id).sort() || []
            const newWorkerIds = [...eventWorkerIds].sort()
            return (
              existingWorkerIds.length !== newWorkerIds.length ||
              existingWorkerIds.some((id, i) => id !== newWorkerIds[i])
            )
          })()
          const clientChanged = event.clientID && event.clientID !== existing.clientID

          if (isOpenChanged && !workersChanged && !clientChanged) {
            // Только isOpen/openedAt/closedAt изменился — быстрый inline update
            const updated = {
              ...existing,
              isOpen: event.isOpen ?? existing.isOpen,
              // Use !== undefined to distinguish "not in event" from explicit null (clear)
              openedAt:
                event.openedAt !== undefined
                  ? event.openedAt
                    ? new Date(event.openedAt)
                    : undefined
                  : existing.openedAt,
              closedAt:
                event.closedAt !== undefined
                  ? event.closedAt
                    ? new Date(event.closedAt)
                    : undefined
                  : existing.closedAt,
            }

            // Notification для директора при открытии appointment
            if (event.isOpen && !existing.isOpen) {
              const client = existing.client
              const workerNames = existing.worker?.map(w => `${w.name} ${w.surname}`).join(', ')
              if (workerNames && client) {
                queueMicrotask(() => {
                  const notification: Notif = {
                    userID: 'system',
                    type: 'info',
                    title: 'Starting Appointment!',
                    message: `${workerNames} started an appointment with ${client.name} ${client.surname} ${client.street} ${client.houseNumber}, ${client.city}.`,
                    actionProps: {
                      children: 'See on map',
                      href: `/dispatcher/${event.appointmentID}`,
                      variant: 'primary',
                    },
                    id: generateId(),
                    date: new Date(),
                    isRead: false,
                  }
                  addNotification(notification)
                })
              }
            }

            // Notification для директора при закрытии appointment
            if (!event.isOpen && existing.isOpen) {
              const client = existing.client
              const workerNames = existing.worker?.map(w => `${w.name} ${w.surname}`).join(', ')
              if (workerNames && client) {
                queueMicrotask(() => {
                  const notification: Notif = {
                    userID: 'system',
                    type: 'success',
                    title: 'Appointment Finished!',
                    message: `${workerNames} finished an appointment with ${client.name} ${client.surname} ${client.street} ${client.houseNumber}, ${client.city}.`,
                    id: generateId(),
                    date: new Date(),
                    isRead: false,
                  }
                  addNotification(notification)
                })
              }

              // Refresh reports so director can see the report data without reloading
              refreshReports()
            }

            return {
              ...prev,
              appointments: prev.appointments.map(apt =>
                apt.id === event.appointmentID ? updated : apt
              ),
            }
          }

          // Любые другие изменения (date, time, workers, client) — полный рефреш
          refreshAppointments()
          return prev
        })
      }
    },
    [
      addNotification,
      refreshAppointments,
      refreshReports,
      refreshWorkers,
      refreshClients,
      refreshTeams,
      refreshGroups,
      refreshServices,
    ]
  )

  useSchedulingEvents(isLiveMode, handleSchedulingEvent, loadLiveData)

  // Действия для управления состоянием
  const actions: SchedulingActions = useMemo(
    () => ({
      refreshAppointments,
      setSelectedWorker: worker => {
        setState(prev => ({ ...prev, selectedWorker: worker }))
      },

      setSelectedClient: client => {
        setState(prev => ({ ...prev, selectedClient: client }))
      },

      setSelectedDate: date => {
        setState(prev => ({ ...prev, selectedDate: date }))
      },

      setSelectedAppointment: appointment => {
        setState(prev => ({ ...prev, selectedAppointment: appointment }))
      },

      addAppointment: (appointment: Appointment) => {
        setState(prev => ({
          ...prev,
          appointments: [...prev.appointments, appointment],
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/appointments', {
            method: 'POST',
            body: JSON.stringify({
              clientID: appointment.clientID,
              workerIds: appointment.worker?.map(w => w.id) || [],
              date: toLocalDateString(appointment.date),
              isFixedTime: appointment.isFixedTime,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              duration: appointment.duration,
              fahrzeit: appointment.fahrzeit,
              latitude: appointment.latitude,
              longitude: appointment.longitude,
              serviceIds: appointment.services?.map(s => s.id),
              createdAt: appointment.createdAt, // Дата создания
            }),
          })
            .then(result => {
              setState(prev => ({
                ...prev,
                appointments: prev.appointments.map(a =>
                  a.id === appointment.id ? { ...appointment, id: result.appointmentID } : a
                ),
              }))
            })
            .catch(error => {
              // Log permission errors as warnings, others as errors
              if (error.message.includes('NO_PERMISSION')) {
                console.warn('[addAppointment] Permission denied:', error.message)
              } else {
                console.error('[addAppointment] API error:', error)
              }

              // Remove failed appointment from state
              setState(prev => ({
                ...prev,
                appointments: prev.appointments.filter(a => a.id !== appointment.id),
              }))

              // Show user-friendly error notification
              const errorMessage = error.message.includes('NO_PERMISSION')
                ? 'Sie haben keine Berechtigung, Termine zu erstellen. Nur Direktoren können Termine erstellen.'
                : 'Fehler beim Speichern des Termins'

              addNotification({
                id: generateId(),
                userID: session?.user?.id || 'system',
                type: 'error',
                title: error.message.includes('NO_PERMISSION') ? 'Keine Berechtigung' : 'Fehler',
                message: errorMessage,
                date: new Date(),
                isRead: false,
              })
            })
        }
      },

      updateAppointment: (updatedAppointment: Appointment, skipNetwork = false) => {
        // Add editedAt timestamp when updating
        const appointmentWithEditTime = {
          ...updatedAppointment,
          editedAt: new Date(),
        }

        setState(prev => ({
          ...prev,
          appointments: prev.appointments.map(apt =>
            apt.id === updatedAppointment.id ? appointmentWithEditTime : apt
          ),
        }))
        console.log(`[updateAppointment] Updated appointment:`, appointmentWithEditTime)
        console.log(`[updateAppointment] skipNetwork:`, skipNetwork)
        console.log(`[updateAppointment] isLiveMode:`, isLiveModeRef.current)
        if (isLiveModeRef.current && !skipNetwork) {
          apiFetch('/api/scheduling/appointments', {
            method: 'PUT',
            body: JSON.stringify({
              id: updatedAppointment.id,
              date: toLocalDateString(updatedAppointment.date),
              isFixedTime: updatedAppointment.isFixedTime,
              startTime: updatedAppointment.startTime,
              endTime: updatedAppointment.endTime,
              duration: updatedAppointment.duration,
              fahrzeit: updatedAppointment.fahrzeit,
              workerIds: updatedAppointment.worker?.map(w => w.id) || [],
              clientID: updatedAppointment.clientID,
              isOpen: updatedAppointment.isOpen,
              openedAt: updatedAppointment.openedAt,
              closedAt: updatedAppointment.closedAt,
              latitude: updatedAppointment.latitude,
              longitude: updatedAppointment.longitude,
              serviceIds: updatedAppointment.services?.map(s => s.id),
              reports: updatedAppointment.reports,
              editedAt: appointmentWithEditTime.editedAt, // Дата последнего редактирования
            }),
          }).catch(error => console.error('[updateAppointment] API error:', error))
        }
      },

      deleteAppointment: (id: string) => {
        setState(prev => ({
          ...prev,
          appointments: prev.appointments.filter(apt => apt.id !== id),
          reports: prev.reports.filter(r => r.appointmentId !== id),
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/appointments', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          }).catch(error => console.error('[deleteAppointment] API error:', error))
        }
      },

      moveAppointmentToDate: (appointmentId, newDate) => {
        setState(prev => {
          const appointment = prev.appointments.find(apt => apt.id === appointmentId)
          if (!appointment) return prev

          const oldDate = appointment.date
          const timeDiff = newDate.getTime() - oldDate.getTime()
          const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24))

          let newStartTime: Date | undefined
          let newEndTime: Date | undefined

          if (appointment.startTime) {
            newStartTime = new Date(appointment.startTime)
            newStartTime.setDate(newStartTime.getDate() + daysDiff)
          }

          if (appointment.endTime) {
            newEndTime = new Date(appointment.endTime)
            newEndTime.setDate(newEndTime.getDate() + daysDiff)
          }

          const updatedAppointment: Appointment = {
            ...appointment,
            date: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
          }

          if (isLiveModeRef.current) {
            apiFetch('/api/scheduling/appointments', {
              method: 'PUT',
              body: JSON.stringify({
                id: appointmentId,
                date: toLocalDateString(newDate),
                startTime: newStartTime,
                endTime: newEndTime,
              }),
            }).catch(error => console.error('[moveAppointmentToDate] API error:', error))
          }

          return {
            ...prev,
            appointments: prev.appointments.map(apt =>
              apt.id === appointmentId ? updatedAppointment : apt
            ),
          }
        })
      },

      addClient: (client: Client) => {
        setState(prev => ({
          ...prev,
          clients: [...prev.clients, client],
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/clients', {
            method: 'POST',
            body: JSON.stringify({
              name: client.name,
              surname: client.surname,
              email: client.email,
              phone: client.phone,
              phone2: client.phone2,
              status: client.status,
              groupeID: client.groupe?.id,
              country: client.country,
              street: client.street,
              postalCode: client.postalCode,
              city: client.city,
              houseNumber: client.houseNumber,
              apartment: client.apartment,
              district: client.district,
              latitude: client.latitude,
              longitude: client.longitude,
            }),
          })
            .then(result => {
              setState(prev => ({
                ...prev,
                clients: prev.clients.map(c =>
                  c.id === client.id ? { ...client, id: result.clientID } : c
                ),
              }))
            })
            .catch(error => {
              // Log permission errors as warnings, others as errors
              if (error.message.includes('NO_PERMISSION') || error.message.includes('Unauthorized')) {
                console.warn('[addClient] Permission denied:', error.message)
              } else {
                console.error('[addClient] API error:', error)
              }

              // Remove failed client from state
              setState(prev => ({
                ...prev,
                clients: prev.clients.filter(c => c.id !== client.id),
              }))

              // Show user-friendly error notification
              const isPermissionError = error.message.includes('NO_PERMISSION') || error.message.includes('Unauthorized')
              const errorMessage = isPermissionError
                ? session?.user?.status === 7
                  ? 'Sie haben keine Berechtigung, Objekte zu erstellen.'
                  : 'Sie haben keine Berechtigung, Kunden zu erstellen. Nur Direktoren können Kunden erstellen.'
                : 'Fehler beim Speichern des Kunden'

              addNotification({
                id: generateId(),
                userID: session?.user?.id || 'system',
                type: 'error',
                title: isPermissionError ? 'Keine Berechtigung' : 'Fehler',
                message: errorMessage,
                date: new Date(),
                isRead: false,
              })
            })
        }
      },

      updateClient: (updatedClient: Client) => {
        setState(prev => ({
          ...prev,
          clients: prev.clients.map(client =>
            client.id === updatedClient.id ? updatedClient : client
          ),
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/clients', {
            method: 'PUT',
            body: JSON.stringify({
              id: updatedClient.id,
              name: updatedClient.name,
              surname: updatedClient.surname,
              email: updatedClient.email,
              phone: updatedClient.phone,
              phone2: updatedClient.phone2,
              status: updatedClient.status,
              groupeID: updatedClient.groupe?.id,
              country: updatedClient.country,
              street: updatedClient.street,
              postalCode: updatedClient.postalCode,
              city: updatedClient.city,
              houseNumber: updatedClient.houseNumber,
              apartment: updatedClient.apartment,
              district: updatedClient.district,
              latitude: updatedClient.latitude,
              longitude: updatedClient.longitude,
            }),
          }).catch(error => console.error('[updateClient] API error:', error))
        }
      },

      deleteClient: async (id: string): Promise<void> => {
        if (isLiveModeRef.current) {
          await apiFetch('/api/scheduling/clients', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          })
        }

        setState(prev => ({
          ...prev,
          clients: prev.clients.filter(client => client.id !== id),
          appointments: prev.appointments.filter(apt => apt.clientID !== id),
        }))
      },

      addTeam: (team: Team) => {
        setState(prev => ({ ...prev, teams: [...prev.teams, team] }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/teams', {
            method: 'POST',
            body: JSON.stringify({ id: team.id, teamName: team.teamName }),
          }).catch(error => {
            console.error('[addTeam] API error:', error)
            setState(prev => ({ ...prev, teams: prev.teams.filter(t => t.id !== team.id) }))
          })
        }
      },

      addWorker: (worker: Worker) => {
        setState(prev => ({
          ...prev,
          workers: [...prev.workers, worker],
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/workers', {
            method: 'POST',
            body: JSON.stringify({
              id: worker.id,
              name: worker.name,
              surname: worker.surname,
              email: worker.email,
              phone: worker.phone,
              phone2: worker.phone2,
              teamId: worker.teamId,
              isAdress: worker.isAdress,
              status: worker.status,
              country: worker.country,
              street: worker.street,
              postalCode: worker.postalCode,
              city: worker.city,
              houseNumber: worker.houseNumber,
              apartment: worker.apartment,
              district: worker.district,
              latitude: worker.latitude,
              longitude: worker.longitude,
            }),
          }).catch(error => {
            console.error('[addWorker] API error:', error)
            setState(prev => ({
              ...prev,
              workers: prev.workers.filter(w => w.id !== worker.id),
            }))
          })
        }
      },

      updateWorker: (updatedWorker: Worker) => {
        setState(prev => ({
          ...prev,
          workers: prev.workers.map(worker =>
            worker.id === updatedWorker.id ? updatedWorker : worker
          ),
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/workers', {
            method: 'PUT',
            body: JSON.stringify({
              id: updatedWorker.id,
              name: updatedWorker.name,
              surname: updatedWorker.surname,
              email: updatedWorker.email,
              phone: updatedWorker.phone,
              phone2: updatedWorker.phone2,
              teamId: updatedWorker.teamId,
              isAdress: updatedWorker.isAdress,
              status: updatedWorker.status,
              country: updatedWorker.country,
              street: updatedWorker.street,
              postalCode: updatedWorker.postalCode,
              city: updatedWorker.city,
              houseNumber: updatedWorker.houseNumber,
              apartment: updatedWorker.apartment,
              district: updatedWorker.district,
              latitude: updatedWorker.latitude,
              longitude: updatedWorker.longitude,
            }),
          }).catch(error => console.error('[updateWorker] API error:', error))
        }
      },

      deleteWorker: async (id: string): Promise<void> => {
        if (isLiveModeRef.current) {
          await apiFetch('/api/scheduling/workers', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          })
        }

        setState(prev => ({
          ...prev,
          workers: prev.workers.filter(worker => worker.id !== id),
          appointments: prev.appointments.filter(apt => apt.workerId !== id),
        }))
      },

      addService: (service: ServiceTreeItem) => {
        setState(prev => ({
          ...prev,
          services: [...prev.services, service],
        }))

        if (isLiveModeRef.current) {
          const body: Record<string, any> = {
            name: service.name,
            description: service.description,
            parentId: service.parentId,
            isGroup: service.isGroup,
            order: service.order,
          }
          if (!service.isGroup) {
            body.duration = (service as Service).duration
            body.price = (service as Service).price
          }
          apiFetch('/api/scheduling/services', {
            method: 'POST',
            body: JSON.stringify(body),
          })
            .then(result => {
              setState(prev => ({
                ...prev,
                services: prev.services.map(s =>
                  s.id === service.id ? { ...service, id: result.serviceID } : s
                ),
              }))
            })
            .catch(error => {
              console.error('[addService] API error:', error)
              setState(prev => ({
                ...prev,
                services: prev.services.filter(s => s.id !== service.id),
              }))
            })
        }
      },

      updateService: (updatedService: ServiceTreeItem) => {
        setState(prev => ({
          ...prev,
          services: prev.services.map(service =>
            service.id === updatedService.id ? updatedService : service
          ),
        }))

        if (isLiveModeRef.current) {
          const body: Record<string, any> = {
            id: updatedService.id,
            name: updatedService.name,
            description: updatedService.description,
            parentId: updatedService.parentId,
            isGroup: updatedService.isGroup,
            order: updatedService.order,
          }
          if (!updatedService.isGroup) {
            body.duration = (updatedService as Service).duration
            body.price = (updatedService as Service).price
          }
          apiFetch('/api/scheduling/services', {
            method: 'PUT',
            body: JSON.stringify(body),
          }).catch(error => console.error('[updateService] API error:', error))
        }
      },

      deleteService: (id: string) => {
        setState(prev => {
          const getChildIds = (parentId: string): string[] => {
            const children = prev.services.filter(s => s.parentId === parentId)
            return children.flatMap(child => [child.id, ...getChildIds(child.id)])
          }
          const idsToDelete = [id, ...getChildIds(id)]
          return {
            ...prev,
            services: prev.services.filter(service => !idsToDelete.includes(service.id)),
          }
        })

        if (isLiveModeRef.current) {
          apiFetch('/api/scheduling/services', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          }).catch(error => console.error('[deleteService] API error:', error))
        }
      },

      refreshData: () => {
        if (isLiveModeRef.current) {
          loadLiveData()
        } else {
          loadMockData()
        }
      },

      refreshWorkers,
      refreshClients,
      refreshTeams,
      refreshGroups,
      refreshServices,

      openAppointment: (appointmentId: string, workerId: string) => {
        setState(prev => {
          const appointment = prev.appointments.find(apt => apt.id === appointmentId)
          if (!appointment) return prev
          if (!appointment.client) return prev
          const assignedWorker = appointment.worker.find(w => w.id === workerId)
          if (!assignedWorker) return prev
          // Берем полные данные (с userID) из общего списка workers, если возможно
          const worker = prev.workers.find(w => w.id === workerId) || assignedWorker
          if (prev.appointments.find(apt => apt.id === appointmentId)?.isOpen) return prev

          const startDate = new Date()

          appointmentOverrides[appointmentId] = {
            ...appointmentOverrides[appointmentId],
            isOpen: true,
            openedAt: startDate,
          }

          const client = appointment.client
          console.log(
            `[openAppointment] Worker id: ${worker.id}   started  user: ${session?.user?.id}, worker userID: ${worker.userID}, client: ${client.name} ${client.surname}`
          )
          if (session?.user?.id !== worker.userID) {
            queueMicrotask(() => {
              const notification: Notif = {
                userID: 'system',
                type: 'info',
                title: 'Starting Appointment!',
                message: `Worker ${worker.name} ${worker.surname} has started an appointment with ${client.name} ${client.surname} ${client.street} ${client.houseNumber}, ${client.city}.`,
                actionProps: {
                  children: 'See on map',
                  href: `/dispatcher/${appointmentId}`,
                  variant: 'primary',
                },
                id: generateId(),
                date: startDate,
                isRead: false,
              }
              addNotification(notification)
            })
          }

          if (isLiveModeRef.current) {
            apiFetch('/api/scheduling/appointments', {
              method: 'PUT',
              body: JSON.stringify({
                id: appointmentId,
                isOpen: true,
                openedAt: startDate,
                closedAt: null,
              }),
            }).catch(error => console.error('[openAppointment] API error:', error))
          }

          return {
            ...prev,
            appointments: prev.appointments.map(apt =>
              apt.id === appointmentId ? { ...apt, isOpen: true, openedAt: startDate } : apt
            ),
          }
        })
      },

      upsertReport: (report: Report) => {
        setState(prev => ({
          ...prev,
          reports: prev.reports.some(r => r.id === report.id)
            ? prev.reports.map(r => (r.id === report.id ? { ...r, ...report } : r))
            : [...prev.reports, report],
        }))
      },

      closeAppointment: (appointmentId: string) => {
        const closedAt = new Date()

        setState(prev => {
          const appointment = prev.appointments.find(apt => apt.id === appointmentId)
          if (!appointment || !appointment.isOpen) return prev

          appointmentOverrides[appointmentId] = {
            ...appointmentOverrides[appointmentId],
            isOpen: false,
            closedAt,
          }

          if (isLiveModeRef.current) {
            apiFetch('/api/scheduling/appointments', {
              method: 'PUT',
              body: JSON.stringify({
                id: appointmentId,
                isOpen: false,
                closedAt,
              }),
            }).catch(error => console.error('[closeAppointment] API error:', error))
          }

          return {
            ...prev,
            appointments: prev.appointments.map(apt =>
              apt.id === appointmentId ? { ...apt, isOpen: false, closedAt } : apt
            ),
          }
        })
      },

      setAppointmentOverride: (appointmentId: string, override: Partial<Appointment>) => {
        appointmentOverrides[appointmentId] = {
          ...appointmentOverrides[appointmentId],
          ...override,
        }
        console.log('[SchedulingContext] setAppointmentOverride:', appointmentId, 'keys:', Object.keys(appointmentOverrides))
        // Save to sessionStorage to survive HMR/module reloads
        saveOverridesToStorage()
        // Don't trigger re-render here to avoid infinite loops
        // The overrides will be applied when appointments are read
      },

      getAppointmentWithOverrides: (appointmentId: string) => {
        const appointment = state.appointments.find(apt => apt.id === appointmentId)
        if (!appointment) {
          console.log('[SchedulingContext] getAppointmentWithOverrides: appointment not found:', appointmentId)
          return undefined
        }
        const overrides = appointmentOverrides[appointmentId]
        console.log('[SchedulingContext] getAppointmentWithOverrides:', appointmentId, 'hasOverrides:', !!overrides, 'allKeys:', Object.keys(appointmentOverrides))
        return overrides ? { ...appointment, ...overrides } : appointment
      },

      clearAppointmentOverride: (appointmentId: string) => {
        const before = Object.keys(appointmentOverrides).length
        console.log('[SchedulingContext] clearAppointmentOverride CALLED:', appointmentId, 'keysBefore:', Object.keys(appointmentOverrides))
        console.trace('[SchedulingContext] clearAppointmentOverride stack trace')
        delete appointmentOverrides[appointmentId]
        const after = Object.keys(appointmentOverrides).length
        console.log('[SchedulingContext] clearAppointmentOverride DONE:', appointmentId, 'before:', before, 'after:', after, 'keysAfter:', Object.keys(appointmentOverrides))
        // Save to sessionStorage
        saveOverridesToStorage()
        // Optionally trigger re-render
        setState(prev => ({ ...prev }))
      },

      // Transport actions
      addVehicle: (vehicle: Vehicle) => {
        setState(prev => ({
          ...prev,
          vehicles: [...prev.vehicles, vehicle],
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/transport/vehicles', {
            method: 'POST',
            body: JSON.stringify({
              plateNumber: vehicle.plateNumber,
              type: vehicle.type,
              status: vehicle.status,
              currentDriverID: vehicle.currentDriverID,
            }),
          }).catch(error => {
            console.error('[addVehicle] API error:', error)
            setState(prev => ({
              ...prev,
              vehicles: prev.vehicles.filter(v => v.id !== vehicle.id),
            }))
          })
        }
      },

      updateVehicle: (updatedVehicle: Vehicle) => {
        // Optimistic update
        setState(prev => {
          // Find the previous vehicle to detect driver changes
          const prevVehicle = prev.vehicles.find(v => v.id === updatedVehicle.id)
          const driverChanged = prevVehicle?.currentDriverID !== updatedVehicle.currentDriverID

          let updatedWorkers = prev.workers

          if (driverChanged) {
            // Update workers when driver assignment changes
            updatedWorkers = prev.workers.map(worker => {
              // Remove vehicle from old driver
              if (worker.id === prevVehicle?.currentDriverID) {
                return { ...worker, vehicleID: null, hasVehicle: false }
              }
              // Assign vehicle to new driver
              if (worker.id === updatedVehicle.currentDriverID) {
                return { ...worker, vehicleID: updatedVehicle.id, hasVehicle: true }
              }
              return worker
            })
          }

          return {
            ...prev,
            vehicles: prev.vehicles.map(vehicle =>
              vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
            ),
            workers: updatedWorkers,
          }
        })

        if (isLiveModeRef.current) {
          apiFetch('/api/transport/vehicles', {
            method: 'PUT',
            body: JSON.stringify({
              id: updatedVehicle.id,
              plateNumber: updatedVehicle.plateNumber,
              type: updatedVehicle.type,
              status: updatedVehicle.status,
              currentDriverID: updatedVehicle.currentDriverID,
            }),
          })
            .then(data => {
              // apiFetch already returns parsed JSON
              if (data.vehicle) {
                // Update with server response (includes driverName/driverSurname from API)
                setState(prev => ({
                  ...prev,
                  vehicles: prev.vehicles.map(vehicle =>
                    vehicle.id === data.vehicle.id ? data.vehicle : vehicle
                  ),
                }))
              }
            })
            .catch(error => {
              console.error('[updateVehicle] API error:', error)
              // On error, optimistic update stays (could reload vehicles here if needed)
            })
        }
      },

      deleteVehicle: (id: string) => {
        setState(prev => ({
          ...prev,
          vehicles: prev.vehicles.filter(vehicle => vehicle.id !== id),
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/transport/vehicles', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          }).catch(error => console.error('[deleteVehicle] API error:', error))
        }
      },

      addRejectReason: (reason: RejectReason) => {
        setState(prev => ({
          ...prev,
          rejectReasons: [...prev.rejectReasons, reason],
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/transport/reject-reasons', {
            method: 'POST',
            body: JSON.stringify({
              reasonText: reason.reasonText,
              isActive: reason.isActive,
            }),
          }).catch(error => {
            console.error('[addRejectReason] API error:', error)
            setState(prev => ({
              ...prev,
              rejectReasons: prev.rejectReasons.filter(r => r.id !== reason.id),
            }))
          })
        }
      },

      updateRejectReason: (updatedReason: RejectReason) => {
        setState(prev => ({
          ...prev,
          rejectReasons: prev.rejectReasons.map(reason =>
            reason.id === updatedReason.id ? updatedReason : reason
          ),
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/transport/reject-reasons', {
            method: 'PUT',
            body: JSON.stringify({
              id: updatedReason.id,
              reasonText: updatedReason.reasonText,
              isActive: updatedReason.isActive,
            }),
          }).catch(error => console.error('[updateRejectReason] API error:', error))
        }
      },

      deleteRejectReason: (id: string) => {
        setState(prev => ({
          ...prev,
          rejectReasons: prev.rejectReasons.filter(reason => reason.id !== id),
        }))

        if (isLiveModeRef.current) {
          apiFetch('/api/transport/reject-reasons', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          }).catch(error => console.error('[deleteRejectReason] API error:', error))
        }
      },
    }),
    [
      loadLiveData,
      loadMockData,
      addNotification,
      session,
      refreshWorkers,
      refreshClients,
      refreshTeams,
      refreshGroups,
      refreshServices,
      state.appointments,
    ]
  )

  // Конвертация дерева услуг в формат для select с optgroup
  const servicesForSelect = useMemo<ServicesForSelect>(() => {
    const rootServices: ServiceOption[] = []
    const groups: ServiceGroupForSelect[] = []

    const buildGroupChain = (groupId: string): string => {
      const group = state.services.find(s => s.id === groupId && s.isGroup)
      if (!group) return ''

      const chain: string[] = [group.name]
      let currentParentId = group.parentId

      while (currentParentId) {
        const parent = state.services.find(s => s.id === currentParentId && s.isGroup)
        if (parent) {
          chain.push(parent.name)
          currentParentId = parent.parentId
        } else {
          break
        }
      }

      return chain.join(' - ')
    }

    const buildServiceFullPath = (serviceName: string, parentId: string | null): string => {
      if (!parentId) return serviceName
      const parentChain = buildGroupChain(parentId)
      return parentChain ? `${serviceName} - ${parentChain}` : serviceName
    }

    const formatServiceName = (service: Service): string => {
      const parts = [service.name]
      if (service.duration) parts.push(`${service.duration} Min`)
      if (service.price) parts.push(`${service.price}€`)
      return parts.join(', ')
    }

    const processGroup = (parentId: string | null) => {
      const children = state.services.filter(s => s.parentId === parentId)

      const services = children.filter((s): s is Service => !s.isGroup)
      const serviceOptions: ServiceOption[] = services.map(service => ({
        id: service.id,
        name: formatServiceName(service),
        fullPath: buildServiceFullPath(service.name, service.parentId),
      }))

      if (parentId === null && serviceOptions.length > 0) {
        rootServices.push(...serviceOptions)
      }

      const subgroups = children.filter(s => s.isGroup)
      for (const group of subgroups) {
        const groupChildren = state.services.filter(s => s.parentId === group.id)
        const groupServices = groupChildren.filter((s): s is Service => !s.isGroup)

        if (groupServices.length > 0) {
          const options: ServiceOption[] = groupServices.map(service => ({
            id: service.id,
            name: formatServiceName(service),
            fullPath: buildServiceFullPath(service.name, service.parentId),
          }))

          groups.push({
            id: group.id,
            label: buildGroupChain(group.id),
            options,
          })
        }

        processGroup(group.id)
      }
    }

    processGroup(null)

    return { rootServices, groups }
  }, [state.services])

  // Группировка клиентов по группам
  const groupedClients = useMemo<GroupedClients[]>(() => {
    const sortFn = (a: Client, b: Client) =>
      a.surname.localeCompare(b.surname, undefined, { sensitivity: 'base', numeric: true })

    // Клиенты с группами
    const grouped = state.groups
      .map(group => ({
        group,
        clients: state.clients.filter(c => c.groupe?.id === group.id).sort(sortFn),
      }))
      .filter(({ clients }) => clients.length > 0)

    // Клиенты без группы
    const ungrouped = state.clients.filter(c => !c.groupe?.id).sort(sortFn)

    if (ungrouped.length > 0) {
      grouped.push({
        group: { id: '__ungrouped__', groupeName: 'Ohne Gruppe', firmaID: state.firmaID },
        clients: ungrouped,
      })
    }

    return grouped
  }, [state.groups, state.clients, state.firmaID])

  // Группировка workers по teams
  const teamsWithWorkers = useMemo<TeamsWithWorkers[]>(() => {
    const sortFn = (a: Worker, b: Worker) =>
      a.surname.localeCompare(b.surname, undefined, { sensitivity: 'base', numeric: true })

    // Работники с командами
    const grouped = state.teams
      .map(team => ({
        team,
        workers: state.workers.filter(w => w.teamId === team.id).sort(sortFn),
      }))
      .filter(({ workers }) => workers.length > 0)

    // Работники без команды
    const ungrouped = state.workers.filter(w => !w.teamId).sort(sortFn)

    if (ungrouped.length > 0) {
      grouped.push({
        team: { id: '__ungrouped__', teamName: 'Ohne Team', firmaID: state.firmaID },
        workers: ungrouped,
      })
    }

    return grouped
  }, [state.teams, state.workers, state.firmaID])

  // Appointments на сегодня с привязанными клиентами (для карты)
  const todayAppointments = useMemo<AppointmentWithClient[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return state.appointments
      .filter(apt => {
        const aptDate = new Date(apt.date)
        aptDate.setHours(0, 0, 0, 0)
        return aptDate.getTime() === today.getTime()
      })
      .map(apt => {
        const client = state.clients.find(c => c.id === apt.clientID)
        if (!client) return null
        return { ...apt, client }
      })
      .filter((apt): apt is AppointmentWithClient => apt !== null)
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0
        return aTime - bTime
      })
  }, [state.appointments, state.clients])

  // Мемоизируем contextValue
  const contextValue: SchedulingContextType = useMemo(
    () => ({
      ...state,
      ...actions,
      groupedClients,
      teamsWithWorkers,
      todayAppointments,
      servicesForSelect,
    }),
    [state, actions, groupedClients, teamsWithWorkers, todayAppointments, servicesForSelect]
  )

  return <SchedulingContext.Provider value={contextValue}>{children}</SchedulingContext.Provider>
}

// Hook для использования контекста
export const useScheduling = (): SchedulingContextType => {
  const context = useContext(SchedulingContext)
  if (context === undefined) {
    throw new Error('useScheduling must be used within a SchedulingProvider')
  }
  return context
}

// Экспорт для удобства
export default SchedulingContext
