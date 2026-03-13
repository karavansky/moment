'use client'

import React, { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import { Card, Button, Chip, Separator, Modal, Badge, Dropdown, DropdownItem } from '@heroui/react'
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
  ChevronDown,
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

  // Filter control (optional - managed internally if not provided)
  statusFilter?: OrderStatus | 'ALL'
  onStatusFilterChange?: (filter: OrderStatus | 'ALL') => void
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
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
  statusFilter: externalStatusFilter,
  onStatusFilterChange: externalOnStatusFilterChange,
  searchQuery: externalSearchQuery,
  onSearchQueryChange: externalOnSearchQueryChange,
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

  // Use external filter state if provided, otherwise manage internally
  const [internalStatusFilter, setInternalStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const statusFilter = externalStatusFilter ?? internalStatusFilter
  const setStatusFilter = externalOnStatusFilterChange ?? setInternalStatusFilter

  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const searchQuery = externalSearchQuery ?? internalSearchQuery
  const setSearchQuery = externalOnSearchQueryChange ?? setInternalSearchQuery

  // Tab animation state
  const [isPending, startTransition] = useTransition()
  const appointmentsRef = useRef<HTMLDivElement>(null)
  const ordersRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

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

  const getStatusStyle = (status: OrderStatus): { color: 'default' | 'accent' | 'success' | 'warning' | 'danger', variant: 'primary' | 'secondary' | 'tertiary' | 'soft' } => {
    switch (status) {
      case 'CREATED':
        return { color: 'accent', variant: 'soft' }
      case 'ASSIGNED':
        return { color: 'warning', variant: 'soft' }
      case 'ACCEPTED':
        return { color: 'accent', variant: 'primary' }
      case 'IN_PROGRESS':
      case 'ARRIVED':
        return { color: 'warning', variant: 'primary' }
      case 'COMPLETED':
        return { color: 'success', variant: 'soft' }
      case 'CANCELLED':
        return { color: 'danger', variant: 'soft' }
      default:
        return { color: 'default', variant: 'secondary' }
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
        maxHeight: isPortrait ? (isCollapsed ? '4rem' : '40vh') : '100vh',
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
                size="md"
                onPress={() => setIsCollapsed(!isCollapsed)}
              >
                <ArrowLeftToLine size={18} strokeWidth={3} />
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
                    <ArrowDownToLine size={18} strokeWidth={3} />
                  ) : (
                    <ArrowLeftToLine size={18} strokeWidth={3} />
                  )
                ) : isPortrait ? (
                  <ArrowUpToLine size={18} strokeWidth={3} />
                ) : (
                  <ArrowRightToLine size={18} strokeWidth={3} />
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
            {/* Search and Status Filter */}
            <div className="px-4 py-3 shrink-0">
              <div className="flex gap-2">
                {/* Search */}
                <div className="relative flex-1">
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

                {/* Status Filter for Orders */}
                {activeTab === 'orders' && (
                  <div className="shrink-0" style={{ minWidth: '180px' }}>
                    <Dropdown>
                      <Button variant="tertiary" className="w-full justify-between h-full">
                        {statusFilter === 'ALL' ? (
                          'Все статусы'
                        ) : (
                          <Chip size="sm" {...getStatusStyle(statusFilter)}>
                            {getStatusIcon(statusFilter)}
                            <Chip.Label>{getStatusLabel(statusFilter)}</Chip.Label>
                          </Chip>
                        )}
                        <ChevronDown className="text-small" size={16} />
                      </Button>
                      <Dropdown.Popover>
                        <Dropdown.Menu
                          disallowEmptySelection
                          aria-label="Фильтр по статусу"
                          selectedKeys={[statusFilter]}
                          selectionMode="single"
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as OrderStatus | 'ALL'
                            setStatusFilter(selected)
                          }}
                        >
                          <DropdownItem key="ALL" id="ALL">
                            Все статусы
                            <Dropdown.ItemIndicator />
                          </DropdownItem>
                          <DropdownItem key="CREATED" id="CREATED">
                            <Chip size="sm" {...getStatusStyle('CREATED')}>
                              {getStatusIcon('CREATED')}
                              <Chip.Label>{getStatusLabel('CREATED')}</Chip.Label>
                            </Chip>
                            <Dropdown.ItemIndicator />
                          </DropdownItem>
                          <DropdownItem key="ASSIGNED" id="ASSIGNED">
                            <Chip size="sm" {...getStatusStyle('ASSIGNED')}>
                              {getStatusIcon('ASSIGNED')}
                              <Chip.Label>{getStatusLabel('ASSIGNED')}</Chip.Label>
                            </Chip>
                            <Dropdown.ItemIndicator />
                          </DropdownItem>
                          <DropdownItem key="ACCEPTED" id="ACCEPTED">
                            <Chip size="sm" {...getStatusStyle('ACCEPTED')}>
                              {getStatusIcon('ACCEPTED')}
                              <Chip.Label>{getStatusLabel('ACCEPTED')}</Chip.Label>
                            </Chip>
                            <Dropdown.ItemIndicator />
                          </DropdownItem>
                          <DropdownItem key="IN_PROGRESS" id="IN_PROGRESS">
                            <Chip size="sm" {...getStatusStyle('IN_PROGRESS')}>
                              {getStatusIcon('IN_PROGRESS')}
                              <Chip.Label>{getStatusLabel('IN_PROGRESS')}</Chip.Label>
                            </Chip>
                            <Dropdown.ItemIndicator />
                          </DropdownItem>
                          <DropdownItem key="COMPLETED" id="COMPLETED">
                            <Chip size="sm" {...getStatusStyle('COMPLETED')}>
                              {getStatusIcon('COMPLETED')}
                              <Chip.Label>{getStatusLabel('COMPLETED')}</Chip.Label>
                            </Chip>
                            <Dropdown.ItemIndicator />
                          </DropdownItem>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </div>
                )}
              </div>
            </div>

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
                    className={isPortrait ? 'flex flex-row gap-3 h-full pr-4 p-1' : 'space-y-3'}
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
                          className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                            selectedOrderId === order.id
                              ? 'ring-2 ring-primary-500 bg-primary-50'
                              : ''
                          } ${isPortrait ? 'shrink-0 w-72 h-full' : ''}`}
                          onClick={() => onOrderSelect?.(order.id)}
                        >
                          <Card.Content>
                            {/* Header */}
                            <div className="flex items-center justify-between  gap-2">
                              <div className="flex items-center gap-2 text-sm text-default-500">
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
                              <Chip size="sm" {...getStatusStyle(order.status)}>
                                {getStatusIcon(order.status)}
                                <Chip.Label>{getStatusLabel(order.status)}</Chip.Label>
                              </Chip>
                            </div>

                            {/* Passenger Info */}
                            <div className="space-y-2 mb-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <User size={14} className="text-default-400 shrink-0" />
                                  <span className="font-medium">{order.passengerName}</span>
                                </div>
                                {/* Vehicle Chip - показываем рядом с именем пассажира */}
                                {order.vehicleID && (
                                  <Chip size="sm" color="default" variant="soft">
                                    <Car size={12} />
                                    <Chip.Label>
                                      {vehicles.find(v => v.id === order.vehicleID)?.plateNumber || 'N/A'}
                                    </Chip.Label>
                                  </Chip>
                                )}
                              </div>
                              <a
                                href={`tel:${order.passengerPhone}`}
                                className="flex items-center gap-2 text-sm text-default-600 hover:text-primary-500 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={14} className="text-default-400 shrink-0" />
                                <span>{order.passengerPhone}</span>
                              </a>
                            </div>

                            {/* Addresses with Assign Button */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="space-y-2 flex-1">
                                {/* Используем routes[] если есть, иначе упрощенные поля */}
                                {order.routes && order.routes.length > 0 ? (
                                  <>
                                    {/* Первая точка - откуда */}
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                      <span className="text-default-600 text-xs">
                                        {order.routes[0].pickupAddress}
                                      </span>
                                    </div>

                                    {/* Промежуточные остановки */}
                                    {order.routes.length > 1 && order.routes.slice(0, -1).map((route, index) => (
                                      <div key={route.id} className="flex items-start gap-2 text-sm">
                                        <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                        <span className="text-default-600 text-xs">
                                          <span className="font-medium">#{index + 1}</span> {route.dropoffAddress}
                                        </span>
                                      </div>
                                    ))}

                                    {/* Последняя точка - куда */}
                                    <div className="flex items-start gap-2 text-sm">
                                      <Navigation size={14} className="text-green-500 shrink-0 mt-0.5" />
                                      <span className="text-default-600 text-xs">
                                        {order.routes[order.routes.length - 1].dropoffAddress}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Fallback на упрощенные поля */}
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                      <span className="text-default-600 text-xs">
                                        {order.pickupAddress}
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2 text-sm">
                                      <Navigation size={14} className="text-green-500 shrink-0 mt-0.5" />
                                      <span className="text-default-600 text-xs">
                                        {order.dropoffAddress}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                              {/* Assign Button - только для CREATED статуса */}
                              {!order.vehicleID && order.status === 'CREATED' && (
                                <div onClick={e => e.stopPropagation()} className="shrink-0">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    className="whitespace-normal text-center leading-tight min-w-[80px] h-auto py-1.5"
                                    onPress={() => handleAssignDriver(order)}
                                  >
                                    <span className="flex flex-col items-center gap-0.5">
                                      <span className="text-xs">Назначить<br/>водителя</span>
                                    </span>
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {order.notes && (
                              <div className="bg-default-100 rounded-lg p-2 mb-1">
                                <p className="text-xs text-default-600">{order.notes}</p>
                              </div>
                            )}
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
