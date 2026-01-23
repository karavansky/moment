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
    <div className={`flex flex-col gap-4 h-full overflow-y-auto ${className || ''}`}>
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
        <div className="w-full">
          <ClientContacts client={client} isCreateNew={isCreateNew} />
        </div>
        <div className="w-full">
          <ClientAdress key={client.id} client={client} isCreateNew={isCreateNew} />
        </div>
      </div>
    </div>
  )
}

export default memo(ClientOverview)
