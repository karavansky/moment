'use client'

import ClientsTable from '@/components/ClientsTable'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client, Worker } from '@/types/scheduling'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkerDetail from './WorkerDetail'
import WorkersTable from '@/components/WorkersTable'

export default function WorkersView() {
  const { workers, teams, isLoading, firmaID } = useScheduling()
  const lang = useLanguage()
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [isCreateNew, setIsCreateNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSelectWorker = (worker: Worker) => {
    startTransition(() => {
      setSelectedWorker(worker)
      setIsCreateNew(false)
    })
  }

  const onAddNewWorker = () => {
    startTransition(() => {
      // Создаем пустой объект клиента с дефолтными значениями
      const newWorker: Worker = {
        id: crypto.randomUUID(),
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
        teamId: '',
        team: undefined,
        isAdress: false,
      }
      setSelectedWorker(newWorker)
      setIsCreateNew(true)
    })
  }

  const onCloseWorkerDetail = () => {
    startTransition(() => {
      setSelectedWorker(null)
      setIsCreateNew(false)
    })
  }

  return (
    <div
      className={`w-full flex flex-col gap-1 px-1 sm:px-6 ${
        selectedWorker ? 'h-full overflow-hidden' : 'h-full sm:overflow-hidden overflow-auto'
      }`}
    >
      <div
        className={`transition-opacity duration-200 h-full flex flex-col ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="wait">
          {selectedWorker ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full flex flex-col"
            >
              <WorkerDetail
                worker={selectedWorker}
                onClose={onCloseWorkerDetail}
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
              <WorkersTable
                list={workers}
                isLoading={isLoading}
                titel="Workers"
                onRowClick={id => {
                  console.log('Clicked row:', id)
                  const worker = workers.find(c => String(c.id) === String(id))
                  if (worker) {
                    onSelectWorker(worker)
                  }
                }}
                onAddNew={onAddNewWorker}
                teams={teams}
                className="pt-2"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
