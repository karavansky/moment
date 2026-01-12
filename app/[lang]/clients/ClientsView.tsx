'use client'

import ClientsTable from '@/components/ClientsTable'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ClientDetail from './ClientDetail'

export default function ClientsView() {
  const { clients, groups, isLoading } = useScheduling()
  const lang = useLanguage()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSelectClient = (client: Client) => {
    startTransition(() => {
      setSelectedClient(client)
    })
  }

  const onCloseClientDetail = () => {
    startTransition(() => {
      setSelectedClient(null)
    })
  }

  return (
    <div
      className={`w-full flex flex-col gap-1 px-1 sm:px-6 ${
        selectedClient ? 'min-h-full' : 'h-full sm:overflow-hidden overflow-auto'
      }`}
    >
      <div
        className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="wait">
          {selectedClient ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ClientDetail
                client={selectedClient}
                onClose={onCloseClientDetail}
                className="pt-2"
              />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ClientsTable
                list={clients}
                isLoading={isLoading}
                titel="Clients"
                onRowClick={id => {
                  console.log('Clicked row:', id)
                  const client = clients.find(c => String(c.id) === String(id))
                  if (client) {
                    onSelectClient(client)
                  }
                }}
                groups={groups}
                className="pt-2"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
