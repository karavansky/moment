'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  ModalHeader,
  ModalBody,
  Button,
  Separator,
  Label,
  DateValue,
  ComboBox,
  Header,
  Input,
  ListBox,
  Switch,
  TextField,
  FieldError,
} from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Appointment } from '@/types/scheduling'
import { Calendar, Clock, User, MapPin, Save, X, Trash2, AlertCircle, Car } from 'lucide-react'
import { formatTime } from '@/lib/calendar-utils'
import { parseDate, Time, today, getLocalTimeZone } from '@internationalized/date'
import DatePicker from '@/components/ui/DatePicker'
import StaffSelect from './StaffSelect'
import { usePlatform } from '@/hooks/usePlatform'

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
  const { isMobile, isReady } = usePlatform()

  const { teams, workers, clients, user, addAppointment, updateAppointment, deleteAppointment } =
    useScheduling()

  const isEditMode = !!appointment

  // Form state
  const [formData, setFormData] = useState(
    isNewAppointment || !appointment
      ? {
          clientID: '',
          workerId: '',
          date: new Date(),
          startHour: 0,
          startMinute: 0,
          duration: 0,
          fahrzeit: 0,
          isDuration: false,
          isDriveTime: false,
        }
      : {
          clientID: appointment.clientID,
          workerId: appointment.workerId,
          date: new Date(appointment.date),
          startHour: appointment.isFixedTime ? new Date(appointment.startTime).getHours() : 0,
          startMinute: appointment.isFixedTime ? new Date(appointment.startTime).getMinutes() : 0,
          duration: appointment.duration,
          fahrzeit: appointment.fahrzeit,
          isDuration: appointment.duration > 0 ? true : false,
          isDriveTime: appointment.fahrzeit > 0 ? true : false,
        }
  )

  const [isDateInvalid, setIsDateInvalid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Calculate isFixedTime dynamically based on time
  /*
  const isFixedTime = useMemo(() => {
    return formData.startHour !== 0 || formData.startMinute !== 0
  }, [formData.startHour, formData.startMinute])
*/
  const [isFixedTime, setIsFixedTime] = useState(false)
  // Initialize form data when appointment or defaultDate changes
  /*
  useEffect(() => {
    if (appointment) {
      const startTime = new Date(appointment.startTime)
      setFormData({
        clientID: appointment.clientID,
        workerId: appointment.workerId,
        date: new Date(appointment.date),
        startHour: appointment.isFixedTime ? startTime.getHours() : 0,
        startMinute: appointment.isFixedTime ? startTime.getMinutes() : 0,
        duration: appointment.duration,
        fahrzeit: appointment.fahrzeit,
        isDuration: appointment.duration > 0 ? true : false,
        isDriveTime: appointment.fahrzeit > 0 ? true : false,
      })
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: new Date(selectedDate),
        startHour: 0,
        startMinute: 0,
      }))
    }
  }, [appointment, selectedDate])
*/
  // Calculate end time
  const endTime = useMemo(() => {
    const start = new Date(formData.date)
    start.setHours(formData.startHour, formData.startMinute, 0, 0)
    const end = new Date(start.getTime() + formData.duration * 60000)
    return end
  }, [formData.date, formData.startHour, formData.startMinute, formData.duration])

  // Get selected client and worker info
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
      isFixedTime,
      startTime,
      duration: formData.duration,
      endTime,
      fahrzeit: formData.fahrzeit,
      workerId: formData.workerId,
      worker: selectedWorker,
      client: selectedClient,
      reports: appointment?.reports || [],
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

  //console.log('Rendering AppointmentModal with formData:', formData, 'and errors:', errors)
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
              <div className="space-y-2 p-2">
                <ComboBox
                  isRequired
                  className="w-[256px]"
                  name="client"
                  selectedKey={formData.clientID}
                  onSelectionChange={key => {
                    setFormData(prev => ({ ...prev, clientID: key as string }))
                    setErrors(prev => ({ ...prev, clientID: '' }))
                  }}
                >
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Kunde
                  </Label>
                  <ComboBox.InputGroup>
                    <Input placeholder="Suche Kunde..." />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox>
                      <ListBox.Section>
                        <Header>Kunden</Header>
                        {clients.map(client => (
                          <ListBox.Item key={client.id} textValue={client.name} id={client.id}>
                            {client.surname} {client.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox.Section>
                    </ListBox>
                  </ComboBox.Popover>
                </ComboBox>
                {errors.clientID && <p className="text-xs text-danger">{errors.clientID}</p>}

                {/* Selected Client Info */}
                {selectedClient && (
                  <div className="pt-1 pb-2 bg-default-50 rounded-lg">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-default-500" />
                      <div>
                        <p className="text-xs text-default-500">
                          {selectedClient.street} {selectedClient.houseNumber}
                          <br />
                          {selectedClient.postalCode} {selectedClient.city}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Worker Selection */}
              <StaffSelect
                teams={teams}
                workers={workers}
                selectedWorkerId={formData.workerId}
                onSelectionChange={workerId => {
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

                      console.log(
                        'Selected date:',
                        newDate,
                        'Today:',
                        todayDate,
                        'Is invalid:',
                        newDate < todayDate
                      )
                      setFormData(prev => ({ ...prev, date: newDate }))
                    }}
                    minValue={today(getLocalTimeZone())}
                    isDisabled={readOnly}
                    //  className="max-w-[256px]"
                    showTime={isFixedTime}
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
                  isSelected={isFixedTime}
                  onChange={e => {
                    setIsFixedTime(e)
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
              {isFixedTime && false && (
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
