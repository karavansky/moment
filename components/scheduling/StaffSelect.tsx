'use client'

import React, { useCallback, memo } from 'react'
import { ComboBox, Header, Input, Label, ListBox, Separator, TextField } from '@heroui/react'
import { User } from 'lucide-react'
import { Team, Worker } from '@/types/scheduling'
import { usePlatform } from '@/hooks/usePlatform'

interface TeamsWithWorkers {
  team: Team
  workers: Worker[]
}

interface StaffSelectProps {
  teamsWithWorkers: TeamsWithWorkers[]
  selectedWorkerId: string
  onSelectionChange: (workerId: string) => void
  error?: string
  className?: string
}

function StaffSelect({
  teamsWithWorkers,
  selectedWorkerId,
  onSelectionChange,
  error,
  className,
}: StaffSelectProps) {
  const { isMobile, isReady } = usePlatform()

  // Мемоизация обработчиков
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSelectionChange(e.target.value)
    },
    [onSelectionChange]
  )

  const handleDesktopChange = useCallback(
    (key: React.Key | null) => {
      if (key) onSelectionChange(key as string)
    },
    [onSelectionChange]
  )

  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (process.env.NODE_ENV === 'development') {
    console.log("Selected worker ID:", selectedWorkerId)
  }
  if (isReady && isMobile) {
    return (
      <TextField className="w-1/2 min-w-0 " isRequired>
        <Label className="text-base font-normal ">Fachkraft</Label>
        <div
          className="relative surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl w-full focus-within:outline-none focus-within:ring-0"
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <select
            name="staff"
            value={selectedWorkerId}
            onChange={handleMobileChange}
            className="w-full h-full px-2 py-0 text-lg font-normal md:text-base border-0 border-transparent outline-none cursor-pointer bg-transparent appearance-none text-foreground"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              minHeight: '100%',
              lineHeight: 'normal',
              outline: 'none',
              boxShadow: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            required
          >
            {teamsWithWorkers.map(({ team, workers: teamWorkers }) => (
              <React.Fragment key={team.id}>
                <option value={team.teamName} disabled>
                  {'👥 ' + team.teamName + ' 👥'}
                </option>
                {teamWorkers.map(worker => (
                  <option key={worker.id} value={worker.id} >
                    {worker.workerName}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </select>
          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-default-500 pointer-events-none z-0" />
        </div>
      </TextField>
    )
  }

  // --- RENDER FOR DESKTOP ---
  return (
    <div className="space-y-2 p-2">
      <ComboBox
        isRequired
        className="w-[256px]"
        name="worker"
        selectedKey={selectedWorkerId}
        onSelectionChange={handleDesktopChange}
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          Fachkraft
        </Label>
        <ComboBox.InputGroup>
          <Input placeholder="Suche Fachkraft..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {teamsWithWorkers.map(({ team, workers: teamWorkers }, index) => (
              <React.Fragment key={team.id}>
                <ListBox.Section>
                  <Header>{team.teamName}</Header>
                  {teamWorkers.map(worker => (
                    <ListBox.Item key={worker.id} textValue={worker.workerName} id={worker.id}>
                      {worker.workerName}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
                {index < teamsWithWorkers.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default memo(StaffSelect)
