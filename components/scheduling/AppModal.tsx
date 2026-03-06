'use client'

import { Button, Modal, Separator } from '@heroui/react'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { Appointment, Service, Worker, Report } from '@/types/scheduling'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useTranslation } from '@/components/Providers'
import AppReport from './AppReport'
import AppView from './AppView'
import AppNotes from './AppNotes'
import { AnimatePresence, motion } from 'framer-motion'
import useMeasure from 'react-use-measure'
import type { ServiceTreeItem } from '@/types/scheduling'
import { X } from 'lucide-react'

interface AppModalProps {
  isOpen: boolean
  onClose: () => void
  activeTab?: 'view' | 'report' | 'edit' | 'new' | 'notes'
  appointment: Appointment | null
  selectedDate?: Date
  readOnly?: boolean
  isNewAppointment?: boolean
}

function AppModal({
  isOpen,
  onClose,
  activeTab = 'view',
  appointment,
  selectedDate,
  readOnly = false,
  isNewAppointment = false,
}: AppModalProps) {
  const {
    clients,
    workers,
    user,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    groupedClients,
    teamsWithWorkers,
    servicesForSelect,
    services,
    setAppointmentOverride,
    getAppointmentWithOverrides,
    clearAppointmentOverride,
  } = useScheduling()
  const [viewTab, setViewTab] = useState<'view' | 'report' | 'edit' | 'new' | 'notes'>(activeTab)
  const [ref, { height }] = useMeasure()
  const appViewRef = useRef<HTMLButtonElement>(null)
  const appReportRef = useRef<HTMLButtonElement>(null)
  const appNotesRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })
  const emptyForm: Appointment = {
    clientID: '',
    worker: [] as Worker[],
    date: new Date(),
    startTime: undefined,
    duration: 0,
    fahrzeit: 0,
    isFixedTime: false,
    services: [] as Service[],
    reports: [] as Report[],
    firmaID: '',
    id: '',
    userID: '',
    workerId: '',
    isOpen: false,
    endTime: undefined,
  }
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<Appointment>(emptyForm)
  const formDataRef = useRef<Appointment>(emptyForm)

  // Save formData to appointmentOverrides on every change (but avoid re-renders)
  useEffect(() => {
    // Only save if formData actually changed (not just re-rendered)
    if (formData.id && appointment?.id === formData.id && formData !== formDataRef.current) {
      formDataRef.current = formData
      setAppointmentOverride(formData.id, formData)
    }
  }, [formData, appointment?.id, setAppointmentOverride])

  useEffect(() => {
    if (isOpen && appointment) {
      // Try to restore from appointmentOverrides first
      const withOverrides = getAppointmentWithOverrides(appointment.id)
      const shouldRestore = withOverrides && withOverrides.id === appointment.id

      if (shouldRestore && withOverrides) {
        console.log('[AppModal] Restoring formData from appointmentOverrides:', withOverrides.id)
        setFormData(withOverrides)
      } else {
        const common = {
          workers: appointment.worker || [],
          services: appointment.services || [],
          reports: appointment.reports || [],
          firmaID: appointment.firmaID || '',
        }

        if (activeTab === 'new') {
          setFormData({
            ...emptyForm,
            ...common,
            clientID: appointment.clientID || '',
            date: new Date(selectedDate || appointment.date),
            duration: 60,
            isDuration: true,
          } as unknown as Appointment)
        } else {
          setFormData({
            ...emptyForm,
            ...common,
            clientID: appointment.clientID,
            date: new Date(appointment.date),
            startHour:
              appointment.isFixedTime && appointment.startTime
                ? new Date(appointment.startTime).getHours()
                : 0,
            startMinute:
              appointment.isFixedTime && appointment.startTime
                ? new Date(appointment.startTime).getMinutes()
                : 0,
            duration: appointment.duration,
            fahrzeit: appointment.fahrzeit,
            isFixedTime: appointment.isFixedTime,
            id: appointment.id,
          } as unknown as Appointment)
        }
      }
    } else if (!isOpen) {
      // Clear appointmentOverrides when explicitly closing
      if (formData.id) {
        clearAppointmentOverride(formData.id)
      }
      setFormData(emptyForm)
    }
  }, [isOpen, appointment, selectedDate, activeTab, getAppointmentWithOverrides, clearAppointmentOverride])

  useEffect(() => {
    const updateIndicator = () => {
      // Need a tiny timeout to ensure DOM is updated after viewTab changes
      setTimeout(() => {
        switch (viewTab) {
          case 'view':
          case 'edit':
          case 'new':
            if (appViewRef.current) {
              setIndicatorStyle({
                width: appViewRef.current.offsetWidth,
                left: appViewRef.current.offsetLeft,
              })
            }
            break
          case 'report':
            if (appReportRef.current) {
              setIndicatorStyle({
                width: appReportRef.current.offsetWidth,
                left: appReportRef.current.offsetLeft,
              })
            }
            break
          case 'notes':
            if (appNotesRef.current) {
              setIndicatorStyle({
                width: appNotesRef.current.offsetWidth,
                left: appNotesRef.current.offsetLeft,
              })
            }
            break
        }
      }, 50) // Small delay allows React to render the newly active button text/styles
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)

    return () => window.removeEventListener('resize', updateIndicator)
  }, [viewTab, isOpen])

  const onPressView = useCallback(() => {
    startTransition(() => setViewTab('view'))
  }, [startTransition])

  const onPressReport = useCallback(() => {
    startTransition(() => setViewTab('report'))
  }, [startTransition])

  const onPressNotes = useCallback(() => {
    startTransition(() => setViewTab('notes'))
  }, [startTransition])

  const handleClose = useCallback(() => {
    setFormData(emptyForm)
    setErrors({})
    onClose()

    setTimeout(() => {
      setViewTab('view')
    }, 300)
  }, [onClose, emptyForm])

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={open => {
          if (!open) handleClose()
        }}
        variant="blur"
      >
        <Modal.Container placement="center">
          <Modal.Dialog>
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={handleClose}
              className="absolute top-3 right-3 z-50 rounded-full"
              aria-label="Close modal"
            >
              <X size={20} />
            </Button>
            <Modal.Header className="w-full">
              <div className="flex flex-col relative w-full">
                <div className="flex flex-row gap-2 mb-2">
                  <Button
                    ref={appViewRef}
                    variant={
                      viewTab === 'view' || viewTab === 'edit' || viewTab === 'new'
                        ? 'tertiary'
                        : 'ghost'
                    }
                    onPress={onPressView}
                  >
                    Termin {viewTab}
                  </Button>
                  <Button
                    ref={appReportRef}
                    variant={viewTab === 'report' ? 'tertiary' : 'ghost'}
                    onPress={onPressReport}
                  >
                    Bericht
                  </Button>
                  <Button
                    ref={appNotesRef}
                    variant={viewTab === 'notes' ? 'tertiary' : 'ghost'}
                    onPress={onPressNotes}
                  >
                    Kommentar
                  </Button>
                </div>
                <div className="relative w-full">
                  <Separator />
                  <div
                    className="absolute bottom-0 h-[2px] bg-blue-500 z-10 transition-all duration-200 ease-out"
                    style={{
                      width: `${indicatorStyle.width}px`,
                      left: `${indicatorStyle.left}px`,
                    }}
                  />
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className="p-0 overflow-hidden">
              <motion.div
                animate={{ height: height > 0 ? height : 'auto' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden relative"
              >
                <div ref={ref} className="p-6">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {viewTab === 'view' || viewTab === 'edit' || viewTab === 'new' ? (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="w-full"
                      >
                        <AppView
                          formData={formData}
                          setFormData={setFormData}
                          errors={errors}
                          setErrors={setErrors}
                          selectedDate={selectedDate}
                          groupedClients={groupedClients}
                          clients={clients}
                          servicesForSelect={servicesForSelect}
                          services={services}
                          isNewAppointment={isNewAppointment}
                          appointment={appointment}
                          viewTab={viewTab}
                        />
                      </motion.div>
                    ) : viewTab === 'report' ? (
                      <motion.div
                        key="report"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full"
                      >
                        <AppReport
                          formData={formData}
                          setFormData={setFormData}
                          errors={errors}
                          setErrors={setErrors}
                          selectedDate={selectedDate}
                        />
                      </motion.div>
                    ) : viewTab === 'notes' ? (
                      <motion.div
                        key="notes"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="w-full"
                      >
                        <AppNotes
                          formData={formData}
                          setFormData={setFormData}
                          errors={errors}
                          setErrors={setErrors}
                          selectedDate={selectedDate}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>
            </Modal.Body>
            <Modal.Footer></Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default AppModal
