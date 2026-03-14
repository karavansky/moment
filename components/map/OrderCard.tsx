'use client'

import React from 'react'
import { Card, Button, Chip } from '@heroui/react'
import { Clock, User, Phone, Car } from 'lucide-react'
import type { Order, Vehicle, OrderStatus } from '@/types/transport'
import { RouteMarkerIcon } from './RouteMarkers'

interface OrderCardProps {
  order: Order
  vehicles: Vehicle[]
  isSelected: boolean
  isPortrait: boolean
  onSelect: (orderId: string) => void
  onAssignDriver: (order: Order) => void
  getStatusStyle: (status: OrderStatus) => { color: 'default' | 'accent' | 'success' | 'warning' | 'danger', variant: 'primary' | 'secondary' | 'tertiary' | 'soft' }
  getStatusLabel: (status: OrderStatus) => string
  getStatusIcon: (status: OrderStatus) => React.ReactNode
}

export default function OrderCard({
  order,
  vehicles,
  isSelected,
  isPortrait,
  onSelect,
  onAssignDriver,
  getStatusStyle,
  getStatusLabel,
  getStatusIcon,
}: OrderCardProps) {
  return (
    <Card
      key={order.id}
      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-primary-500 bg-primary-50'
          : ''
      } ${isPortrait ? 'shrink-0 w-72 h-full' : ''}`}
      onClick={() => onSelect(order.id)}
    >
      <Card.Content>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
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
                  <RouteMarkerIcon type="pickup" size={16} className="shrink-0 mt-0.5" />
                  <span className="text-default-600 text-xs">
                    {order.routes[0].pickupAddress}
                  </span>
                </div>

                {/* Промежуточные остановки */}
                {order.routes.length > 1 && order.routes.slice(0, -1).map((route, index) => (
                  <div key={route.id} className="flex items-start gap-2 text-sm">
                    <RouteMarkerIcon type="intermediate" size={16} className="shrink-0 mt-0.5" />
                    <span className="text-default-600 text-xs">
                      <span className="font-medium">#{index + 1}</span> {route.dropoffAddress}
                    </span>
                  </div>
                ))}

                {/* Последняя точка - куда */}
                <div className="flex items-start gap-2 text-sm">
                  <RouteMarkerIcon type="dropoff" size={16} className="shrink-0 mt-0.5" />
                  <span className="text-default-600 text-xs">
                    {order.routes[order.routes.length - 1].dropoffAddress}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Fallback на упрощенные поля */}
                <div className="flex items-start gap-2 text-sm">
                  <RouteMarkerIcon type="pickup" size={16} className="shrink-0 mt-0.5" />
                  <span className="text-default-600 text-xs">
                    {order.pickupAddress}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <RouteMarkerIcon type="dropoff" size={16} className="shrink-0 mt-0.5" />
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
                onPress={() => onAssignDriver(order)}
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
  )
}
