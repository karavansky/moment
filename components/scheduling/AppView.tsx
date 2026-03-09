import React, { memo } from 'react'
import ClientSelect from './ClientSelect'
import { Separator } from '@heroui/react'
import ServiceSelect from './ServiceSelect'
import RouteEditor from './RouteEditor'
import { Appointment, Client, Service, AppointmentType, RoutePoint } from '@/types/scheduling'
import type { ServicesForSelect } from '@/contexts/SchedulingContext'
import type { ServiceTreeItem } from '@/types/scheduling'
import { useTranslation } from '../Providers'

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
}: AppViewProps) {
  const { t } = useTranslation()

  const appointmentType: AppointmentType = (formData.type ?? 0) as AppointmentType
  const isTransportType = appointmentType === 1

  return (
    <div>
      <div className="flex flex-row items-center justify-between gap-1">
        <h2 className="text-xl font-bold">
          {viewTab === 'view'
            ? t('appointment.edit.viewTitle')
            : viewTab === 'edit'
              ? t('appointment.edit.editTitle')
              : t('appointment.edit.newTitle')}
        </h2>
        {appointment && (
          <p className="text-sm text-default-500">
            {t('appointment.edit.createdOn')}{' '}
            {appointment.date instanceof Date
              ? appointment.date.toLocaleDateString('de-DE')
              : new Date(appointment.date).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>

      {/* Appointment Type Selection */}
      <div className="mt-4">
        <label className="text-sm font-medium mb-2 block">Тип записи</label>
        <div className="flex gap-6">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="appointmentType"
              value="0"
              checked={appointmentType === 0}
              onChange={(e) => {
                const newType = parseInt(e.target.value) as AppointmentType
                setFormData(prev => ({
                  ...prev,
                  type: newType,
                  services: prev.services // Сохраняем services для визита
                }))
              }}
              className="mt-1"
            />
            <div className="flex flex-col">
              <span className="font-medium text-sm">Визит</span>
              <span className="text-xs text-default-400">Встреча с клиентом</span>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="appointmentType"
              value="1"
              checked={appointmentType === 1}
              onChange={(e) => {
                const newType = parseInt(e.target.value) as AppointmentType
                setFormData(prev => ({
                  ...prev,
                  type: newType,
                  // Очищаем services при переключении на транспорт
                  services: []
                }))
              }}
              className="mt-1"
            />
            <div className="flex flex-col">
              <span className="font-medium text-sm">Поездка</span>
              <span className="text-xs text-default-400">Транспортная поездка</span>
            </div>
          </label>
        </div>
      </div>

      <Separator className="my-4" />

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
          />
          <Separator className="my-2" />
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
          />
          <Separator className="my-2" />
        </>
      )}
    </div>
  )
}

export default memo(AppView)
