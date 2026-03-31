'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { use } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { getAllTransportMockData } from '@/lib/transport-mock-data'
import type { Order, OrderStatus } from '@/types/transport'
import List from '@/components/map/List'
import { useIsPortrait } from '@/hooks/useMediaQuery'
import { useTranslation } from '@/components/Providers'

// Динамический импорт Map без SSR (Leaflet требует window)
const Map = dynamic(() => import('@/components/map/Map'), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
})

function MapLoadingFallback() {
  const { t } = useTranslation()
  return (
    <div className="h-full w-full flex items-center justify-center bg-default-100">
      <p className="text-default-500">{t('map.loading')}</p>
    </div>
  )
}

interface MapPageProps {
  params: Promise<{
    lang: string
    slug?: string[]
  }>
}

export default function MapPage({ params }: MapPageProps) {
  const { slug } = use(params)
  const { t } = useTranslation()
  // Get slug parameter (appointment ID or order ID)
  const slugId = slug?.[0]

  // Appointments data
  const { todayAppointments } = useScheduling()

  // Orders data - initialize once
  const [mockData] = useState(() => getAllTransportMockData(t))
  const [orders, setOrders] = useState<Order[]>(mockData.orders)

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>(todayAppointments.length > 0 ? 'appointments' : 'orders')

  // List collapsed state
  const [isListCollapsed, setIsListCollapsed] = useState(false)

  // Selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Route point focus state
  const [routePointFocus, setRoutePointFocus] = useState<{
    orderId: string
    lat: number
    lng: number
    address: string
  } | null>(null)

  // Orientation detection
  const isPortrait = useIsPortrait()

  // Order status filter state (lifted from List.tsx)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter orders based on status and search query
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesPassenger = order.passengerName?.toLowerCase().includes(query)
        const matchesPhone = order.phone?.toLowerCase().includes(query)
        const matchesComment = order.clientComment?.toLowerCase().includes(query)

        // Search in routes if available
        const matchesRoute = order.routes?.some(route =>
          route.pickupAddress?.toLowerCase().includes(query) ||
          route.dropoffAddress?.toLowerCase().includes(query)
        )

        if (!matchesPassenger && !matchesPhone && !matchesComment && !matchesRoute) {
          return false
        }
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  // Handle slug parameter for initial selection
  useEffect(() => {
    if (!slugId) return

    // Check if slug is an appointment ID
    const appointment = todayAppointments.find((a) => a.id === slugId)
    if (appointment) {
      setSelectedAppointmentId(slugId)
      setSelectedOrderId(null)
      setActiveTab('appointments')
      return
    }

    // Check if slug is an order ID
    const order = orders.find((o) => o.id === slugId)
    if (order) {
      setSelectedOrderId(slugId)
      setSelectedAppointmentId(null)
      setActiveTab('orders')
      return
    }
  }, [slugId, todayAppointments, orders])

  const handleAppointmentSelect = useCallback((appointmentId: string) => {
    setSelectedAppointmentId(prev => appointmentId === prev ? null : appointmentId)
    setSelectedOrderId(null)
  }, [])

  const handleOrderSelect = useCallback((orderId: string) => {
    setSelectedOrderId(prev => orderId === prev ? null : orderId)
    setSelectedAppointmentId(null)
    // Сбрасываем фокус на конкретной точке при клике на карточку
    setRoutePointFocus(null)
  }, [])

  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    )
  }, [])

  const handleRoutePointClick = useCallback((orderId: string, lat: number, lng: number, address: string) => {
    // Set the route point to focus on the map
    setRoutePointFocus({ orderId, lat, lng, address })
    // Auto-select the order
    setSelectedOrderId(orderId)
    // НЕ сбрасываем focusedRoutePoint автоматически!
    // Он будет сброшен при клике на карточку или другую точку
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 flex overflow-hidden ${isPortrait ? 'flex-col gap-1' : 'pl-1 flex-row gap-1'}`}>
        {/* List/Sidebar Section - Portrait: top (auto height), Landscape: right (collapsible) */}
        <div className={`shrink-0 ${
          isPortrait
            ? 'w-full'
            : 'order-2'
        }`}>
          <List
            // Always pass all data to List component
            appointments={todayAppointments}
            selectedAppointmentId={selectedAppointmentId}
            onAppointmentSelect={handleAppointmentSelect}
            orders={orders}
            vehicles={mockData.vehicles}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
            onOrderUpdate={handleOrderUpdate}
            onRoutePointClick={handleRoutePointClick}
            // Pass active tab and handler
            activeTab={activeTab}
            onTabChange={setActiveTab}
            // Pass collapse state and handler
            isCollapsed={isListCollapsed}
            onCollapsedChange={setIsListCollapsed}
            // Pass filter state and handlers
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        </div>

        {/* Map Section - Portrait: flex-1 (takes remaining space), Landscape: left (dynamic width) */}
        <div
          className={`relative flex-1 ${
            isPortrait
              ? 'w-full order-2'
              : 'order-1'
          }`}
        >
          <Map
            // Show only data for active tab
            appointments={activeTab === 'appointments' ? todayAppointments : []}
            selectedAppointmentId={selectedAppointmentId}
            onAppointmentSelect={handleAppointmentSelect}
            orders={activeTab === 'orders' ? filteredOrders : []}
            vehicles={activeTab === 'orders' ? mockData.vehicles : []}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
            routePointFocus={routePointFocus}
          />
        </div>
      </div>
    </div>
  )
}
