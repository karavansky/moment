'use client'

import React, { useCallback, memo, useState } from 'react'
import { Autocomplete, Button, EmptyState, Header, Label, ListBox, SearchField, Separator, Tag, TagGroup, useFilter } from '@heroui/react'
import { Check, Plus, X, Users } from 'lucide-react'
import { Team, Worker } from '@/types/scheduling'
import { usePlatformContext } from '@/contexts/PlatformContext'
import { useTranslation } from '@/components/Providers'
import { useAuth } from '@/components/AuthProvider'
import StaffAdd from './StaffAdd'

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
  onWorkerCreated?: (worker: Worker) => void
  error?: string
  className?: string
}

function StaffSelect({
  teamsWithWorkers,
  selectedWorkerIds,
  onSelectionChange,
  onWorkerCreated,
  error,
  className,
}: StaffSelectProps) {
  const { isMobile, isReady, isIOS } = usePlatformContext()
  const { t } = useTranslation()
  const { contains } = useFilter({ sensitivity: 'base' })
  const { session } = useAuth()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [pendingWorkerOptions, setPendingWorkerOptions] = useState<WorkerOption[]>([])

  const handleAddWorker = useCallback(() => {
    if (!session?.user.firmaID) return
    setIsAddOpen(true)
  }, [session])

  const handleWorkerAdded = useCallback(
    (worker: Worker) => {
      // Cache display info locally — teamsWithWorkers may not yet include this worker
      setPendingWorkerOptions(prev => [
        ...prev,
        {
          id: worker.id,
          name: `${worker.surname} ${worker.name}`,
          fullPath: `${worker.surname} ${worker.name}`,
        },
      ])
      // Update selection directly
      onSelectionChange([...selectedWorkerIds, worker.id])
      // Also pass full Worker object to parent so formData.workers stays correct
      onWorkerCreated?.(worker)
    },
    [onWorkerCreated, onSelectionChange, selectedWorkerIds]
  )

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
  // pendingWorkerOptions used as fallback for workers not yet in context (async addWorker)
  const selectedWorkerObjects = React.useMemo(
    () =>
      selectedWorkerIds
        .map(id => allWorkers.find(w => w.id === id) ?? pendingWorkerOptions.find(w => w.id === id))
        .filter(Boolean) as WorkerOption[],
    [selectedWorkerIds, allWorkers, pendingWorkerOptions]
  )

  // Удаление одного worker из выбранных
  const handleRemoveWorker = useCallback(
    (idToRemove: string) => {
      onSelectionChange(selectedWorkerIds.filter(id => id !== idToRemove))
    },
    [selectedWorkerIds, onSelectionChange]
  )

  // Обработчик для iOS select
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedOptions = Array.from(e.target.selectedOptions)
      const selectedIds = selectedOptions.map(option => option.value)
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

  // --- RENDER FOR iOS ONLY ---
  if (isReady && isMobile && isIOS) {
    return (
      <div className="w-full min-w-0">
        <Label className="text-base font-normal flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t('appointment.edit.staff.labelPlural')}</Label>

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
          {/* Скрытый нативный select для iOS */}
          <div className="relative flex-1">
            <select
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
              {t('appointment.edit.staff.addStaff')}
            </Button>
          </div>
          <Button variant="primary" size="sm" isIconOnly onPress={handleAddWorker}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
        <StaffAdd
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onWorkerAdded={handleWorkerAdded}
        />
      </div>
    )
  }

  // --- RENDER FOR DESKTOP & ANDROID ---
  return (
    <div className="space-y-2">
      {/* Label row with "+" button — outside Autocomplete to avoid popover z-order issues */}
      <div className="flex flex-row w-full gap-2">
        <Label className="text-base font-normal flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t('appointment.edit.staff.label')}
        </Label>
        <div className="ml-auto">
          <Button variant="primary" size="sm" isIconOnly onPress={handleAddWorker}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Autocomplete
        isRequired
        fullWidth
        name="worker"
        aria-label={t('appointment.edit.staff.label')}
        value={selectedWorkerIds || null}
        onChange={handleDesktopChange}
        placeholder={t('appointment.edit.staff.selectPlaceholder')}
        selectionMode="multiple"
      >
        <Autocomplete.Trigger>
          <Autocomplete.Value>
            {({ defaultChildren }: any) => {
              // Рендерим из внешнего состояния (selectedWorkerObjects), а не из
              // внутреннего state.selectedItems — иначе программно добавленные
              // работники не отображаются (Autocomplete не обновляет свой
              // internal state при изменении value-пропа извне)
              if (selectedWorkerObjects.length === 0) {
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
                    {selectedWorkerObjects.map(({ id, fullPath }) => (
                      <Tag key={id} id={id} className="font-normal">
                        {fullPath}
                      </Tag>
                    ))}
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
                <SearchField.Input placeholder={t('appointment.edit.staff.searchPlaceholder')} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>{t('appointment.edit.staff.noResults')}</EmptyState>}>
              {teamsWithWorkers.flatMap(({ team, workers: teamWorkers }, index) => [
                <ListBox.Section key={team.id}>
                  <Header>{team.teamName}</Header>
                  {teamWorkers.map(worker => (
                    <ListBox.Item
                      key={worker.id}
                      textValue={`${worker.surname} ${worker.name}`}
                      id={worker.id}
                    >
                      {worker.surname} {worker.name}
                      {selectedWorkerIds.includes(worker.id)
                        ? <Check className="w-4 h-4 shrink-0" />
                        : <ListBox.ItemIndicator />}
                    </ListBox.Item>
                  ))}
                </ListBox.Section>,
                ...(index < teamsWithWorkers.length - 1 ? [<Separator key={`sep-${team.id}`} />] : []),
              ])}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      {error && <p className="text-xs text-danger">{error}</p>}
      <StaffAdd
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onWorkerAdded={handleWorkerAdded}
      />
    </div>
  )
}

export default memo(StaffSelect)
