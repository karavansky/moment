'use client'

import React, { memo } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { Worker } from '@/types/scheduling'
import { WorkerAdress } from './WorkerAdress'
import { WorkerContacts } from './WorkerContacts'
import { WorkerTechStatus } from './WorkerTechStatus'

interface WorkerOverviewProps {
  worker: Worker
  isCreateNew?: boolean
  className?: string
}

function WorkerOverview({ worker, isCreateNew = false, className }: WorkerOverviewProps) {
  const { workers, teams, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const lang = useLanguage()

  return (
    <div className={`flex flex-col gap-4 h-full overflow-y-auto ${className || ''}`}>
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="w-full flex mt-0 flex-col gap-4">
          <WorkerContacts worker={worker} isCreateNew={isCreateNew} />
          <WorkerTechStatus worker={worker} isCreateNew={isCreateNew} />
        </div>
        <div className="w-full">
          <WorkerAdress key={worker.id} worker={worker} isCreateNew={isCreateNew} />
        </div>
      </div>
    </div>
  )
}

export default memo(WorkerOverview)
