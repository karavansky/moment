'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, Button, Chip, Separator } from '@heroui/react'
import { Clock, User, Phone, Car, Package, Route as RouteIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Order, Vehicle, OrderStatus } from '@/types/transport'
import { RouteMarkerIcon } from './RouteMarkers'
import { useTranslation } from '@/components/Providers'

interface OrderCardProps {
  order: Order
  vehicles: Vehicle[]
  isSelected: boolean
  isPortrait: boolean
  onSelect: (orderId: string) => void
  onAssignDriver: (order: Order) => void
  onRoutePointClick?: (orderId: string, lat: number, lng: number, address: string) => void
  getStatusStyle: (status: OrderStatus) => {
    color: 'default' | 'accent' | 'success' | 'warning' | 'danger'
    variant: 'primary' | 'secondary' | 'tertiary' | 'soft'
  }
  getStatusLabel: (status: OrderStatus) => string
  getStatusIcon: (status: OrderStatus) => React.ReactNode
}

type TabType = 'order' | 'route'

const OrderCard = React.memo(function OrderCard({
  order,
  vehicles,
  isSelected,
  isPortrait,
  onSelect,
  onAssignDriver,
  onRoutePointClick,
  getStatusStyle,
  getStatusLabel,
  getStatusIcon,
}: OrderCardProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('order')
  const orderTabRef = useRef<HTMLDivElement>(null)
  const routeTabRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      if (activeTab === 'order' && orderTabRef.current) {
        const width = orderTabRef.current.offsetWidth
        const left = orderTabRef.current.offsetLeft
        setIndicatorStyle({ width, left })
      } else if (activeTab === 'route' && routeTabRef.current) {
        const width = routeTabRef.current.offsetWidth
        const left = routeTabRef.current.offsetLeft
        setIndicatorStyle({ width, left })
      }
    }

    const timer = setTimeout(updateIndicator, 50)
    return () => clearTimeout(timer)
  }, [activeTab])

  return (
    <Card
      key={order.id}
      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''
      } ${isPortrait ? 'shrink-0 w-72 h-full' : ''}`}
      onClick={() => onSelect(order.id)}
    >
      <Card.Content>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-sm text-default-500">
            <Clock size={12} />
            <span suppressHydrationWarning>
              {new Date(order.scheduledTime || order.createdAt).toLocaleString('ru-RU', {
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

        {/* Tabs */}
        <div className="relative mb-2" onClick={e => e.stopPropagation()}>
          <div className="flex gap-2">
            <div ref={orderTabRef}>
              <Chip
                size="sm"
                variant={activeTab === 'order' ? 'secondary' : 'tertiary'}
                className="cursor-pointer"
                onClick={() => setActiveTab('order')}
              >
                <Package size={12} />
                <Chip.Label>{t('dispatcher.order.tab')}</Chip.Label>
              </Chip>
            </div>
            <div ref={routeTabRef}>
              <Chip
                size="sm"
                variant={activeTab === 'route' ? 'secondary' : 'tertiary'}
                className="cursor-pointer"
                onClick={() => setActiveTab('route')}
              >
                <RouteIcon size={12} />
                <Chip.Label>{t('dispatcher.order.route')}</Chip.Label>
              </Chip>
            </div>
          </div>
          <div className="relative w-full mt-1">
            <Separator />
            <div
              className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-200 ease-out"
              style={{
                width: `${indicatorStyle.width}px`,
                left: `${indicatorStyle.left}px`,
              }}
            />
          </div>
        </div>

        {/* Tab Content with animated height */}
        <motion.div animate={{ height: 'auto' }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'order' ? (
              <motion.div
                key="order"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {/* Passenger Info */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-default-400 shrink-0" />
                    <span className="font-medium">{order.passengerName}</span>
                  </div>
                  {/* Vehicle Chip */}
                  {order.vehicleID && (
                    <Chip size="sm" color="default" variant="soft">
                      <Car size={12} />
                      <Chip.Label>
                        {vehicles.find(v => v.id === order.vehicleID)?.plateNumber || 'N/A'}
                      </Chip.Label>
                    </Chip>
                  )}
                </div>

                {/* Phone */}
                <a
                  href={`tel:${order.passengerPhone}`}
                  className="flex items-center gap-2 text-sm group"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 group-hover:bg-blue-600 transition-colors shrink-0">
                    <Phone size={12} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-default-600 group-hover:text-blue-600 transition-colors">
                    {order.passengerPhone}
                  </span>
                </a>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-default-100 rounded-lg p-2">
                    <p className="text-xs text-default-600">{order.notes}</p>
                  </div>
                )}

                {/* Assign Button */}
                {!order.vehicleID && order.status === 'CREATED' && (
                  <div onClick={e => e.stopPropagation()} className="pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                      onPress={() => onAssignDriver(order)}
                    >
                      {t('dispatcher.assign.button')}
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="route"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {/* Addresses */}
                {order.routes && order.routes.length > 0 && (
                  <>
                    {/* Первая точка - откуда */}
                    <div
                      className="flex items-start gap-2 text-sm cursor-pointer group"
                      onClick={e => {
                        e.stopPropagation()
                        if (
                          onRoutePointClick &&
                          order.routes?.[0].pickupLat &&
                          order.routes?.[0].pickupLng
                        ) {
                          onRoutePointClick(
                            order.id,
                            order.routes[0].pickupLat,
                            order.routes[0].pickupLng,
                            order.routes[0].pickupAddress || ''
                          )
                        }
                      }}
                    >
                      <RouteMarkerIcon type="pickup" size={16} className="shrink-0" />
                      <span className="text-default-600 group-hover:text-blue-600 transition-colors text-xs">
                        {order.routes[0].pickupAddress}
                      </span>
                    </div>

                    {/* Промежуточные остановки */}
                    {order.routes.length > 1 &&
                      order.routes.slice(0, -1).map((route, index) => (
                        <div
                          key={route.id}
                          className="flex items-start gap-2 text-sm cursor-pointer group"
                          onClick={e => {
                            e.stopPropagation()
                            if (onRoutePointClick && route.dropoffLat && route.dropoffLng) {
                              onRoutePointClick(
                                order.id,
                                route.dropoffLat,
                                route.dropoffLng,
                                route.dropoffAddress || ''
                              )
                            }
                          }}
                        >
                          <RouteMarkerIcon type="intermediate" size={16} className="shrink-0" />
                          <span className="text-default-600 group-hover:text-amber-600 transition-colors text-xs">
                            <span className="font-medium">#{index + 1}</span> {route.dropoffAddress}
                          </span>
                        </div>
                      ))}

                    {/* Последняя точка - куда */}
                    <div
                      className="flex items-start gap-2 text-sm cursor-pointer group"
                      onClick={e => {
                        e.stopPropagation()
                        const lastRoute = order.routes?.[order.routes.length - 1]
                        if (onRoutePointClick && lastRoute?.dropoffLat && lastRoute?.dropoffLng) {
                          onRoutePointClick(
                            order.id,
                            lastRoute.dropoffLat,
                            lastRoute.dropoffLng,
                            lastRoute.dropoffAddress || ''
                          )
                        }
                      }}
                    >
                      <RouteMarkerIcon type="dropoff" size={16} className="shrink-0" />
                      <span className="text-default-600 group-hover:text-green-600 transition-colors text-xs">
                        {order.routes?.[order.routes.length - 1]?.dropoffAddress}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Card.Content>
    </Card>
  )
})

export default OrderCard
