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
  const [viewTab, setViewTab] = useState<'view' | 'report' | 'edit' | 'new' | 'notes'>(() => {
    // Try to restore viewTab from sessionStorage on initial render
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('dienstplan_activeTab') as 'view' | 'report' | 'edit' | 'new' | 'notes' | null
      return savedTab || activeTab
    }
    return activeTab
  })
  const [ref, { height }] = useMeasure()
  const appViewRef = useRef<HTMLButtonElement>(null)
  const appReportRef = useRef<HTMLButtonElement>(null)
  const appNotesRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  // Save viewTab to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen && appointment?.id) {
      console.log('[AppModal] Saving viewTab to sessionStorage:', viewTab)
      sessionStorage.setItem('dienstplan_activeTab', viewTab)
    }
  }, [viewTab, isOpen, appointment?.id])
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
  const initializedAppointmentIdRef = useRef<string>('')

  // Save only appointment ID to appointmentOverrides (we'll restore from fresh appointment data)
  useEffect(() => {
    // Only save if formData actually changed (not just re-rendered)
    if (formData.id && appointment?.id === formData.id && formData !== formDataRef.current) {
      formDataRef.current = formData
      // Save only ID - we'll get fresh data from context on restore
      setAppointmentOverride(formData.id, { id: formData.id })
      console.log('[AppModal] Saved appointment ID to overrides:', formData.id)
    }
  }, [formData, appointment?.id, setAppointmentOverride])

  useEffect(() => {
    console.log('[AppModal] Initialization effect:', {
      isOpen,
      appointmentId: appointment?.id,
      activeTab,
    })

    if (isOpen && appointment) {
      // Check if this appointment was being edited (has ID in overrides)
      const withOverrides = getAppointmentWithOverrides(appointment.id)
      const wasBeingEdited = withOverrides && withOverrides.id === appointment.id

      console.log('[AppModal] Restore check:', {
        appointmentId: appointment.id,
        hasOverrides: !!withOverrides,
        wasBeingEdited,
        formDataId: formData.id,
        formDataHasReports: formData.reports && formData.reports.length > 0,
      })

      // If formData already has correct ID and reports, skip reinit (already initialized)
      if (formData.id === appointment.id && formData.reports && formData.reports.length > 0) {
        console.log('[AppModal] FormData already initialized with reports for this appointment, skipping')
        return
      }

      if (wasBeingEdited) {
        // Restore from FRESH appointment data (to get latest reports), not from saved overrides
        console.log('[AppModal] Was being edited, initializing from FRESH appointment:', appointment.id, 'appointment.reports:', appointment.reports?.length)
        initializedAppointmentIdRef.current = appointment.id
        const common = {
          workers: appointment.worker || [],
          services: appointment.services || [],
          reports: appointment.reports || [],
          firmaID: appointment.firmaID || '',
        }
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
      } else {
        console.log('[AppModal] No overrides found, initializing fresh formData')
        initializedAppointmentIdRef.current = appointment.id
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
      // Don't clear formData if there's a saved appointmentID (we're in the middle of restore)
      if (typeof window !== 'undefined') {
        const hasOverridesInStorage = sessionStorage.getItem('appointmentOverrides')
        if (hasOverridesInStorage) {
          console.log('[AppModal] Modal closed but has overrides in storage, keeping formData for restore')
          return
        }
      }
      // Don't clear appointmentOverrides here - it will be cleared on explicit close via handleClose
      // This allows data to persist when tab is switched and SSE reconnects
      console.log('[AppModal] Modal closed, clearing formData (formData.id was:', formData.id, ')')
      initializedAppointmentIdRef.current = ''
      setFormData(emptyForm)
    } else if (isOpen && !appointment) {
      // Modal is open but appointment not yet loaded - keep existing formData
      console.log('[AppModal] Modal open but no appointment yet, keeping formData')
    }
  }, [isOpen, appointment?.id, selectedDate, activeTab])

  // Separate effect to update formData when appointment data changes (SSE updates)
  useEffect(() => {
    if (isOpen && appointment && formData.id === appointment.id) {
      // Update formData with latest reports from appointment
      console.log('[AppModal] Updating formData with latest appointment data, reports:', appointment.reports?.length)
      setFormData(prev => ({
        ...prev,
        reports: appointment.reports || [],
        services: appointment.services || [],
        worker: appointment.worker || [],
      }))
    }
  }, [appointment?.reports, appointment?.services, isOpen, formData.id])

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
    // Clear appointmentOverrides on explicit close
    if (formData.id) {
      clearAppointmentOverride(formData.id)
      console.log('[AppModal] Cleared appointmentOverrides on explicit close:', formData.id)
    }

    setFormData(emptyForm)
    setErrors({})
    onClose()

    setTimeout(() => {
      setViewTab('view')
    }, 300)
  }, [onClose, emptyForm, formData.id, clearAppointmentOverride])

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
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
            <Modal.Body className="p-0 overflow-y-auto max-h-[80vh]">
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
                        {/* Only render AppReport when formData has valid ID */}
                        {formData.id ? (
                          <AppReport
                            formData={formData}
                            setFormData={setFormData}
                            errors={errors}
                            setErrors={setErrors}
                            selectedDate={selectedDate}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-default-400">Loading...</span>
                          </div>
                        )}
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
