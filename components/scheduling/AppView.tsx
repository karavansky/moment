import React, { memo } from 'react'
import ClientSelect from './ClientSelect'
import { Separator } from '@heroui/react'
import ServiceSelect from './ServiceSelect'
import { Appointment, Client, Service } from '@/types/scheduling'
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
            {t('appointment.edit.createdOn')} {appointment.date.toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
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
      {/* Services Selection */}
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
      <Separator className="my-2" />{' '}
    </div>
  )
}

export default memo(AppView)
