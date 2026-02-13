'use client'

import { useState, useTransition, useRef, useEffect, useCallback, memo } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { Button, Separator } from '@heroui/react'
import { FilePenLine, Undo2, UserStar, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ClientOverview from './ClientOverview'
import ClientHistory from './ClientHistory'
import { useTranslation } from '@/components/Providers'

interface ClientDetailProps {
  client: Client
  onClose: () => void
  isCreateNew?: boolean
  className?: string
}

export default memo(ClientDetail)
function ClientDetail({ client, onClose, isCreateNew = false, className }: ClientDetailProps) {
  const { clients, groups, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const lang = useLanguage()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [isPending, startTransition] = useTransition()

  const overviewRef = useRef<HTMLButtonElement>(null)
  const historyRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  useEffect(() => {
    const updateIndicator = () => {
      if (activeTab === 'overview' && overviewRef.current) {
        setIndicatorStyle({
          width: overviewRef.current.offsetWidth,
          left: overviewRef.current.offsetLeft,
        })
      } else if (activeTab === 'history' && historyRef.current) {
        setIndicatorStyle({
          width: historyRef.current.offsetWidth,
          left: historyRef.current.offsetLeft,
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  const onPressOverview = useCallback(() => {
    startTransition(() => {
      setActiveTab('overview')
    })
  }, [startTransition])

  const onPressHistory = useCallback(() => {
    startTransition(() => {
      setActiveTab('history')
    })
  }, [startTransition])

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      <div className="flex items-center pl-2 gap-2 mb-4 shrink-0">
        <Button onClick={onClose}>
          <Undo2 className="w-5 h-5 text-primary" />
        </Button>
        <h2 className="text-2xl font-semibold">
          {isCreateNew ? t('clients.detail.newClient') : `${client.surname} ${client.name}`}
        </h2>
      </div>
      <div className="flex flex-col relative mb-4 shrink-0">
        <div className="flex flex-row gap-2 mb-2">
          <Button
            ref={overviewRef}
            variant={activeTab === 'overview' ? 'tertiary' : 'outline'}
            onPress={onPressOverview}
          >
            <FilePenLine className="w-5 h-5 mr-2" /> {t('clients.detail.overview')}
          </Button>
          <Button
            ref={historyRef}
            variant={activeTab === 'history' ? 'tertiary' : 'outline'}
            onPress={onPressHistory}
          >
            <History className="w-5 h-5 mr-2" /> {t('clients.detail.history')}
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
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              <ClientOverview client={client} isCreateNew={isCreateNew} className="pt-2" />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              <ClientHistory client={client} className="pt-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
