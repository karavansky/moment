'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { use } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { getAllTransportMockData } from '@/lib/transport-mock-data'
import type { Order } from '@/types/transport'
import List from '@/components/map/List'
import { useIsPortrait } from '@/hooks/useMediaQuery'

// Динамический импорт Map без SSR (Leaflet требует window)
const Map = dynamic(() => import('@/components/map/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-default-100">
      <p className="text-default-500">Загрузка карты...</p>
    </div>
  ),
})

interface MapPageProps {
  params: Promise<{
    lang: string
    slug?: string[]
  }>
}

export default function MapPage({ params }: MapPageProps) {
  const { slug } = use(params)
  // Get slug parameter (appointment ID or order ID)
  const slugId = slug?.[0]

  // Appointments data
  const { todayAppointments } = useScheduling()

  // Orders data
  const mockData = getAllTransportMockData()
  const [orders, setOrders] = useState<Order[]>(mockData.orders)

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>(todayAppointments.length > 0 ? 'appointments' : 'orders')

  // List collapsed state
  const [isListCollapsed, setIsListCollapsed] = useState(false)

  // Selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Orientation detection
  const isPortrait = useIsPortrait()

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

  const handleAppointmentSelect = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId === selectedAppointmentId ? null : appointmentId)
    setSelectedOrderId(null)
  }

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId === selectedOrderId ? null : orderId)
    setSelectedAppointmentId(null)
  }

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 flex overflow-hidden ${isPortrait ? 'flex-col' : 'flex-row'}`}>
        {/* List/Sidebar Section - Portrait: top (auto height), Landscape: right (collapsible) */}
        <div className={`shrink-0 border-default-200 ${
          isPortrait
            ? 'w-full border-b'
            : 'border-l order-2'
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
            // Pass active tab and handler
            activeTab={activeTab}
            onTabChange={setActiveTab}
            // Pass collapse state and handler
            isCollapsed={isListCollapsed}
            onCollapsedChange={setIsListCollapsed}
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
            orders={activeTab === 'orders' ? orders : []}
            vehicles={activeTab === 'orders' ? mockData.vehicles : []}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
          />
        </div>
      </div>
    </div>
  )
}
