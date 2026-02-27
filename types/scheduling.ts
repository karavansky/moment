// Модели данных для системы планирования услуг (Location-based Services)
// Основано на Swift моделях из iOS приложения

// Notifications
export interface NotifActionProps {
  children: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'tertiary'
  href?: string
}

export interface Notif {
  id: string
  userID: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  link?: string
  linkText?: string
  message: string
  date: Date
  isRead: boolean
  actionProps?: NotifActionProps
}

// Категория клиентов
export interface Groupe {
  id: string
  groupeName: string
  firmaID: string
  clients?: Client[]
}

// Клиент
export interface Client {
  id: string
  // Status: 0 - активный, 1 - неактивный, 2 - Arhive (для мягкого удаления)
  status: number
  firmaID: string
  name: string
  surname: string
  email?: string
  phone?: string
  phone2?: string
  country: string
  street: string
  postalCode: string
  city: string
  houseNumber: string
  apartment?: string
  district?: string
  latitude: number
  longitude: number
  groupe?: Groupe
  appointments?: Appointment[]
}
// Команда работников
export interface Team {
  id: string
  teamName: string
  firmaID: string
  workers?: Worker[]
}

// Работник
export interface Worker {
  id: string
  userID: string
  firmaID: string
  name: string
  surname: string
  email: string
  phone?: string
  phone2?: string
  teamId: string | null
  team?: Team
  appointments?: Appointment[]
  reports?: Report[]
  isAdress: boolean
  status: number
  country?: string
  street?: string
  postalCode?: string
  city?: string
  houseNumber?: string
  apartment?: string
  district?: string
  latitude?: number
  longitude?: number
}

// Назначение (встреча/визит)
export interface Appointment {
  id: string
  firmaID: string
  userID: string
  clientID: string
  services: Service[]
  date: Date
  isFixedTime: boolean
  startTime: Date
  duration: number
  endTime: Date
  fahrzeit: number // время в пути (driving time)
  workerId: string
  workerIds?: string[]
  worker: Worker[]
  client?: Client
  reports?: Report[]
  isOpen: boolean
  latitude?: number
  longitude?: number
  openedAt?: Date
  closedAt?: Date
}

export interface Photo {
  id: string
  note: string
  url: string
}
// Отчет о выполненной работе
// type: 0 = work session (Start → Finish), 1 = proxy session (photo upload container)
export interface Report {
  id: string
  firmaID: string
  type: number
  photos: Photo[] // Массив фотографий
  workerId: string
  appointmentId: string
  worker?: Worker
  appointment?: Appointment
  notes?: string
  date: Date
  openAt?: Date
  closeAt?: Date
  openLatitude?: number
  openLongitude?: number
  openAddress?: string
  openDistanceToAppointment?: number
  closeLatitude?: number
  closeLongitude?: number
  closeAddress?: string
  closeDistanceToAppointment?: number
}

// Пользователь
export interface User {
  id: string
  firmaID: string
  userName: string
  status?: number | null
  myWorkerID?: string | null
  myClientID?: string | null
}

// DTO для создания назначения
export interface CreateAppointmentDTO {
  userID: string
  clientID: string
  date: string | Date
  isFixedTime: boolean
  startTime: string | Date
  endTime: string | Date
  duration: number
  fahrzeit: number
  workerId: string
}

// DTO для обновления назначения
export interface UpdateAppointmentDTO {
  id: string
  date?: string | Date
  isFixedTime?: boolean
  startTime?: string | Date
  endTime?: string | Date
  duration?: number
  fahrzeit?: number
  workerId?: string
  clientID?: string
}

// DTO для создания клиента
export interface CreateClientDTO {
  firmaID: string
  clientName: string
  strasse: string
  plz: string
  ort: string
  houseNumber: string
  latitude: number
  longitude: number
  categoryId: string
}

// DTO для создания работника
export interface CreateWorkerDTO {
  firmaID: string
  workerName: string
  teamId: string
}

// DTO для создания отчета
export interface CreateReportDTO {
  firmaID: string
  photos: Photo[]
  workerId: string
  appointmentId: string
}

// Вспомогательные типы для календаря и планирования
export interface DateAppointmentView {
  id: string
  date: Date
  dayOfWeek: string
  day: string
  appointments?: Appointment[]
}

// Тип для перетаскивания назначений (drag & drop)
export interface AppointmentDraggable {
  id: string
  exportID: string
  userID: string
  clientID: string
  date: Date
  isFixedTime: boolean
  startTime: Date
  endTime: Date
  workerName: string
  clientName: string
  duration: number
  fahrzeit: number
  isReport: boolean
}

// Тип для перетаскивания работников (drag & drop)
export interface WorkerDraggable {
  id: string
  workerName: string
}

// Услуга (лист дерева)
export interface Service {
  id: string
  firmaID: string
  name: string
  description?: string
  duration: number // длительность в минутах
  price?: number
  parentId: string | null // null для корневых элементов, id группы для вложенных
  isGroup: false
  order: number // для сортировки
}

// Группа услуг (узел дерева)
export interface ServiceGroup {
  id: string
  firmaID: string
  name: string
  description?: string
  parentId: string | null // null для корневых групп, id родительской группы для вложенных
  isGroup: true
  order: number
}

// Объединённый тип для элементов дерева
export type ServiceTreeItem = Service | ServiceGroup
