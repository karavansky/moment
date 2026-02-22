'use client'

import { useState, useTransition, useRef, useEffect, useCallback, memo } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Appointment, Client } from '@/types/scheduling'
import { Button, Separator, Spinner, toast, Modal } from '@heroui/react'
import { FilePenLine, Undo2, History, Trash2, Archive, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ClientOverview from './ClientOverview'
import ClientHistory from './ClientHistory'
import { useTranslation } from '@/components/Providers'
import { useDisclosure } from '@/lib/useDisclosure'

interface ClientDetailProps {
  client: Client
  onClose: () => void
  isCreateNew?: boolean
  className?: string
}

export default memo(ClientDetail)
function ClientDetail({ client, onClose, isCreateNew = false, className }: ClientDetailProps) {
  const { appointments, updateClient, deleteClient } = useScheduling()
  const { t } = useTranslation()
  const clientFullName = `${client.surname} ${client.name}`
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExistAppointment, setIsExistAppointment] = useState(false)
  const [futureAppointments, setFutureAppointments] = useState<Appointment[]>([])
  const {
    isOpen: isModalOpen,
    onOpen: openModal,
    onClose: closeModal,
    onOpenChange,
  } = useDisclosure()

  const overviewRef = useRef<HTMLButtonElement>(null)
  const historyRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  // Вычисляем прошедшие и будущие встречи клиента при открытии
  useEffect(() => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const getDateStr = (d: string | Date) =>
      typeof d === 'string' ? d.slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const clientApts = appointments.filter(apt => apt.clientID === client.id)
    const past = clientApts.filter(apt => getDateStr(apt.date) < todayStr)
    const future = clientApts.filter(apt => getDateStr(apt.date) >= todayStr)

    setIsExistAppointment(past.length > 0)
    setFutureAppointments(future)
  }, [appointments, client.id])

  const handleMakeActive = () => {
    try {
      updateClient({ ...client, status: 0 })
      toast.success(`${clientFullName} is now active`)
      onClose()
    } catch {
      toast.danger(`Failed to activate ${clientFullName}`)
    }
  }

  const handleDeleteClient = async () => {
    // Клиент участвовал в прошедших встречах → предлагаем архивирование
    if (isExistAppointment) {
      if (!confirmDelete) {
        setConfirmDelete(true)
        return
      }
      setIsDeleting(true)
      try {
        updateClient({ ...client, status: 2 })
        toast.success(`${clientFullName} archived successfully`)
        onClose()
      } catch {
        toast.danger(`Failed to archive ${clientFullName}`)
      } finally {
        setIsDeleting(false)
        setConfirmDelete(false)
      }
      return
    }

    // Есть будущие/сегодняшние встречи → показываем модал со списком
    if (futureAppointments.length > 0) {
      openModal()
      return
    }

    // Нет никаких встреч → простое удаление с подтверждением
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setIsDeleting(true)
    try {
      await deleteClient(client.id)
      toast.success(`${clientFullName} deleted successfully`)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Failed to delete ${clientFullName}: ${message}`)
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleDeleteWithAppointments = async () => {
    setIsDeleting(true)
    try {
      await deleteClient(client.id)
      toast.success(`${clientFullName} and appointments deleted successfully`)
      closeModal()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Failed to delete ${clientFullName}: ${message}`)
    } finally {
      setIsDeleting(false)
    }
  }

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
    startTransition(() => setActiveTab('overview'))
  }, [startTransition])

  const onPressHistory = useCallback(() => {
    startTransition(() => setActiveTab('history'))
  }, [startTransition])

  const buttonLabel = isExistAppointment
    ? confirmDelete
      ? 'Confirm archive?'
      : 'Archive client'
    : confirmDelete
      ? 'Confirm delete?'
      : 'Delete client'

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
          {!isCreateNew && (
            <div className="ml-auto">
              {client.status === 2 ? (
                <Button variant="primary" size="sm" onPress={handleMakeActive}>
                  <UserCheck className="w-4 h-4" />
                  Make active
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  isDisabled={isDeleting}
                  onPress={handleDeleteClient}
                >
                  {isDeleting ? (
                    <Spinner size="sm" />
                  ) : isExistAppointment ? (
                    <Archive className="w-4 h-4" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {buttonLabel}
                </Button>
              )}
            </div>
          )}
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

      {/* Модал: список будущих встреч перед удалением */}
      <Modal>
        <Modal.Backdrop isOpen={isModalOpen} onOpenChange={onOpenChange}>
          <Modal.Container className="max-w-lg" placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <span>Delete client — upcoming appointments</span>
              </Modal.Header>
              <Modal.Body className="gap-3">
                <p className="text-sm text-default-500">
                  This client has scheduled appointments. They will also be deleted.
                </p>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-default-200">
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Services</th>
                        <th className="pb-2 font-medium">Workers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {futureAppointments.map(apt => (
                        <tr key={apt.id} className="border-b border-default-100 last:border-0">
                          <td className="py-2 pr-4 whitespace-nowrap">
                            {new Date(apt.date).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4">
                            {apt.services.map(s => s.name).join(', ') || '—'}
                          </td>
                          <td className="py-2">
                            {apt.worker.map(w => `${w.name} ${w.surname}`).join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={closeModal}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isDisabled={isDeleting}
                  onPress={handleDeleteWithAppointments}
                >
                  {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                  Delete appointments &amp; client
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
