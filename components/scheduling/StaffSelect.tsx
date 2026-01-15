'use client'

import React from 'react'
import { ComboBox, Header, Input, Label, ListBox, Separator, TextField } from '@heroui/react'
import { User, Users } from 'lucide-react'
import { Team, Worker } from '@/types/scheduling'
import { usePlatform } from '@/hooks/usePlatform'

interface StaffSelectProps {
  teams: Team[]
  workers: Worker[]
  selectedWorkerId: string
  onSelectionChange: (workerId: string) => void
  error?: string
  className?: string
}

export default function StaffSelect({
  teams,
  workers,
  selectedWorkerId,
  onSelectionChange,
  error,
  className,
}: StaffSelectProps) {
  const { isMobile, isReady } = usePlatform()

  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (isReady && isMobile) {
    return (
      <TextField className="w-1/2 min-w-0 " isRequired>
        <Label className="text-base font-normal ">Land</Label>
        <div
          className="relative surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl w-full focus-within:outline-none focus-within:ring-0"
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <select
            name="staff"
            value={selectedWorkerId}
            onChange={e => {
              const workerId = e.target.value
              console.log('Selected workerId (mobile):', workerId)
              onSelectionChange(workerId)
            }}
            className="w-full px-2 py-0 text-lg font-normal md:text-base border-0 border-transparent outline-none cursor-pointer bg-transparent"
            required
          >
            {teams.map((team, index) => {
              const teamWorkers = workers.filter(w => w.teamId === team.id)
              if (teamWorkers.length === 0) return null
              return (
                <React.Fragment key={team.id}>
                  <option key={team.id} value={team.teamName} disabled>
                    {"👥 " + team.teamName + " 👥"}
                  </option>
                  {teamWorkers.map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.workerName}
                    </option>
                  ))}
                </React.Fragment>
              )
            })}
          </select>
          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-default-500 pointer-events-none z-0" />
        </div>
      </TextField>
    )
  }

  /*
          <input
            type={showTime ? 'datetime-local' : 'date'}
            value={getNativeValue()}
            onChange={handleNativeChange}
            min={getNativeConstraint(minValue)}
            max={getNativeConstraint(maxValue)}
            disabled={isDisabled}
            className="h-full w-full bg-transparent border-none outline-none text-foreground text-lg md:text-base ring-0 appearance-none pl-4 pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden z-10 relative focus:outline-none focus:ring-0 focus:border-none"
            style={{
              // Ensure consistent height and appearance on iOS
              WebkitAppearance: 'none',
              minHeight: '100%',
              lineHeight: 'normal',
              outline: 'none',
              boxShadow: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
  */
  return (
    <div className="space-y-2 p-2">
      <ComboBox
        isRequired
        className="w-[256px]"
        name="worker"
        selectedKey={selectedWorkerId}
        onSelectionChange={key => onSelectionChange(key as string)}
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
            {teams.map((team, index) => {
              const teamWorkers = workers.filter(w => w.teamId === team.id)
              if (teamWorkers.length === 0) return null

              return (
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
                  {index < teams.length - 1 && <Separator />}
                </React.Fragment>
              )
            })}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
