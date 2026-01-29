'use client'

import React, { useCallback, useRef, memo } from 'react'
import { Autocomplete, Button, EmptyState, Header, Label, ListBox, SearchField, Separator, Tag, TagGroup, useFilter } from '@heroui/react'
import { Plus, X, User, Users } from 'lucide-react'
import { Team, Worker } from '@/types/scheduling'
import { usePlatformContext } from '@/contexts/PlatformContext'

interface WorkerOption {
  id: string
  name: string // "Müller Max"
  fullPath: string // "Müller Max - Team Alpha"
}

interface TeamsWithWorkers {
  team: Team
  workers: Worker[]
}

interface StaffSelectProps {
  teamsWithWorkers: TeamsWithWorkers[]
  selectedWorkerIds: string[]
  onSelectionChange: (workerIds: string[]) => void
  error?: string
  className?: string
}

function StaffSelect({
  teamsWithWorkers,
  selectedWorkerIds,
  onSelectionChange,
  error,
  className,
}: StaffSelectProps) {
  const { isMobile, isReady } = usePlatformContext()
  const selectRef = useRef<HTMLSelectElement>(null)
  const { contains } = useFilter({ sensitivity: 'base' })

  // Собираем всех workers в один массив с информацией о команде
  const allWorkers = React.useMemo(() => {
    const result: WorkerOption[] = []
    for (const { team, workers } of teamsWithWorkers) {
      for (const worker of workers) {
        result.push({
          id: worker.id,
          name: `${worker.surname} ${worker.name}`,
          fullPath: `${worker.surname} ${worker.name} - ${team.teamName}`,
        })
      }
    }
    return result
  }, [teamsWithWorkers])

  // Получаем объекты выбранных workers для отображения чипов
  const selectedWorkerObjects = React.useMemo(
    () =>
      selectedWorkerIds
        .map(id => allWorkers.find(w => w.id === id))
        .filter(Boolean) as WorkerOption[],
    [selectedWorkerIds, allWorkers]
  )

  // Удаление одного worker из выбранных
  const handleRemoveWorker = useCallback(
    (idToRemove: string) => {
      onSelectionChange(selectedWorkerIds.filter(id => id !== idToRemove))
    },
    [selectedWorkerIds, onSelectionChange]
  )

  // Обработчик для mobile select
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedOptions = Array.from(e.target.selectedOptions)
      const selectedIds = selectedOptions.map(option => option.value)

      if (process.env.NODE_ENV === 'development') {
        console.log('Selected worker IDs:', selectedIds)
      }

      onSelectionChange(selectedIds)
    },
    [onSelectionChange]
  )

  // Обработчик для desktop
  const handleDesktopChange = useCallback(
    (keys: React.Key | React.Key[] | null) => {
      if (!keys) {
        onSelectionChange([])
        return
      }
      const keysArray = Array.isArray(keys) ? keys : [keys]
      onSelectionChange(keysArray.map(k => String(k)))
    },
    [onSelectionChange]
  )

  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (process.env.NODE_ENV === 'development') {
    console.log('Selected worker IDs:', selectedWorkerIds)
  }

  if (isReady && isMobile) {
    return (
      <div className="w-full min-w-0">
        <Label className="text-base font-normal">Fachkräfte</Label>

        {/* Чипы с выбранными workers */}
        {selectedWorkerObjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {selectedWorkerObjects.map(({ id, fullPath }) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
              >
                {fullPath}
                <button
                  type="button"
                  onClick={() => handleRemoveWorker(id)}
                  className="p-0.5 hover:bg-primary-200 rounded-full"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 w-full">
          {/* Скрытый нативный select для iOS/Android */}
          <div className="relative flex-1">
            <select
              ref={selectRef}
              name="staff"
              onChange={handleMobileChange}
              multiple
              value={selectedWorkerIds}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {teamsWithWorkers.map(({ team, workers: teamWorkers }) => (
                <optgroup key={team.id} label={team.teamName}>
                  {teamWorkers.map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.surname} {worker.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {/* Видимая кнопка */}
            <Button variant="secondary" size="sm" className="w-full pointer-events-none">
              <Plus size={16} />
              Fachkraft hinzufügen
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    )
  }

  // --- RENDER FOR DESKTOP ---
  return (
    <div className="space-y-2 p-2">
      <Autocomplete
        isRequired
        fullWidth
        name="worker"
        value={selectedWorkerIds || null}
        onChange={handleDesktopChange}
        placeholder="Fachkraft auswählen..."
        selectionMode="multiple"

      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="w-6 h-6" />
          Fachkraft
        </Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value>
            {({ defaultChildren, isPlaceholder, state }: any) => {
              if (isPlaceholder || state.selectedItems.length === 0) {
                return defaultChildren
              }

              return (
                <TagGroup
                  size="lg"
                  onRemove={(keys: Set<React.Key>) => {
                    const newSelection = selectedWorkerIds.filter(id => !keys.has(id))
                    onSelectionChange(newSelection)
                  }}
                >
                  <TagGroup.List>
                    {state.selectedItems.map((item: any) => {
                      const worker = allWorkers.find(w => w.id === item.key)
                      return (
                        <Tag key={item.key} id={item.key} className="font-normal">
                          {worker?.fullPath || item.textValue}
                        </Tag>
                      )
                    })}
                  </TagGroup.List>
                </TagGroup>
              )
            }}
          </Autocomplete.Value>
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Suche Fachkraft..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>Keine Ergebnisse</EmptyState>}>
              {teamsWithWorkers.map(({ team, workers: teamWorkers }, index) => (
                <React.Fragment key={team.id}>
                  <ListBox.Section>
                    <Header>{team.teamName}</Header>
                    {teamWorkers.map(worker => (
                      <ListBox.Item
                        key={worker.id}
                        textValue={`${worker.surname} ${worker.name}`}
                        id={worker.id}
                      >
                        {worker.surname} {worker.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox.Section>
                  {index < teamsWithWorkers.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default memo(StaffSelect)
