'use client'

import React, { useCallback, useRef, memo } from 'react'
import {
  Autocomplete,
  Button,
  EmptyState,
  Header,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from '@heroui/react'
import { User, X } from 'lucide-react'
import { usePlatformContext } from '@/contexts/PlatformContext'

export interface WorkerOption {
  id: string
  name: string
  surname: string
  fullName: string
  teamName?: string
}

export interface WorkerGroupForSelect {
  id: string
  label: string // Team name
  options: WorkerOption[]
}

export interface WorkersForSelect {
  rootWorkers: WorkerOption[] // Workers without team
  groups: WorkerGroupForSelect[] // Workers grouped by team
}

interface WorkerSelectProps {
  workersForSelect: WorkersForSelect
  selectedWorkerID: string | null
  onSelectionChange: (workerID: string | null) => void
  error?: string
  className?: string
  label?: string
  placeholder?: string
  clearable?: boolean
}

function WorkerSelect({
  workersForSelect,
  selectedWorkerID,
  onSelectionChange,
  error,
  className,
  label = 'Водитель',
  placeholder = 'Выберите водителя',
  clearable = true,
}: WorkerSelectProps) {
  const { isMobile, isReady, isIOS } = usePlatformContext()
  const selectRef = useRef<HTMLSelectElement>(null)
  const { contains } = useFilter({ sensitivity: 'base' })

  // Собираем всех работников в один массив
  const allWorkers = React.useMemo(
    () => [...workersForSelect.rootWorkers, ...workersForSelect.groups.flatMap(g => g.options)],
    [workersForSelect]
  )

  // Находим выбранного работника
  const selectedWorker = React.useMemo(
    () => (selectedWorkerID ? allWorkers.find(w => w.id === selectedWorkerID) : null),
    [selectedWorkerID, allWorkers]
  )

  // Mobile handler
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      onSelectionChange(value || null)
    },
    [onSelectionChange]
  )

  // Desktop handler
  const handleDesktopChange = useCallback(
    (key: React.Key | null) => {
      onSelectionChange(key ? String(key) : null)
    },
    [onSelectionChange]
  )

  // Clear handler
  const handleClear = useCallback(() => {
    onSelectionChange(null)
  }, [onSelectionChange])

  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (isReady && isMobile && isIOS) {
    return (
      <div className={`w-full min-w-0 ${className || ''}`}>
        <Label className="text-base font-normal flex items-center gap-2">
          <User className="w-6 h-6" />
          {label}
        </Label>

        {/* Selected worker display */}
        {selectedWorker && (
          <div className="flex items-center gap-2 mt-2 mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm flex-1">
              {selectedWorker.fullName}
              {selectedWorker.teamName && (
                <span className="text-xs text-primary-500 ml-1">({selectedWorker.teamName})</span>
              )}
            </span>
            {clearable && (
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                onPress={handleClear}
                className="shrink-0"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 w-full">
          {/* Native select for iOS/Android */}
          <div className="relative flex-1">
            <select
              ref={selectRef}
              name="worker"
              onChange={handleMobileChange}
              value={selectedWorkerID || ''}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">{placeholder}</option>
              {/* Root workers without team */}
              {workersForSelect.rootWorkers.map(({ id, fullName }) => (
                <option key={id} value={id}>
                  {fullName}
                </option>
              ))}
              {/* Teams with workers */}
              {workersForSelect.groups.map(({ id, label, options }) => (
                <optgroup key={id} label={label}>
                  {options.map(({ id: optionId, fullName }) => (
                    <option key={optionId} value={optionId}>
                      {fullName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {/* Visible button */}
            <Button variant="secondary" size="sm" className="w-full pointer-events-none">
              <User size={16} />
              {selectedWorker ? selectedWorker.fullName : placeholder}
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    )
  }

  // --- RENDER FOR DESKTOP ---
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Autocomplete
        fullWidth
        name="worker"
        value={selectedWorkerID}
        onChange={handleDesktopChange}
        placeholder={placeholder}
        selectionMode="single"
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <User className="w-6 h-6" />
          {label}
        </Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value>
            {({ defaultChildren, isPlaceholder }: any) => {
              if (isPlaceholder || !selectedWorker) {
                return defaultChildren
              }

              return (
                <div className="flex items-center gap-2">
                  <span>{selectedWorker.fullName}</span>
                  {selectedWorker.teamName && (
                    <span className="text-xs text-default-400">({selectedWorker.teamName})</span>
                  )}
                </div>
              )
            }}
          </Autocomplete.Value>
          {clearable && <Autocomplete.ClearButton />}
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover className="w-full max-w-sm">
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Поиск водителя..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>Водители не найдены</EmptyState>}>
              {/* Root workers */}
              {workersForSelect.rootWorkers.length > 0 && (
                <ListBox.Section>
                  {workersForSelect.rootWorkers.map(({ id, fullName }) => (
                    <ListBox.Item key={id} textValue={fullName} id={id}>
                      {fullName}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              )}
              {/* Teams with workers */}
              {workersForSelect.groups.map(({ id, label, options }) => (
                <ListBox.Section key={id}>
                  <Header>{label}</Header>
                  {options.map(({ id: optionId, fullName }) => (
                    <ListBox.Item key={optionId} textValue={fullName} id={optionId}>
                      {fullName}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default memo(WorkerSelect)
