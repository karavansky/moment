'use client'

import { Button, Modal, Separator, Badge } from '@heroui/react'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Appointment, Service, Worker, Report } from '@/types/scheduling'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useTranslation } from '@/components/Providers'
import AppReport from './AppReport'
import AppView from './AppView'
import AppNotes from './AppNotes'
import { AnimatePresence, motion } from 'framer-motion'
import useMeasure from 'react-use-measure'
import type { ServiceTreeItem } from '@/types/scheduling'
import { X, Save, Trash2 } from 'lucide-react'
import { generateId } from '@/lib/generate-id'
import { getOnlyDate } from '@/lib/calendar-utils'

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
  const { t } = useTranslation()
  const [viewTab, setViewTab] = useState<'view' | 'report' | 'edit' | 'new' | 'notes'>(() => {
    // Try to restore viewTab from sessionStorage on initial render
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('dienstplan_activeTab') as
        | 'view'
        | 'report'
        | 'edit'
        | 'new'
        | 'notes'
        | null
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
    isClosed: false,
    createdAt: new Date(), // Дата создания записи
  }
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<Appointment>(emptyForm)

  // Appointment type label for button text
  const appointmentTypeLabel = useMemo(() => {
    const type = formData?.type ?? 0
    return type === 1 ? t('appointment.types.trip') : t('appointment.types.meeting')
  }, [formData?.type, t])
  const formDataRef = useRef<Appointment>(emptyForm)
  const initializedAppointmentIdRef = useRef<string>('')

  // Save only appointment ID to appointmentOverrides (we'll restore from fresh appointment data)
  useEffect(() => {
    // Only save if formData actually changed (not just re-rendered)
    if (formData.id && appointment?.id === formData.id && formData !== formDataRef.current) {
      formDataRef.current = formData
      // Save only ID - we'll get fresh data from context on restore
      setAppointmentOverride(formData.id, { id: formData.id })
    }
  }, [formData, appointment?.id, setAppointmentOverride])

  useEffect(() => {
    if (isOpen && appointment) {
      // Check if this appointment was being edited (has ID in overrides)
      const withOverrides = getAppointmentWithOverrides(appointment.id)
      const wasBeingEdited = withOverrides && withOverrides.id === appointment.id

      // If formData already has correct ID and reports, skip reinit (already initialized)
      if (formData.id === appointment.id && formData.reports && formData.reports.length > 0) {
        return
      }

      if (wasBeingEdited) {
        // Restore from FRESH appointment data (to get latest reports), not from saved overrides
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
          startTime: appointment.startTime ? new Date(appointment.startTime) : undefined,
          endTime: appointment.endTime ? new Date(appointment.endTime) : undefined,
          duration: appointment.duration,
          fahrzeit: appointment.fahrzeit,
          isFixedTime: appointment.isFixedTime,
          id: appointment.id,
        } as unknown as Appointment)
      } else {
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
            startTime: appointment.startTime ? new Date(appointment.startTime) : undefined,
            endTime: appointment.endTime ? new Date(appointment.endTime) : undefined,
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
          return
        }
      }
      // Don't clear appointmentOverrides here - it will be cleared on explicit close via handleClose
      // This allows data to persist when tab is switched and SSE reconnects
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
    }

    setFormData(emptyForm)
    setErrors({})
    onClose()

    setTimeout(() => {
      setViewTab('view')
    }, 300)
  }, [onClose, emptyForm, formData.id, clearAppointmentOverride])

  // Determine if appointment is readonly
  const isReadOnly = useMemo(() => {
    if (!appointment) return false

    // Closed appointments are always readonly
    if (appointment.isClosed) return true

    // Past appointments are readonly
    const appointmentDate = getOnlyDate(new Date(appointment.date))
    const today = getOnlyDate(new Date())
    if (appointmentDate < today) return true

    return false
  }, [appointment])

  // Get selected client info for saving
  const selectedClient = useMemo(
    () => clients.find(c => c.id === formData.clientID),
    [clients, formData.clientID]
  )

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.clientID) {
      newErrors.clientID = t('appointment.edit.validation.clientRequired')
    }
    if (formData.worker.length === 0) {
      newErrors.worker = t('appointment.edit.validation.workerRequired')
    }
    if (formData.duration > 0 && formData.duration <= 0) {
      newErrors.duration = t('appointment.edit.validation.durationRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, t])

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateForm() || !user) return

    // Check if this is a new appointment:
    // 1. isNewAppointment prop is true, OR
    // 2. appointment.id is a temporary ID (starts with 'new-')
    const isEditMode = !isNewAppointment &&
                       !!appointment &&
                       appointment.id === formData.id &&
                       !appointment.id.startsWith('new-')

    const appointmentData: Appointment = {
      ...formData,
      id: isEditMode ? formData.id : generateId(), // Generate new ID for new appointments
      userID: user.id,
      firmaID: appointment?.firmaID || user.firmaID || '',
      // Use formData.endTime directly (set by TimeField), don't calculate
      endTime: formData.endTime,
      workerId: formData.worker[0]?.id || '',
      workerIds: formData.worker.map(w => w.id),
      client: selectedClient,
      isClosed: appointment?.isClosed || false,
    }

    console.log('[AppModal] handleSave:', { isEditMode, isNewAppointment, appointmentId: appointment?.id, formDataId: formData.id })

    if (isEditMode) {
      updateAppointment(appointmentData)
    } else {
      addAppointment(appointmentData)
    }

    handleClose()
  }, [
    validateForm,
    user,
    isNewAppointment,
    appointment,
    formData,
    selectedClient,
    updateAppointment,
    addAppointment,
    handleClose,
  ])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (appointment && confirm(t('appointment.edit.confirmDelete'))) {
      deleteAppointment(appointment.id)
      handleClose()
    }
  }, [appointment, deleteAppointment, handleClose, t])

  const isEditMode = !!appointment && appointment.id === formData.id

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} variant="blur">
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
                    {appointmentTypeLabel}
                  </Button>
                  {!isNewAppointment &&
                    (formData.reports && formData.reports.length > 0 ? (
                      <Badge.Anchor ref={appReportRef}>
                        <Button
                          variant={viewTab === 'report' ? 'tertiary' : 'ghost'}
                          onPress={onPressReport}
                        >
                          {t('appointment.tabs.report')}
                        </Button>
                        <Badge size="sm" color="warning">
                          {formData.reports.length}
                        </Badge>
                      </Badge.Anchor>
                    ) : (
                      <Button
                        ref={appReportRef}
                        variant={viewTab === 'report' ? 'tertiary' : 'ghost'}
                        onPress={onPressReport}
                      >
                        {t('appointment.tabs.report')}
                      </Button>
                    ))}
                  <Button
                    ref={appNotesRef}
                    variant={viewTab === 'notes' ? 'tertiary' : 'ghost'}
                    onPress={onPressNotes}
                  >
                    {t('appointment.tabs.notes')}
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
                style={{ height: height > 0 ? height : 'auto' }}
                animate={{ height: height > 0 ? height : 'auto' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="relative"
              >
                <div ref={ref} className="p-1">
                  <AnimatePresence mode="wait" initial={false}>
                    {viewTab === 'view' || viewTab === 'edit' || viewTab === 'new' ? (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
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
                          teamsWithWorkers={teamsWithWorkers}
                          isReadOnly={isReadOnly}
                        />
                      </motion.div>
                    ) : viewTab === 'report' ? (
                      <motion.div
                        key="report"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
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
            <Modal.Footer>
              <div className="flex items-center justify-between w-full">
                {/* Delete button - only show for existing appointments and when not readonly */}
                {isEditMode && !isReadOnly && (
                  <Button variant="danger" onPress={handleDelete} size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    {t('appointment.edit.delete')}
                  </Button>
                )}

                {/* Save button - only show when not readonly */}
                {!isReadOnly && (
                  <Button
                    variant="primary"
                    onPress={handleSave}
                    size="sm"
                    className="gap-2 ml-auto"
                  >
                    <Save className="w-4 h-4" />
                    {isEditMode ? t('appointment.edit.save') : t('appointment.edit.create')}
                  </Button>
                )}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default AppModal
