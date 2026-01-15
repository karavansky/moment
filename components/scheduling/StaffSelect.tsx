'use client'

import React, { useMemo, useCallback } from 'react'
import { ComboBox, Header, Input, Label, ListBox, Separator, TextField } from '@heroui/react'
import { User } from 'lucide-react'
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

  // Мемоизация группировки workers по teams - избегаем повторной фильтрации при каждом рендере
  const teamsWithWorkers = useMemo(() => {
    return teams
      .map(team => ({
        team,
        workers: workers
          .filter(w => w.teamId === team.id)
          .sort((a, b) =>
            a.workerName.localeCompare(b.workerName, undefined, {
              sensitivity: 'base', // Игнорирует разницу между 'а' и 'А'
              numeric: true, // Правильно сортирует числа в именах (например, "Рабочий 2" перед "Рабочий 10")
            })
          ),
      }))
      .filter(({ workers }) => workers.length > 0)
  }, [teams, workers])

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
  //  if (isReady && isMobile) {
  console.log("Selected worker ID:", selectedWorkerId)
  if (true) {
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
