import React, { memo, useCallback } from 'react'
import ClientSelect from './ClientSelect'
import { Separator, RadioGroup, Radio, Label, Description, Chip } from '@heroui/react'
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

          {/* Date */}
          <div className="flex items-center justify-between flex-row gap-2 w-full">
            <TextField isRequired name="date" type="date" isInvalid={isDateInvalid}>
              <Label className="text-base font-medium flex items-center gap-2">
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
                isDisabled={readOnly}
                //  className="max-w-[256px]"
                showTime={false}
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
              <FieldError>{isDateInvalid ? t('appointment.edit.dateInPast') : null}</FieldError>
            </TextField>
            {/* Time picker with Switch overlay trick for iOS */}
            <div className="relative">
              {/* Hidden time input - always rendered, receives clicks when Switch is disabled */}
              <input
                ref={timeInputRef}
                type="time"
                value={`${String(formData.startHour).padStart(2, '0')}:${String(formData.startMinute).padStart(2, '0')}`}
                onChange={e => {
                  const [hours, minutes] = e.target.value.split(':').map(Number)
                  setFormData(prev => ({
                    ...prev,
                    startHour: hours || 0,
                    startMinute: minutes || 0,
                    isFixedTime: true, // Auto-enable when time is selected
                  }))
                }}
                disabled={readOnly}
                className={`absolute inset-0 w-full h-full ${formData.isFixedTime ? 'opacity-0 pointer-events-none' : 'opacity-0 cursor-pointer'}`}
              />
              {/* Visible Switch - pointer-events-none when isFixedTime is false */}
              <Switch
                size="lg"
                isSelected={formData.isFixedTime}
                onChange={value => {
                  setFormData(prev => ({
                    ...prev,
                    isFixedTime: value,
                    // Reset time when disabled
                    ...(value ? {} : { startHour: 0, startMinute: 0 }),
                  }))
                }}
                className={formData.isFixedTime ? '' : 'pointer-events-none'}
              >
                <Label className="text-sm">{t('appointment.edit.fixedTime')}</Label>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
            {/* Visible time display when enabled */}
            {formData.isFixedTime && (
              <input
                type="time"
                value={`${String(formData.startHour).padStart(2, '0')}:${String(formData.startMinute).padStart(2, '0')}`}
                onChange={e => {
                  const [hours, minutes] = e.target.value.split(':').map(Number)
                  setFormData(prev => ({
                    ...prev,
                    startHour: hours || 0,
                    startMinute: minutes || 0,
                  }))
                }}
                disabled={readOnly}
                className="px-3 py-2 border border-divider rounded-lg bg-default-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
              />
            )}
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
