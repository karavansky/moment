'use client'

import ClientsTable from '@/components/ClientsTable'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { useState, useTransition } from 'react'
import { useTranslation } from '@/components/Providers'
import { motion, AnimatePresence } from 'framer-motion'
import ClientDetail from './ClientDetail'
import { generateId } from '@/lib/generate-id'

export default function ClientsView() {
  const { clients, groups, isLoading, firmaID } = useScheduling()
  const lang = useLanguage()
  const { t } = useTranslation()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isCreateNew, setIsCreateNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSelectClient = (client: Client) => {
    startTransition(() => {
      setSelectedClient(client)
      setIsCreateNew(false)
    })
  }

  const onAddNewClient = () => {
    startTransition(() => {
      // Создаем пустой объект клиента с дефолтными значениями
      const newClient: Client = {
        id: generateId(),
        firmaID: firmaID,
        status: 0,
        name: '',
        surname: '',
        email: '',
        phone: '',
        phone2: '',
        country: '',
        street: '',
        postalCode: '',
        city: '',
        houseNumber: '',
        district: '',
        latitude: 0,
        longitude: 0,
      }
      setSelectedClient(newClient)
      setIsCreateNew(true)
    })
  }

  const onCloseClientDetail = () => {
    startTransition(() => {
      setSelectedClient(null)
      setIsCreateNew(false)
    })
  }

  return (
    <div
      className={`w-full flex flex-col gap-1 px-1 sm:px-6 ${
        selectedClient ? 'h-full overflow-hidden' : 'h-full sm:overflow-hidden overflow-auto'
      }`}
    >
      <div
        className={`transition-opacity duration-200 h-full flex flex-col ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="wait">
          {selectedClient ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full flex flex-col"
            >
              <ClientDetail
                client={selectedClient}
                onClose={onCloseClientDetail}
                isCreateNew={isCreateNew}
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
              className="h-full flex flex-col"
            >
              <ClientsTable
                list={clients}
                isLoading={isLoading}
                titel={t('clients.title')}
                onRowClick={id => {
                  console.log('Clicked row:', id)
                  const client = clients.find(c => String(c.id) === String(id))
                  if (client) {
                    onSelectClient(client)
                  }
                }}
                onAddNew={onAddNewClient}
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
