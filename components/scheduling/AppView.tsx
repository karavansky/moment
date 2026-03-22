import React, { memo, useCallback, useState, useRef } from 'react'
import ClientSelect from './ClientSelect'
import { Separator, RadioGroup, Radio, Label, Description, Chip, TextField, FieldError, Switch } from '@heroui/react'
import ServiceSelect from './ServiceSelect'
import RouteEditor from './RouteEditor'
import {
  Appointment,
  Client,
  Service,
  AppointmentType,
  RoutePoint,
  Worker,
} from '@/types/scheduling'
import type { ServicesForSelect, TeamsWithWorkers } from '@/contexts/SchedulingContext'
import type { ServiceTreeItem } from '@/types/scheduling'
import { useTranslation } from '../Providers'
import StaffSelect from './StaffSelect'
import { useAuth } from '@/components/AuthProvider'
import { parseDate, Time, today, getLocalTimeZone } from '@internationalized/date'
import DatePicker from '@/components/ui/DatePicker'
import { TimeField } from '@heroui/react'

interface AppViewProps {
  formData: Appointment
  setFormData: React.Dispatch<React.SetStateAction<Appointment>>
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  selectedDate?: Date
  groupedClients: any
  clients: Client[]
  servicesForSelect: ServicesForSelect
  services: ServiceTreeItem[]
  isNewAppointment: boolean
  appointment: Appointment | null
  viewTab: 'view' | 'report' | 'edit' | 'new' | 'notes'
  teamsWithWorkers: TeamsWithWorkers[]
  isReadOnly?: boolean
}

function AppView({
  formData,
  setFormData,
  errors,
  setErrors,
  selectedDate,
  groupedClients,
  clients,
  servicesForSelect,
  services,
  isNewAppointment,
  appointment,
  viewTab,
  teamsWithWorkers,
  isReadOnly = false,
}: AppViewProps) {
  const { t } = useTranslation()
  const { session } = useAuth()

  const [isDateInvalid, setIsDateInvalid] = useState(false)

  // Refs for TimeField to scroll into view on mobile
  const startTimeRef = useRef<HTMLDivElement>(null)
  const endTimeRef = useRef<HTMLDivElement>(null)

  // Scroll input into view when focused (important for mobile when keyboard opens)
  const handleTimeFieldFocus = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }, 300) // Delay to allow keyboard animation to complete
  }, [])

  const appointmentType: AppointmentType = (formData.type ?? 0) as AppointmentType
  const isTransportType = appointmentType === 1

  // Get locale from session country, fallback to 'de-DE'
  const locale = session?.user?.country
    ? `${session.user.country.toLowerCase()}-${session.user.country}`
    : 'de-DE'

  // Memoize the appointment type change handler
  const handleAppointmentTypeChange = useCallback(
    (value: string) => {
      const newType = parseInt(value) as AppointmentType
      setFormData(prev => ({
        ...prev,
        type: newType,
        // Очищаем services при переключении на транспорт
        services: newType === 1 ? [] : prev.services,
      }))
    },
    [setFormData, appointmentType]
  )

  return (
    <div>
      <div className="flex flex-row items-end justify-between gap-1 my-1">
        {appointment && (
          <p className="text-sm text-default-500">
            {t('appointment.edit.createdOn')}{' '}
            <Chip color="default" size="md" variant="primary">
              {(() => {
                // Use createdAt if available
                const created = appointment.createdAt
                  ? appointment.createdAt instanceof Date
                    ? appointment.createdAt
                    : new Date(appointment.createdAt)
                  : null

                if (created) {
                  return created.toLocaleString(locale, {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }

                // Fallback: combine date and startTime
                const date =
                  appointment.date instanceof Date ? appointment.date : new Date(appointment.date)
                const time =
                  appointment.startTime instanceof Date
                    ? appointment.startTime
                    : appointment.startTime
                      ? new Date(appointment.startTime)
                      : null

                if (time) {
                  const combined = new Date(date)
                  combined.setHours(time.getHours(), time.getMinutes())
                  return combined.toLocaleString(locale, {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }

                // Fallback to just date
                return date.toLocaleDateString(locale, {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit',
                })
              })()}
            </Chip>
          </p>
        )}
        <Chip color="success" size="md" variant="primary">
          <Chip.Label>Status</Chip.Label>
        </Chip>
      </div>

      {/* Appointment Type Selection - Only for new appointments */}
      {isNewAppointment && (
        <>
          <div className="mt-4">
            <RadioGroup
              value={String(appointmentType)}
              onChange={handleAppointmentTypeChange}
              orientation="horizontal"
              variant="secondary"
            >
              <Radio value="0">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <Label>Визит</Label>
                  <Description>Встреча с клиентом</Description>
                </Radio.Content>
              </Radio>
              <Radio value="1">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <Label>Поездка</Label>
                  <Description>Транспортная поездка</Description>
                </Radio.Content>
              </Radio>
            </RadioGroup>
          </div>

          <Separator className="mt-2" />
        </>
      )}

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
        isReadOnly={isReadOnly}
        isRequired={true}
        className="pt-2"
      />

      <Separator className="my-2" />

      {/* Services Selection - Only for Visit type */}
      {!isTransportType && (
        <>
          <ServiceSelect
            servicesForSelect={servicesForSelect}
            selectedServices={formData.services.map(s => s.id)}
            onSelectionChange={serviceIds => {
              if (process.env.NODE_ENV === 'development') {
                console.log('Selected service IDs:', serviceIds)
              }
              // Находим полные объекты Service по ID (исключая группы)
              const selectedServiceObjects = serviceIds
                .map(id => services.find(s => s.id === id))
                .filter((s): s is Service => s !== undefined && !s.isGroup)
              setFormData(prev => ({ ...prev, services: selectedServiceObjects }))
              setErrors(prev => ({ ...prev, services: '' }))
            }}
            error={errors.services}
            isReadOnly={isReadOnly}
            isRequired={true}
          />
          <Separator className="my-2" />
          {/* Worker Selection */}
          <StaffSelect
            teamsWithWorkers={teamsWithWorkers}
            selectedWorkerIds={formData.worker.map(w => w.id)}
            onSelectionChange={workerIds => {
              // Look up in prev.worker first — covers newly added workers not yet in context
              // Extract workers from teamsWithWorkers for lookup
              const allWorkers = teamsWithWorkers.flatMap(team => team.workers)
              setFormData(prev => {
                const selectedWorkers = workerIds
                  .map(
                    id => prev.worker.find(w => w.id === id) ?? allWorkers.find(w => w.id === id)
                  )
                  .filter((w): w is Worker => w !== undefined)
                return {
                  ...prev,
                  worker: selectedWorkers,
                }
              })
              setErrors(prev => ({ ...prev, workers: '' }))
            }}
            onWorkerCreated={newWorker => {
              // Добавляем напрямую — без поиска в контексте (контекст ещё не обновился)
              setFormData(prev => ({ ...prev, worker: [...prev.worker, newWorker] }))
              setErrors(prev => ({ ...prev, workers: '' }))
            }}
            error={errors.workers}
            isReadOnly={isReadOnly}
            isRequired={true}
          />

          {/* Date and Time Fields in one row */}
          <div className="flex items-center gap-4 w-full pt-2 ">
            {/* Date */}
            <TextField isRequired name="date" type="date" isInvalid={isDateInvalid} className="flex-1">
              <Label className="text-base font-medium flex items-center ">
                {t('appointment.edit.date')}
              </Label>
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
                isDisabled={isReadOnly}
                showTime={false}
              />
              <FieldError>{isDateInvalid ? t('appointment.edit.dateInPast') : null}</FieldError>
            </TextField>

            {/* von (Start Time) */}
            <div ref={startTimeRef} className="flex-1">
              <TimeField
                className="w-full"
                name="startTime"
                value={formData.startTime ? new Time(formData.startTime.getHours(), formData.startTime.getMinutes()) : null}
                onChange={time => {
                  if (time) {
                    // Create new Date with the selected time
                    const newStartTime = new Date(formData.date)
                    newStartTime.setHours(time.hour, time.minute, 0, 0)
                    setFormData(prev => ({ ...prev, startTime: newStartTime, isFixedTime: true }))
                  } else {
                    // Clear start time
                    setFormData(prev => ({ ...prev, startTime: undefined, endTime: undefined, isFixedTime: false }))
                  }
                }}
                isDisabled={isReadOnly}
                hourCycle={24}
              >
                <Label>von</Label>
                <TimeField.Group onFocus={() => handleTimeFieldFocus(startTimeRef)}>
                  <TimeField.Input>{segment => <TimeField.Segment segment={segment} />}</TimeField.Input>
                </TimeField.Group>
              </TimeField>
            </div>

            {/* bis (End Time) */}
            <div ref={endTimeRef} className="flex-1">
              <TimeField
                className="w-full"
                name="endTime"
                value={formData.endTime ? new Time(formData.endTime.getHours(), formData.endTime.getMinutes()) : null}
                onChange={time => {
                  if (time && formData.startTime) {
                    // Create new Date with the selected time
                    const newEndTime = new Date(formData.date)
                    newEndTime.setHours(time.hour, time.minute, 0, 0)
                    setFormData(prev => ({ ...prev, endTime: newEndTime }))
                  } else {
                    // Clear end time
                    setFormData(prev => ({ ...prev, endTime: undefined }))
                  }
                }}
                isDisabled={isReadOnly || !formData.startTime}
                hourCycle={24}
              >
                <Label>bis</Label>
                <TimeField.Group onFocus={() => handleTimeFieldFocus(endTimeRef)}>
                  <TimeField.Input>{segment => <TimeField.Segment segment={segment} />}</TimeField.Input>
                </TimeField.Group>
              </TimeField>
            </div>
          </div>
        </>
      )}

      {/* Route Editor - Only for Transport type */}
      {isTransportType && (
        <>
          <div className="text-sm font-medium mb-2">Маршрут поездки</div>
          <RouteEditor
            points={formData.routes || []}
            onChange={(newRoutes: RoutePoint[]) => {
              setFormData(prev => ({ ...prev, routes: newRoutes }))
              setErrors(prev => ({ ...prev, routes: '' }))
            }}
            error={errors.routes}
            isReadOnly={isReadOnly}
          />
          <Separator className="my-2" />
        </>
      )}
    </div>
  )
}

export default memo(AppView)
