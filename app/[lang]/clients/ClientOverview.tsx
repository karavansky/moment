'use client'

import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { Button, Card, Separator } from '@heroui/react'
import { FilePenLine, Undo2, UserStar, History } from 'lucide-react'
import { useState, useTransition } from 'react'
import { ClientAdress } from './ClientAdress'
import { ClientContacts } from './ClientContacts'

interface ClientOverviewProps {
  client: Client
  className?: string
}

export default function ClientOverview({ client, className }: ClientOverviewProps) {
  const { clients, groups, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const lang = useLanguage()
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [isPending, startTransition] = useTransition()

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start justify-items-center md:justify-items-stretch">
        <ClientContacts client={client} />
        <ClientAdress client={client} />
      </div>
    </div>
  )
}
