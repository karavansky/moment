'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Modal, Button, Separator, Label, Switch, TextField, FieldError } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Appointment } from '@/types/scheduling'
import { Clock, Save, Trash2, Car } from 'lucide-react'
import { formatTime } from '@/lib/calendar-utils'
import { parseDate, Time, today, getLocalTimeZone } from '@internationalized/date'
import DatePicker from '@/components/ui/DatePicker'
import StaffSelect from './StaffSelect'
import ClientSelect from './ClientSelect'
import { usePlatformContext } from '@/contexts/PlatformContext'
import ServiceSelect from './ServiceSelect'

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  selectedDate?: Date
  readOnly?: boolean
  isNewAppointment?: boolean
}

export default function AppointmentModal({
  isOpen,
  onClose,
  appointment,
  selectedDate,
  readOnly = false,
  isNewAppointment = false,
}: AppointmentModalProps) {
  const { isMobile, isReady } = usePlatformContext()

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
  } = useScheduling()

  const isEditMode = !!appointment

  // Form state - lazy initializer to avoid creating object on every render
  // isFixedTime включён в formData как единый источник истины
  const [formData, setFormData] = useState(() =>
    isNewAppointment
      ? appointment
        ? {
            // Handle template appointment (e.g. from drag & drop)
            clientID: appointment.clientID || '',
            workerId: appointment.workerId || '',
            date: new Date(selectedDate || appointment.date),
            startHour: 0,
            startMinute: 0,
            duration: 60,
            fahrzeit: 0,
            isDuration: true,
            isDriveTime: false,
            isFixedTime: false,
            services: appointment.services || [],
            reports: appointment.reports ||  [], 
          }
        : {
            clientID: '',
            workerId: '',
            date: new Date(),
            startHour: 0,
            startMinute: 0,
            duration: 0,
            fahrzeit: 0,
            isDuration: false,
            isDriveTime: false,
            isFixedTime: false,
            services: [],
            reports: [],
          }
      : appointment
        ? {
            clientID: appointment.clientID,
            workerId: appointment.workerId,
            date: new Date(appointment.date),
            startHour: appointment.isFixedTime ? new Date(appointment.startTime).getHours() : 0,
            startMinute: appointment.isFixedTime ? new Date(appointment.startTime).getMinutes() : 0,
            duration: appointment.duration,
            fahrzeit: appointment.fahrzeit,
            isDuration: appointment.duration > 0,
            isDriveTime: appointment.fahrzeit > 0,
            isFixedTime: appointment.isFixedTime,
            services: appointment.services || [],
            reports: appointment.reports || [],
          }
        : {
            clientID: '',
            workerId: '',
            date: new Date(),
            startHour: 0,
            startMinute: 0,
            duration: 0,
            fahrzeit: 0,
            isDuration: false,
            isDriveTime: false,
            isFixedTime: false,
            services: [],
            reports: [],
          }
  )
  if (process.env.NODE_ENV === 'development') {
   // console.log('Initial formData:', formData)
   // console.log('Appointment prop:', appointment)
  }
  const [isDateInvalid, setIsDateInvalid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when appointment or selectedDate changes
  useEffect(() => {
    if (appointment && !isNewAppointment) {
      const startTime = new Date(appointment.startTime)
      setFormData({
        clientID: appointment.clientID,
        workerId: appointment.workerId,
        date: new Date(appointment.date),
        startHour: appointment.isFixedTime ? startTime.getHours() : 0,
        startMinute: appointment.isFixedTime ? startTime.getMinutes() : 0,
        duration: appointment.duration,
        fahrzeit: appointment.fahrzeit,
        isDuration: appointment.duration > 0,
        isDriveTime: appointment.fahrzeit > 0,
        isFixedTime: appointment.isFixedTime,
        services: appointment.services || [],
        reports: appointment.reports || [],
      })
    } else if (isNewAppointment && appointment) {
      // Handle template appointment (e.g. from drag & drop)
      setFormData({
        clientID: appointment.clientID || '',
        workerId: appointment.workerId || '',
        date: new Date(selectedDate || appointment.date),
        startHour: 0,
        startMinute: 0,
        duration: 60,
        fahrzeit: 0,
        isDuration: true,
        isDriveTime: false,
        isFixedTime: false,
        services: appointment.services || [],
        reports: appointment.reports || [],
      })
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: new Date(selectedDate),
        startHour: 0,
        startMinute: 0,
      }))
    }
  }, [appointment, selectedDate, isNewAppointment])
  // Calculate end time
  const endTime = useMemo(() => {
    const start = new Date(formData.date)
    start.setHours(formData.startHour, formData.startMinute, 0, 0)
    const end = new Date(start.getTime() + formData.duration * 60000)
    return end
  }, [formData.date, formData.startHour, formData.startMinute, formData.duration])

  // Get selected client and worker info for saving
  const selectedClient = useMemo(
    () => clients.find(c => c.id === formData.clientID),
    [clients, formData.clientID]
  )

  const selectedWorker = useMemo(
    () => workers.find(w => w.id === formData.workerId),
    [workers, formData.workerId]
  )

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.clientID) {
      newErrors.clientID = 'Bitte wählen Sie einen Kunden'
    }
    if (!formData.workerId) {
      newErrors.workerId = 'Bitte wählen Sie einen Fachkraft'
    }
    if (formData.isDuration && formData.duration <= 0) {
      newErrors.duration = 'Dauer muss größer als 0 sein'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = () => {
    if (!validateForm() || !user) return

    const startTime = new Date(formData.date)
    startTime.setHours(formData.startHour, formData.startMinute, 0, 0)

    const appointmentData: Appointment = {
      id: appointment?.id || `apt-${Date.now()}`,
      userID: user.id,
      clientID: formData.clientID,
      date: formData.date,
      isFixedTime: formData.isFixedTime,
      startTime,
      duration: formData.duration,
      endTime,
      fahrzeit: formData.fahrzeit,
      workerId: formData.workerId,
      worker: selectedWorker,
      client: selectedClient,
      reports: appointment?.reports || [],
      isOpen: false,
      services: appointment?.services || [], // 
    }

    if (isEditMode) {
      updateAppointment(appointmentData)
    } else {
      addAppointment(appointmentData)
    }

    handleClose()
  }

  // Handle delete
  const handleDelete = () => {
    if (appointment && confirm('Möchten Sie diesen Termin wirklich löschen?')) {
      deleteAppointment(appointment.id)
      handleClose()
    }
  }

  // Handle close
  const handleClose = () => {
    setFormData({
      clientID: '',
      workerId: '',
      date: new Date(),
      startHour: 0,
      startMinute: 0,
      duration: 0,
      fahrzeit: 0,
      isDuration: false,
      isDriveTime: false,
      isFixedTime: false,
      services: [],
      reports: [],
    })
    setErrors({})
    onClose()
  }
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })
    alert('Form submitted successfully!')
  }
  if (!isReady) return null

  console.log('Rendering AppointmentModal with servicesForSelect:', servicesForSelect)
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={open => {
          if (!open) handleClose()
        }}
        variant="blur"
      >
        <Modal.Container className="max-w-2xl" placement="center">
          <Modal.Dialog className="max-h-[90vh] overflow-y-auto">
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">
                  {readOnly ? 'Termin ansehen' : isEditMode ? 'Termin bearbeiten' : 'Neuer Termin'}
                </h2>
                {appointment && (
                  <p className="text-sm text-default-500">
                    Erstellt am {appointment.date.toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            </Modal.Header>

            <Modal.Body className="gap-4 py-2">
              {/* Client Selection */}
              <ClientSelect
                groupedClients={groupedClients}
                clients={clients}
                selectedClientId={formData.clientID}
                onSelectionChange={clientId => {
                  setFormData(prev => ({ ...prev, clientID: clientId }))
                  setErrors(prev => ({ ...prev, clientID: '' }))
                }}
                error={errors.clientID}
                isNew={isNewAppointment || !appointment}
              />

              <Separator />
              {/* Services Selection */}
              <ServiceSelect
                servicesForSelect={servicesForSelect}
                selectedServices={"Ganzkörperwäsche"} 
                onSelectionChange={serviceId => {
                  console.log('Selected service ID:', serviceId)
                //  setFormData(prev => ({ ...prev, services: serviceId }))
                  setErrors(prev => ({ ...prev, services: '' }))
                }}
                error={errors.services}
              />

              <Separator />
              {/* Worker Selection */}
              <StaffSelect
                teamsWithWorkers={teamsWithWorkers}
                selectedWorkerId={formData.workerId}
                onSelectionChange={workerId => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Selected worker ID:', workerId)
                  }
                  setFormData(prev => ({ ...prev, workerId }))
                  setErrors(prev => ({ ...prev, workerId: '' }))
                }}
                error={errors.workerId}
              />

              <Separator />

              {/* Date */}
              <div className="flex items-center justify-between flex-row gap-2 w-full">
                <TextField isRequired name="date" type="date" isInvalid={isDateInvalid}>
                  <Label className="text-base font-medium flex items-center gap-2">Datum</Label>
                  <DatePicker
                    value={parseDate(
                      `${formData.date.getFullYear()}-${String(formData.date.getMonth() + 1).padStart(2, '0')}-${String(formData.date.getDate()).padStart(2, '0')}`
                    )}
                    onChange={e => {
                      if (!e) return
                      // Create date at midnight local time without timezone conversion
                      const newDate = new Date(e.year, e.month - 1, e.day, 0, 0, 0, 0)

                      // Validate against today for past dates
                      const todayDate = new Date()
                      todayDate.setHours(0, 0, 0, 0)

                      if (newDate < todayDate) {
                        setIsDateInvalid(true)
                      } else {
                        setIsDateInvalid(false)
                      }

                      if (process.env.NODE_ENV === 'development') {
                        console.log(
                          'Selected date:',
                          newDate,
                          'Today:',
                          todayDate,
                          'Is invalid:',
                          newDate < todayDate
                        )
                      }
                      setFormData(prev => ({ ...prev, date: newDate }))
                    }}
                    minValue={today(getLocalTimeZone())}
                    isDisabled={readOnly}
                    //  className="max-w-[256px]"
                    showTime={formData.isFixedTime}
                    timeValue={
                      formData.startHour === 0 && formData.startMinute === 0
                        ? null
                        : new Time(formData.startHour, formData.startMinute)
                    }
                    onTimeChange={time => {
                      if (time) {
                        setFormData(prev => ({
                          ...prev,
                          startHour: time.hour,
                          startMinute: time.minute,
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          startHour: 0,
                          startMinute: 0,
                        }))
                      }
                    }}
                  />
                  <FieldError>
                    {isDateInvalid ? 'Das Datum darf nicht in der Vergangenheit liegen' : null}
                  </FieldError>
                </TextField>
                <Switch
                  size="lg"
                  isSelected={formData.isFixedTime}
                  onChange={value => {
                    setFormData(prev => ({ ...prev, isFixedTime: value }))
                  }}
                >
                  <Label className="text-sm">Fest Zeit</Label>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>

              <Separator />

              {/* Duration Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg">
                <Switch
                  isSelected={formData.isDuration}
                  onChange={() =>
                    setFormData(prev => ({
                      ...prev,
                      isDuration: !prev.isDuration,
                      duration: !prev.isDuration ? 60 : 0,
                    }))
                  }
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-default-500" />
                    <div>
                      <p className="text-sm font-medium">Zeitdauer (Minuten)</p>
                      <p className="text-xs text-default-500">
                        So viel Zeit ist für das Treffen vorgesehen.
                      </p>
                    </div>
                  </div>
                </Switch>
                {/* Duration Input */}
                {formData.isDuration && (
                  <div className="flex flex-col items-end gap-2">
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={formData.duration}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          duration: parseInt(e.target.value) || 60,
                        }))
                      }
                      disabled={readOnly}
                      className="w-16 text-right px-3 py-2 border border-divider rounded-lg bg-default-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                    {errors.duration && <p className="text-xs text-danger">{errors.duration}</p>}
                  </div>
                )}
              </div>

              {/* Driving Time Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg">
                <Switch
                  isSelected={formData.isDriveTime}
                  onChange={() =>
                    setFormData(prev => ({
                      ...prev,
                      isDriveTime: !prev.isDriveTime,
                      fahrzeit: !prev.isDriveTime ? 15 : 0,
                    }))
                  }
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Fahrzeit (Minuten)</p>
                      <p className="text-xs text-default-500">
                        Geschätzte Fahrzeit zum nächsten Termin
                      </p>
                    </div>
                  </div>
                </Switch>
                {/* Drive Time Input */}
                {formData.isDriveTime && (
                  <div className="flex flex-col items-end gap-2 ">
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={formData.fahrzeit}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          fahrzeit: parseInt(e.target.value) || 0,
                        }))
                      }
                      disabled={readOnly}
                      className="w-16 text-right px-3 py-2 border border-divider rounded-lg bg-default-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Calculated End Time */}
              {formData.isFixedTime && false && (
                <div className="flex items-center gap-2 p-3 bg-accent-50 rounded-lg">
                  <Clock className="w-4 h-4 text-accent" />
                  <div className="text-sm">
                    <span className="font-medium">Endzeit: </span>
                    <span className="text-accent font-semibold">{formatTime(endTime)}</span>
                    <span className="text-xs text-default-500 ml-2">({formData.duration} Min)</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Footer Buttons */}
              <div className="flex justify-between pt-4 border-t border-divider">
                <div>
                  {isEditMode && !readOnly && (
                    <Button variant="danger" onPress={handleDelete} className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Löschen
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {!readOnly && (
                    <Button variant="primary" onPress={handleSave} className="gap-2">
                      <Save className="w-4 h-4" />
                      {isEditMode ? 'Speichern' : 'Erstellen'}
                    </Button>
                  )}
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

/*


  
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Fahrzeit (Minuten)
                </Label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={formData.fahrzeit}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      fahrzeit: parseInt(e.target.value) || 0,
                    }))
                  }
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-default-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-default-500">Geschätzte Fahrzeit zum nächsten Termin</p>
              </div>

                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Kunde *
                </Label>
                <select
                  value={formData.clientID}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, clientID: e.target.value }))
                    setErrors(prev => ({ ...prev, clientID: '' }))
                  }}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-default-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="">Kunde auswählen</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.clientName} - {client.strasse} {client.houseNumber}, {client.plz}{' '}
                      {client.ort}
                    </option>
                  ))}
                </select>




<Button variant="tertiary" onPress={handleClose} className="gap-2">
                    <X className="w-4 h-4" />
                    {readOnly ? 'Schließen' : 'Abbrechen'}
                  </Button>
*/
