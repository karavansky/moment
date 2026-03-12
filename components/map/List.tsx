'use client'

import React, { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import { Card, Button, Chip, Separator, Modal, Badge } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  User,
  Phone,
  MapPin,
  Navigation,
  Car,
  Filter,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react'
import type { Order, Vehicle, OrderStatus } from '@/types/transport'
import type { AppointmentWithClient } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { useTranslation } from '@/components/Providers'
import { useIsPortrait } from '@/hooks/useMediaQuery'

interface ListProps {
  // For orders
  orders?: Order[]
  vehicles?: Vehicle[]
  selectedOrderId?: string | null
  onOrderSelect?: (orderId: string) => void
  onOrderUpdate?: (order: Order) => void

  // For appointments
  appointments?: AppointmentWithClient[]
  selectedAppointmentId?: string | null
  onAppointmentSelect?: (appointmentId: string) => void

  // Tab control (optional - managed internally if not provided)
  activeTab?: string
  onTabChange?: (tab: string) => void

  // Collapse control (optional - managed internally if not provided)
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export default function List({
  orders = [],
  vehicles = [],
  selectedOrderId = null,
  onOrderSelect,
  onOrderUpdate,
  appointments = [],
  selectedAppointmentId = null,
  onAppointmentSelect,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange: externalOnCollapsedChange,
}: ListProps) {
  const lang = useLanguage()
  const { t } = useTranslation()
  const isPortrait = useIsPortrait()

  // Use external tab state if provided, otherwise manage internally
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    appointments.length > 0 ? 'appointments' : 'orders'
  )
  const activeTab = externalActiveTab ?? internalActiveTab
  const setActiveTab = externalOnTabChange ?? setInternalActiveTab

  // Use external collapse state if provided, otherwise manage internally
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const isCollapsed = externalIsCollapsed ?? internalIsCollapsed
  const setIsCollapsed = externalOnCollapsedChange ?? setInternalIsCollapsed

  // Tab animation state
  const [isPending, startTransition] = useTransition()
  const appointmentsRef = useRef<HTMLDivElement>(null)
  const ordersRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null)

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          order.passengerName?.toLowerCase().includes(query) ||
          order.passengerPhone?.includes(query) ||
          order.pickupAddress?.toLowerCase().includes(query) ||
          order.dropoffAddress?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  // Sort orders: active first, then by scheduled time
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      // Active statuses first
      const activeStatuses = ['CREATED', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS']
      const aIsActive = activeStatuses.includes(a.status)
      const bIsActive = activeStatuses.includes(b.status)

      if (aIsActive && !bIsActive) return -1
      if (!aIsActive && bIsActive) return 1

      // Then by scheduled time
      return (
        new Date(a.scheduledTime || a.createdAt).getTime() -
        new Date(b.scheduledTime || b.createdAt).getTime()
      )
    })
  }, [filteredOrders])

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    if (!searchQuery) return appointments

    const query = searchQuery.toLowerCase()
    return appointments.filter(apt => {
      const fullName = `${apt.client.name} ${apt.client.surname}`.toLowerCase()
      const address =
        `${apt.client.street} ${apt.client.houseNumber} ${apt.client.city}`.toLowerCase()
      return fullName.includes(query) || address.includes(query)
    })
  }, [appointments, searchQuery])

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      if (activeTab === 'appointments' && appointmentsRef.current) {
        const width = appointmentsRef.current.offsetWidth
        const left = appointmentsRef.current.offsetLeft
        setIndicatorStyle({
          width,
          left,
        })
      } else if (activeTab === 'orders' && ordersRef.current) {
        const width = ordersRef.current.offsetWidth
        const left = ordersRef.current.offsetLeft
        setIndicatorStyle({
          width,
          left,
        })
      }
    }

    // Small delay to ensure layout has been updated
    const timer = setTimeout(updateIndicator, 50)
    window.addEventListener('resize', updateIndicator)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeTab, isCollapsed, isPortrait])

  const getStatusVariant = (status: OrderStatus): 'primary' | 'secondary' | 'tertiary' | 'soft' => {
    switch (status) {
      case 'CREATED':
        return 'primary'
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'secondary'
      case 'IN_PROGRESS':
      case 'ARRIVED':
        return 'tertiary'
      case 'COMPLETED':
        return 'tertiary'
      case 'CANCELLED':
        return 'soft' // Changed from 'danger' to 'soft'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      PENDING: 'Ожидает',
      CREATED: 'Создан',
      ASSIGNED: 'Назначен',
      ACCEPTED: 'Принят',
      ARRIVED: 'На месте',
      IN_PROGRESS: 'В пути',
      COMPLETED: 'Завершен',
      CANCELLED: 'Отменен',
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'CREATED':
        return <Package size={14} />
      case 'ASSIGNED':
      case 'ACCEPTED':
        return <Car size={14} />
      case 'IN_PROGRESS':
        return <Navigation size={14} />
      case 'COMPLETED':
        return <CheckCircle2 size={14} />
      case 'CANCELLED':
        return <XCircle size={14} />
      default:
        return <AlertCircle size={14} />
    }
  }

  const handleAssignDriver = (order: Order) => {
    setOrderToAssign(order)
    setAssignModalOpen(true)
  }

  const confirmAssignment = (vehicleId: string) => {
    if (!orderToAssign || !onOrderUpdate) return

    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) return

    const updatedOrder: Order = {
      ...orderToAssign,
      status: 'ASSIGNED',
      vehicleID: vehicleId,
      driverID: vehicle.currentDriverID,
      assignedAt: new Date(),
    }

    onOrderUpdate(updatedOrder)
    setAssignModalOpen(false)
    setOrderToAssign(null)
  }

  const availableVehicles = vehicles.filter(
    v =>
      v.status === 'ACTIVE' &&
      !orders.some(
        o => o.vehicleID === v.id && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status)
      )
  )

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat(lang, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <motion.div
      initial={false}
      animate={{
        width: isPortrait ? '100%' : isCollapsed ? '4rem' : '24rem', // w-14 = 3.5rem for collapsed, w-96 = 24rem for expanded
        height: isPortrait ? (isCollapsed ? '4rem' : '50vh') : isCollapsed ? '50vh' : '100%', // Always set explicit height
        minHeight: isPortrait ? (isCollapsed ? '4rem' : undefined) : undefined,
        maxHeight: isPortrait ? (isCollapsed ? '4rem' : '50vh') : '100vh',
      }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
      className={`flex flex-col bg-background ${isPortrait ? 'w-full' : ''} ${!isPortrait && isCollapsed ? 'overflow-visible' : ''}`}
    >
      {/* Tabs with collapse button - Always visible */}
      <div
        className={`shrink-0 ${isPortrait ? 'px-4 pt-3' : isCollapsed ? 'w-full h-full py-4 flex flex-col items-center justify-between gap-4 overflow-visible' : 'px-4 pt-3'}`}
      >
        {!isPortrait && isCollapsed ? (
          <>
            {/* Collapse button */}
            <div className="pb-2">
              <Button
                isIconOnly
                variant="tertiary"
                size="sm"
                onPress={() => setIsCollapsed(!isCollapsed)}
              >
                <ArrowLeftToLine size={18} />
              </Button>
            </div>
            {/* Tabs rotated vertically in landscape collapsed mode */}
            <div className="flex flex-col gap-6 flex-1 justify-center items-center w-full relative">
              <div
                className={`h-[140px] w-8 pr-2 flex items-center justify-center relative ${activeTab === 'appointments' ? 'border-r-2 border-blue-500' : ''}`}
              >
                <div className="-rotate-90">
                  <Badge.Anchor ref={appointmentsRef}>
                    <Button
                      variant={activeTab === 'appointments' ? 'tertiary' : 'outline'}
                      size="sm"
                      className="whitespace-nowrap"
                      onPress={() => {
                        startTransition(() => {
                          setActiveTab('appointments')
                          setSearchQuery('')
                          setStatusFilter('ALL')
                          if (isCollapsed) {
                            setIsCollapsed(false)
                          }
                        })
                      }}
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Визиты
                    </Button>
                    {appointments.length > 0 && (
                      <Badge color="warning" size="sm" placement="top-right">
                        {appointments.length}
                      </Badge>
                    )}
                  </Badge.Anchor>
                </div>
              </div>
              <div
                className={`h-[140px] w-8 pr-2  flex items-center justify-center relative ${activeTab === 'orders' ? 'border-r-2 border-blue-500' : ''}`}
              >
                <div className="-rotate-90">
                  <Badge.Anchor ref={ordersRef}>
                    <Button
                      variant={activeTab === 'orders' ? 'tertiary' : 'outline'}
                      size="sm"
                      className="whitespace-nowrap"
                      onPress={() => {
                        startTransition(() => {
                          setActiveTab('orders')
                          setSearchQuery('')
                          setStatusFilter('ALL')
                          if (isCollapsed) {
                            setIsCollapsed(false)
                          }
                        })
                      }}
                    >
                      <Package className="w-5 h-5 mr-2" /> Поездки
                    </Button>
                    {orders.length > 0 && (
                      <Badge color="warning" size="sm" placement="top-right">
                        {orders.length}
                      </Badge>
                    )}
                  </Badge.Anchor>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col relative">
            <div
              className={`flex flex-row justify-between items-center ${isPortrait ? 'mb-2' : ''}`}
            >
              <div className={`flex gap-2 flex-row relative`}>
                <Badge.Anchor ref={appointmentsRef}>
                  <Button
                    variant={activeTab === 'appointments' ? 'tertiary' : 'outline'}
                    size={isCollapsed && !isPortrait ? 'sm' : undefined}
                    className={isCollapsed && !isPortrait ? '-rotate-90' : ''}
                    onPress={() => {
                      startTransition(() => {
                        setActiveTab('appointments')
                        setSearchQuery('')
                        setStatusFilter('ALL')
                        // Auto-expand when tab is clicked
                        if (isCollapsed) {
                          setIsCollapsed(false)
                        }
                      })
                    }}
                  >
                    <Calendar className="w-5 h-5 mr-2" /> Визиты
                  </Button>
                  {appointments.length > 0 && (
                    <Badge color="warning" size="sm" placement="top-right">
                      {appointments.length}
                    </Badge>
                  )}
                </Badge.Anchor>
                <Badge.Anchor ref={ordersRef}>
                  <Button
                    variant={activeTab === 'orders' ? 'tertiary' : 'outline'}
                    size={isCollapsed && !isPortrait ? 'sm' : undefined}
                    className={isCollapsed && !isPortrait ? '-rotate-90' : ''}
                    onPress={() => {
                      startTransition(() => {
                        setActiveTab('orders')
                        setSearchQuery('')
                        setStatusFilter('ALL')
                        // Auto-expand when tab is clicked
                        if (isCollapsed) {
                          setIsCollapsed(false)
                        }
                      })
                    }}
                  >
                    <Package className="w-5 h-5 mr-2" /> Поездки
                  </Button>
                  {orders.length > 0 && (
                    <Badge color="warning" size="sm" placement="top-right">
                      {orders.length}
                    </Badge>
                  )}
                </Badge.Anchor>
              </div>

              {/* Collapse button */}
              <Button
                isIconOnly
                variant="tertiary"
                size="sm"
                onPress={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  isPortrait ? (
                    <ArrowDownToLine size={18} />
                  ) : (
                    <ArrowLeftToLine size={18} />
                  )
                ) : isPortrait ? (
                  <ArrowUpToLine size={18} />
                ) : (
                  <ArrowRightToLine size={18} />
                )}
              </Button>
            </div>

            {/* Separator - always visible when not collapsed in portrait, or always in landscape */}
            {(isPortrait || !isCollapsed) && (
              <div className={`relative w-full ${isPortrait ? '' : 'mt-2'}`}>
                <Separator />
                <div
                  className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-200 ease-out"
                  style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content - only visible when expanded */}
      <AnimatePresence>
        {!isCollapsed && (
          <>
            {/* Search */}
            <div className="px-4 py-3 shrink-0">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400"
                />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'appointments'
                      ? 'Поиск по имени, адресу...'
                      : 'Поиск по имени, телефону, адресу...'
                  }
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Status Filter for Orders */}
            {activeTab === 'orders' && (
              <div className="px-4 pb-3 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(
                    ['ALL', 'CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] as const
                  ).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                        statusFilter === status
                          ? 'bg-primary-500 text-white'
                          : 'bg-default-100 text-default-600 hover:bg-default-200'
                      }`}
                    >
                      {status === 'ALL' ? 'Все' : getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List Content - Scrollable with animation */}
            <div
              className={`flex-1 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'} ${
                isPortrait
                  ? 'overflow-x-auto overflow-y-hidden pl-4'
                  : 'overflow-y-auto overflow-x-hidden px-4 pb-4'
              }`}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'appointments' ? (
                  // Appointments List
                  <motion.div
                    key="appointments"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className={isPortrait ? 'flex flex-row gap-3 h-full pr-4' : 'space-y-3'}
                  >
                    {filteredAppointments.length === 0 ? (
                      <div className="text-center py-12 text-default-400">
                        <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Визиты не найдены</p>
                      </div>
                    ) : (
                      filteredAppointments.map(apt => (
                        <Card
                          key={apt.id}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedAppointmentId === apt.id
                              ? 'ring-2 ring-primary-500 bg-primary-50'
                              : ''
                          } ${isPortrait ? 'shrink-0 w-72 h-full' : ''}`}
                          onClick={() => onAppointmentSelect?.(apt.id)}
                        >
                          <Card.Content>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <User size={14} className="text-default-400" />
                                <span>
                                  {apt.client.name} {apt.client.surname}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 text-xs text-default-600">
                                <MapPin
                                  size={14}
                                  className="text-default-400 flex-shrink-0 mt-0.5"
                                />
                                <span>
                                  {apt.client.street} {apt.client.houseNumber}
                                  {apt.client.apartment && `, ${apt.client.apartment}`}
                                  <br />
                                  {apt.client.postalCode} {apt.client.city}
                                </span>
                              </div>
                              {apt.startTime && apt.endTime && (
                                <div className="flex items-center gap-2 text-xs text-default-500">
                                  <Clock size={12} />
                                  <span>
                                    {formatTime(apt.startTime)} - {formatTime(apt.endTime)} (
                                    {apt.duration} мин)
                                  </span>
                                </div>
                              )}
                              {apt.isOpen && apt.openedAt && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                                  <p className="text-xs text-green-700 font-medium">Визит открыт</p>
                                </div>
                              )}
                            </div>
                          </Card.Content>
                        </Card>
                      ))
                    )}
                  </motion.div>
                ) : (
                  // Orders List
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className={isPortrait ? 'flex flex-row gap-3 h-full pr-4' : 'space-y-3'}
                  >
                    {sortedOrders.length === 0 ? (
                      <div className="text-center py-12 text-default-400">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Заказы не найдены</p>
                      </div>
                    ) : (
                      sortedOrders.map(order => (
                        <Card
                          key={order.id}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedOrderId === order.id
                              ? 'ring-2 ring-primary-500 bg-primary-50'
                              : ''
                          } ${isPortrait ? 'shrink-0 w-72 h-full' : ''}`}
                          onClick={() => onOrderSelect?.(order.id)}
                        >
                          <Card.Content>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Chip size="sm" variant={getStatusVariant(order.status)}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(order.status)}
                                      {getStatusLabel(order.status)}
                                    </span>
                                  </Chip>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-default-500">
                                  <Clock size={12} />
                                  <span suppressHydrationWarning>
                                    {new Date(
                                      order.scheduledTime || order.createdAt
                                    ).toLocaleString('ru-RU', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Passenger Info */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <User size={14} className="text-default-400 flex-shrink-0" />
                                <span className="font-medium">{order.passengerName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-default-600">
                                <Phone size={14} className="text-default-400 flex-shrink-0" />
                                <span>{order.passengerPhone}</span>
                              </div>
                            </div>

                            {/* Addresses */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-start gap-2 text-sm">
                                <MapPin size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                <span className="text-default-600 text-xs">
                                  {order.pickupAddress}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 text-sm">
                                <Navigation
                                  size={14}
                                  className="text-green-500 flex-shrink-0 mt-0.5"
                                />
                                <span className="text-default-600 text-xs">
                                  {order.dropoffAddress}
                                </span>
                              </div>
                            </div>

                            {/* Notes */}
                            {order.notes && (
                              <div className="bg-default-100 rounded-lg p-2 mb-3">
                                <p className="text-xs text-default-600">{order.notes}</p>
                              </div>
                            )}

                            {/* Vehicle Info or Assign Button */}
                            {order.vehicleID ? (
                              <div className="flex items-center gap-2 text-xs text-default-500 bg-default-100 rounded-lg p-2">
                                <Car size={14} />
                                <span>
                                  {vehicles.find(v => v.id === order.vehicleID)?.plateNumber ||
                                    'Неизвестно'}
                                </span>
                              </div>
                            ) : order.status === 'CREATED' ? (
                              <div onClick={e => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="w-full"
                                  onPress={() => handleAssignDriver(order)}
                                >
                                  <Car size={16} />
                                  Назначить водителя
                                </Button>
                              </div>
                            ) : null}
                          </Card.Content>
                        </Card>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Assign Driver Modal */}
      <Modal.Backdrop isOpen={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <Modal.Container className="max-w-md" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Назначить водителя</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {orderToAssign && (
                <div className="space-y-4">
                  <div className="bg-default-100 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">Информация о поездке:</p>
                    <div className="space-y-1 text-xs text-default-600">
                      <p>
                        <strong>Пассажир:</strong> {orderToAssign.passengerName}
                      </p>
                      <p>
                        <strong>Откуда:</strong> {orderToAssign.pickupAddress}
                      </p>
                      <p>
                        <strong>Куда:</strong> {orderToAssign.dropoffAddress}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Выберите водителя:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {vehicles.filter(v => v.status === 'ACTIVE').length === 0 ? (
                        <p className="text-sm text-default-400 text-center py-4">
                          Нет доступных водителей
                        </p>
                      ) : (
                        vehicles
                          .filter(v => v.status === 'ACTIVE')
                          .map(vehicle => (
                            <Card
                              key={vehicle.id}
                              className="p-3 cursor-pointer hover:bg-primary-50 transition-colors"
                              onClick={() => confirmAssignment(vehicle.id)}
                            >
                              <Card.Content>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{vehicle.plateNumber}</p>
                                    <p className="text-xs text-default-500">{vehicle.type}</p>
                                  </div>
                                  <Car size={20} className="text-primary-500" />
                                </div>
                              </Card.Content>
                            </Card>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline" onPress={() => setAssignModalOpen(false)}>
                Отмена
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </motion.div>
  )
}
