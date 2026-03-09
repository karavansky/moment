'use client'

import React, { useState, useMemo } from 'react'
import { Card, Button, Chip, Select, TextField, Modal } from '@heroui/react'
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
  Package
} from 'lucide-react'
import type { Order, Vehicle, OrderStatus } from '@/types/transport'

interface OrdersListProps {
  orders: Order[]
  vehicles: Vehicle[]
  selectedOrderId: string | null
  onOrderSelect: (orderId: string) => void
  onOrderUpdate: (order: Order) => void
}

export default function OrdersList({
  orders,
  vehicles,
  selectedOrderId,
  onOrderSelect,
  onOrderUpdate,
}: OrdersListProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null)

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          order.passengerName.toLowerCase().includes(query) ||
          order.passengerPhone.includes(query) ||
          order.pickupAddress.toLowerCase().includes(query) ||
          order.dropoffAddress.toLowerCase().includes(query)
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
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    })
  }, [filteredOrders])

  const getStatusVariant = (status: OrderStatus): 'primary' | 'secondary' | 'tertiary' | 'danger' => {
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
        return 'danger'
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
    if (!orderToAssign) return

    const vehicle = vehicles.find((v) => v.id === vehicleId)
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
    (v) => v.status === 'ACTIVE' && !orders.some(
      (o) => o.vehicleID === v.id && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status)
    )
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="p-4 border-b border-default-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Заказы ({filteredOrders.length})
          </h2>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
          >
            <Filter size={18} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400" />
          <input
            type="text"
            placeholder="Поиск по имени, телефону, адресу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-default-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['ALL', 'CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] as const).map(
            (status) => (
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
            )
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedOrders.length === 0 ? (
          <div className="text-center py-12 text-default-400">
            <Package size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Заказы не найдены</p>
          </div>
        ) : (
          sortedOrders.map((order) => (
            <div key={order.id}>
              <Card
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedOrderId === order.id
                    ? 'ring-2 ring-primary-500 bg-primary-50'
                    : ''
                }`}
                onClick={() => onOrderSelect(order.id)}
              >
                <Card.Content>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip
                        size="sm"
                        variant={getStatusVariant(order.status)}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </span>
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <Clock size={12} />
                      <span suppressHydrationWarning>
                        {new Date(order.scheduledTime).toLocaleString('ru-RU', {
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
                    <span className="text-default-600 text-xs">{order.pickupAddress}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Navigation size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-default-600 text-xs">{order.dropoffAddress}</span>
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
                      {vehicles.find((v) => v.id === order.vehicleID)?.plateNumber || 'Неизвестно'}
                    </span>
                  </div>
                ) : order.status === 'CREATED' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full"
                    onPress={(e) => {
                      e.stopPropagation()
                      handleAssignDriver(order)
                    }}
                  >
                    <Car size={16} />
                    Назначить водителя
                  </Button>
                ) : null}
              </Card.Content>
            </Card>
            </div>
          ))
        )}
      </div>

      {/* Assign Driver Modal */}
      <Modal.Backdrop isOpen={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Назначить водителя</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {orderToAssign && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Заказ</p>
                    <p className="text-xs text-default-600">{orderToAssign.passengerName}</p>
                    <p className="text-xs text-default-500">{orderToAssign.pickupAddress}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Доступные транспортные средства</p>
                    {availableVehicles.length === 0 ? (
                      <p className="text-xs text-default-400">Нет доступных транспортных средств</p>
                    ) : (
                      <div className="space-y-2">
                        {availableVehicles.map((vehicle) => (
                          <Button
                            key={vehicle.id}
                            variant="outline"
                            className="w-full justify-start"
                            onPress={() => confirmAssignment(vehicle.id)}
                          >
                            <Car size={16} />
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium">{vehicle.plateNumber}</div>
                              <div className="text-xs text-default-500">{vehicle.type}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" slot="close">
                Отмена
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
