'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { Button, Separator } from '@heroui/react'
import { Undo2, Truck, Ban } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import VehicleOverview from './VehicleOverview'
import RejectReasonsTab from './RejectReasonsTab'

export default function VehiclePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'fleet' | 'reasons'>('fleet')
  const [isPending, startTransition] = useTransition()

  const fleetRef = useRef<HTMLButtonElement>(null)
  const reasonsRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  useEffect(() => {
    const updateIndicator = () => {
      if (activeTab === 'fleet' && fleetRef.current) {
        setIndicatorStyle({
          width: fleetRef.current.offsetWidth,
          left: fleetRef.current.offsetLeft,
        })
      } else if (activeTab === 'reasons' && reasonsRef.current) {
        setIndicatorStyle({
          width: reasonsRef.current.offsetWidth,
          left: reasonsRef.current.offsetLeft,
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  const onPressFleet = useCallback(() => {
    startTransition(() => setActiveTab('fleet'))
  }, [startTransition])

  const onPressReasons = useCallback(() => {
    startTransition(() => setActiveTab('reasons'))
  }, [startTransition])

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center pl-2 gap-2 mb-4 shrink-0">
        <Button onClick={handleBack}>
          <Undo2 className="w-5 h-5 text-primary" />
        </Button>
        <h2 className="text-2xl font-semibold">Транспорт</h2>
      </div>

      <div className="flex flex-col relative mb-4 shrink-0">
        <div className="flex flex-row gap-2 mb-2">
          <Button
            ref={fleetRef}
            variant={activeTab === 'fleet' ? 'tertiary' : 'outline'}
            onPress={onPressFleet}
          >
            <Truck className="w-5 h-5 mr-2" /> Автопарк
          </Button>
          <Button
            ref={reasonsRef}
            variant={activeTab === 'reasons' ? 'tertiary' : 'outline'}
            onPress={onPressReasons}
          >
            <Ban className="w-5 h-5 mr-2" /> Причины отказа
          </Button>
        </div>
        <div className="relative w-full">
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

      <div
        className={`transition-opacity duration-200 flex-1 min-h-0 flex flex-col ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'fleet' ? (
            <motion.div
              key="fleet"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              <VehicleOverview className="pt-2" />
            </motion.div>
          ) : (
            <motion.div
              key="reasons"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              <RejectReasonsTab className="pt-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
