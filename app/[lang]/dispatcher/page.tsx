'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import List from '@/components/map/List'
import { getAllTransportMockData } from '@/lib/transport-mock-data'
import type { Order } from '@/types/transport'

// Динамический импорт Map без SSR (Leaflet требует window)
const Map = dynamic(() => import('@/components/dispatcher/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-default-100">
      <p className="text-default-500">Загрузка карты...</p>
    </div>
  ),
})

export default function DispatcherPage() {
  const mockData = getAllTransportMockData()
  const [orders, setOrders] = useState<Order[]>(mockData.orders)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId === selectedOrderId ? null : orderId)
  }

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-default-200 px-6 py-4">
        <h1 className="text-2xl font-semibold">Диспетчерская</h1>
        <p className="text-sm text-default-500 mt-1">
          Управление заказами и назначение водителей
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Section - 60% width */}
        <div className="w-3/5 relative">
          <Map
            orders={orders}
            vehicles={mockData.vehicles}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
          />
        </div>

        {/* Orders List Section - 40% width */}
        <div className="w-2/5 border-l border-default-200 overflow-hidden">
          <List
            orders={orders}
            vehicles={mockData.vehicles}
            selectedOrderId={selectedOrderId}
            onOrderSelect={handleOrderSelect}
            onOrderUpdate={handleOrderUpdate}
          />
        </div>
      </div>
    </div>
  )
}
