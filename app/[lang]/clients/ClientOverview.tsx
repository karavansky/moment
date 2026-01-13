'use client'

import React, { memo } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { ClientAdress } from './ClientAdress'
import { ClientContacts } from './ClientContacts'

interface ClientOverviewProps {
  client: Client
  isCreateNew?: boolean
  className?: string
}

function ClientOverview({ client, isCreateNew = false, className }: ClientOverviewProps) {
  const { clients, groups, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const lang = useLanguage()

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start justify-items-center md:justify-items-stretch">
        <ClientContacts client={client} isCreateNew={isCreateNew} />
        <ClientAdress key={client.id} client={client} isCreateNew={isCreateNew} />
      </div>
    </div>
  )
}

export default memo(ClientOverview)
