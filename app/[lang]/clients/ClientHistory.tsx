'use client'

import React, { memo, useState, useTransition } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Client } from '@/types/scheduling'
import { Button, Separator } from '@heroui/react'
import { FilePenLine, Undo2, UserStar, History } from 'lucide-react'

interface ClientHistoryProps {
  client: Client
  className?: string
}

function ClientHistory({ client, className }: ClientHistoryProps) {
  const { clients, groups, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const lang = useLanguage()
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [isPending, startTransition] = useTransition()

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>
      <div className="flex items-center pl-2 gap-2">
        <h2 className="text-2xl font-semibold">History</h2>
      </div>
    </div>
  )
}

export default memo(ClientHistory)
