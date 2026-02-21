'use client'

import { useState, useTransition, useRef, useEffect, useCallback, memo } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Appointment, Worker } from '@/types/scheduling'
import { Button, Separator, Spinner, toast, Modal } from '@heroui/react'
import { FilePenLine, Undo2, History, Trash2, Archive, UserCheck, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkerOverview from './WorkerOverview'
import WorkerHistory from './WorkerHistory'
import StaffSelect from '@/components/scheduling/StaffSelect'
import { useDisclosure } from '@/lib/useDisclosure'

interface WorkerDetailProps {
  worker: Worker
  onClose: () => void
  isCreateNew?: boolean
  className?: string
}

export default memo(WorkerDetail)
function WorkerDetail({ worker, onClose, isCreateNew = false, className }: WorkerDetailProps) {
  const { appointments, workers, teamsWithWorkers, updateWorker, updateAppointment, deleteWorker } =
    useScheduling()
  const workerFullName = `${worker.surname} ${worker.name}`
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExistAppointment, setIsExistAppointment] = useState(false)
  const [futureAppointments, setFutureAppointments] = useState<Appointment[]>([])
  // workerIds per appointment, edited in the modal
  const [appointmentEdits, setAppointmentEdits] = useState<Record<string, string[]>>({})
  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal, onOpenChange } = useDisclosure()

  const overviewRef = useRef<HTMLButtonElement>(null)
  const historyRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  // Вычисляем прошедшие и будущие встречи работника при открытии
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const workerApts = appointments.filter(
      apt =>
        apt.workerId === worker.id ||
        apt.workerIds?.includes(worker.id) ||
        apt.worker.some(w => w.id === worker.id)
    )
    const past = workerApts.filter(apt => new Date(apt.date) < today)
    const future = workerApts.filter(apt => new Date(apt.date) >= today)

    setIsExistAppointment(past.length > 0)
    setFutureAppointments(future)
  }, [appointments, worker.id])

  // Открыть модал: инициализировать edits текущими составами
  const handleOpenModal = useCallback(() => {
    const initialEdits: Record<string, string[]> = {}
    for (const apt of futureAppointments) {
      initialEdits[apt.id] = apt.worker.map(w => w.id)
    }
    setAppointmentEdits(initialEdits)
    openModal()
  }, [futureAppointments, openModal])

  // Кнопка "Apply & delete" активна только когда работник убран из всех встреч
  const allWorkerRemoved =
    futureAppointments.length > 0 &&
    futureAppointments.every(apt => {
      const ids = appointmentEdits[apt.id]
      return ids !== undefined && !ids.includes(worker.id)
    })

  const handleMakeActive = () => {
    try {
      updateWorker({ ...worker, status: 0 })
      toast.success(`${workerFullName} is now active`)
      onClose()
    } catch {
      toast.danger(`Failed to activate ${workerFullName}`)
    }
  }

  const handleDeleteWorker = async () => {
    // Участвовал в прошедших встречах → архивирование
    if (isExistAppointment) {
      if (!confirmDelete) {
        setConfirmDelete(true)
        return
      }
      setIsDeleting(true)
      try {
        updateWorker({ ...worker, status: 2 })
        toast.success(`${workerFullName} archived successfully`)
        onClose()
      } catch {
        toast.danger(`Failed to archive ${workerFullName}`)
      } finally {
        setIsDeleting(false)
        setConfirmDelete(false)
      }
      return
    }

    // Есть будущие встречи → открываем модал с переназначением
    if (futureAppointments.length > 0) {
      handleOpenModal()
      return
    }

    // Нет встреч вообще → простое удаление с подтверждением
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setIsDeleting(true)
    try {
      await deleteWorker(worker.id)
      toast.success(`${workerFullName} deleted successfully`)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Failed to delete ${workerFullName}: ${message}`)
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleApplyAndDelete = async () => {
    setIsDeleting(true)
    try {
      // Обновляем каждую встречу с новым составом работников
      for (const apt of futureAppointments) {
        const newWorkerIds = appointmentEdits[apt.id] ?? apt.worker.map(w => w.id)
        const newWorkerObjects = newWorkerIds
          .map(id => workers.find(w => w.id === id))
          .filter((w): w is Worker => w !== undefined)
        updateAppointment({
          ...apt,
          worker: newWorkerObjects,
          workerId: newWorkerObjects[0]?.id ?? apt.workerId,
          workerIds: newWorkerIds,
        })
      }
      await deleteWorker(worker.id)
      toast.success(`${workerFullName} deleted and appointments updated`)
      closeModal()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.danger(`Failed to delete ${workerFullName}: ${message}`)
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
      : 'Archive worker'
    : confirmDelete
      ? 'Confirm delete?'
      : 'Delete worker'

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      <div className="flex items-center pl-2 gap-2 mb-4 shrink-0">
        <Button onClick={onClose}>
          <Undo2 className="w-5 h-5 text-primary" />
        </Button>
        <h2 className="text-2xl font-semibold">
          {isCreateNew ? 'New Worker' : `${worker.surname} ${worker.name}`}
        </h2>
      </div>
      <div className="flex flex-col relative mb-4 shrink-0">
        <div className="flex flex-row gap-2 mb-2">
          <Button
            ref={overviewRef}
            variant={activeTab === 'overview' ? 'tertiary' : 'ghost'}
            onPress={onPressOverview}
          >
            <FilePenLine className="w-5 h-5 mr-2" /> Overview
          </Button>
          <Button
            ref={historyRef}
            variant={activeTab === 'history' ? 'tertiary' : 'ghost'}
            onPress={onPressHistory}
          >
            <History className="w-5 h-5 mr-2" /> History
          </Button>
          <div className="ml-auto">
            {worker.status === 2 ? (
              <Button variant="primary" size="sm" onPress={handleMakeActive}>
                <UserCheck className="w-4 h-4" />
                Make active
              </Button>
            ) : (
              <Button variant="danger" size="sm" isDisabled={isDeleting} onPress={handleDeleteWorker}>
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
              <WorkerOverview worker={worker} isCreateNew={isCreateNew} className="pt-2" />
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
              <WorkerHistory worker={worker} className="pt-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модал: переназначение работника в будущих встречах перед удалением */}
      <Modal>
        <Modal.Backdrop isOpen={isModalOpen} onOpenChange={onOpenChange}>
          <Modal.Container className="max-w-2xl" placement="center">
            <Modal.Dialog className="max-h-[90vh] overflow-y-auto">
              <Modal.CloseTrigger />
              <Modal.Header>
                <span>Delete worker — reassign upcoming appointments</span>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <p className="text-sm text-default-500">
                  Remove <strong>{workerFullName}</strong> from all appointments below (or assign a
                  replacement) to enable deletion.
                </p>
                <div className="flex flex-col gap-4">
                  {futureAppointments.map(apt => {
                    const currentIds = appointmentEdits[apt.id] ?? apt.worker.map(w => w.id)
                    const stillHasWorker = currentIds.includes(worker.id)
                    return (
                      <div
                        key={apt.id}
                        className={`rounded-lg border p-3 flex flex-col gap-2 ${
                          stillHasWorker ? 'border-danger-200 bg-danger-50/30' : 'border-success-200 bg-success-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {new Date(apt.date).toLocaleDateString()}
                          </span>
                          <span className="text-default-500">
                            {apt.services.map(s => s.name).join(', ') || '—'}
                          </span>
                          {stillHasWorker ? (
                            <span className="text-xs text-danger font-medium">Worker not removed</span>
                          ) : (
                            <span className="text-xs text-success font-medium">Ready</span>
                          )}
                        </div>
                        <StaffSelect
                          teamsWithWorkers={teamsWithWorkers}
                          selectedWorkerIds={currentIds}
                          onSelectionChange={newIds => {
                            setAppointmentEdits(prev => ({ ...prev, [apt.id]: newIds }))
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={closeModal} isDisabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isDisabled={!allWorkerRemoved || isDeleting}
                  onPress={handleApplyAndDelete}
                >
                  {isDeleting ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                  Apply changes &amp; delete worker
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
