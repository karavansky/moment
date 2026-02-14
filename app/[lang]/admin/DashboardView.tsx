'use client'

import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Seaweed from './Seaweed'
import { Button, Separator } from '@heroui/react'
import Dictionary from './Dictionary'
import AdminTicketsList from './AdminTicketsList'
import UsersView from './UsersView'

export default function DashboardView() {
  const { clients, groups, isLoading, firmaID } = useScheduling()
  const lang = useLanguage()
  const [activeTab, setActiveTab] = useState<'tickets' | 'seaweed' | 'dict' | 'users'>('tickets')
  const [isPending, startTransition] = useTransition()

  const ticketsRef = useRef<HTMLButtonElement>(null)
  const seaweedRef = useRef<HTMLButtonElement>(null)
  const dictRef = useRef<HTMLButtonElement>(null)
  const usersRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  useEffect(() => {
    const updateIndicator = () => {
      switch (activeTab) {
        case 'tickets':
          if (ticketsRef.current) {
            setIndicatorStyle({
              width: ticketsRef.current.offsetWidth,
              left: ticketsRef.current.offsetLeft,
            })
          }
          break
        case 'seaweed':
          if (seaweedRef.current) {
            setIndicatorStyle({
              width: seaweedRef.current.offsetWidth,
              left: seaweedRef.current.offsetLeft,
            })
          }
          break
        case 'dict':
          if (dictRef.current) {
            setIndicatorStyle({
              width: dictRef.current.offsetWidth,
              left: dictRef.current.offsetLeft,
            })
          }
          break
        case 'users':
          if (usersRef.current) {
            setIndicatorStyle({
              width: usersRef.current.offsetWidth,
              left: usersRef.current.offsetLeft,
            })
          }
          break
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  const onPressTickets = useCallback(() => {
    startTransition(() => {
      setActiveTab('tickets')
    })
  }, [startTransition])

  const onPressSeaweed = useCallback(() => {
    startTransition(() => {
      setActiveTab('seaweed')
    })
  }, [startTransition])

  const onPressDict = useCallback(() => {
    startTransition(() => {
      setActiveTab('dict')
    })
  }, [startTransition])

  const onPressUsers = useCallback(() => {
    startTransition(() => {
      setActiveTab('users')
    })
  }, [startTransition])

  return (
    <div className={`flex flex-col h-full pl-2`}>
      <div className="flex items-center pl-2 gap-2 mb-4 shrink-0">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
      </div>
      <div className="flex flex-col relative mb-4 shrink-0">
        <div className="flex flex-row gap-2 mb-2">
          <Button
            ref={ticketsRef}
            variant={activeTab === 'tickets' ? 'tertiary' : 'ghost'}
            onPress={onPressTickets}
          >
            Tickets
          </Button>
          <Button
            ref={seaweedRef}
            variant={activeTab === 'seaweed' ? 'tertiary' : 'ghost'}
            onPress={onPressSeaweed}
          >
            Seaweed
          </Button>
          <Button
            ref={dictRef}
            variant={activeTab === 'dict' ? 'tertiary' : 'ghost'}
            onPress={onPressDict}
          >
            Dictionary
          </Button>
          <Button
            ref={usersRef}
            variant={activeTab === 'users' ? 'tertiary' : 'ghost'}
            onPress={onPressUsers}
          >
            Users
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
          {(() => {
            switch (activeTab) {
              case 'tickets':
                return (
                  <motion.div
                    key="tickets"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="h-full"
                  >
                    <AdminTicketsList />
                  </motion.div>
                )
              case 'seaweed':
                return (
                  <motion.div
                    key="seaweed"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="h-full"
                  >
                    <Seaweed />
                  </motion.div>
                )
              case 'dict':
                return (
                  <motion.div
                    key="dict"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="h-full"
                  >
                    <Dictionary />
                  </motion.div>
                )
              case 'users':
                return (
                  <motion.div
                    key="users"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="h-full"
                  >
                    <UsersView />
                  </motion.div>
                )
            }
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}
