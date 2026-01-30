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
  Tag,
  TagGroup,
  useFilter,
} from '@heroui/react'
import { Plus, X, HandHeart } from 'lucide-react'
import { usePlatformContext } from '@/contexts/PlatformContext'

interface ServiceOption {
  id: string
  name: string // Название с duration и price: "Ganzkörperwäsche, 30 Min, 25€"
  fullPath: string // Полный путь для чипов: "Ganzkörperwäsche - Körperpflege - Grundpflege"
}

interface ServiceGroupForSelect {
  id: string
  label: string
  options: ServiceOption[]
}

interface ServicesForSelect {
  rootServices: ServiceOption[]
  groups: ServiceGroupForSelect[]
}

interface ServiceSelectProps {
  servicesForSelect: ServicesForSelect
  selectedServices: string[]
  onSelectionChange: (serviceIds: string[]) => void
  error?: string
  className?: string
}

function ServiceSelect({
  servicesForSelect,
  selectedServices,
  onSelectionChange,
  error,
  className,
}: ServiceSelectProps) {
  const { isMobile, isReady } = usePlatformContext()
  const selectRef = useRef<HTMLSelectElement>(null)
  const { contains } = useFilter({ sensitivity: 'base' })

  // Собираем все сервисы в один массив для поиска по ID
  const allServices = React.useMemo(
    () => [...servicesForSelect.rootServices, ...servicesForSelect.groups.flatMap(g => g.options)],
    [servicesForSelect]
  )

  // Получаем объекты выбранных сервисов для отображения чипов
  const selectedServiceObjects = React.useMemo(
    () =>
      selectedServices
        .map(id => allServices.find(s => s.id === id))
        .filter(Boolean) as ServiceOption[],
    [selectedServices, allServices]
  )

  // Удаление одного сервиса из выбранных
  const handleRemoveService = useCallback(
    (idToRemove: string) => {
      onSelectionChange(selectedServices.filter(id => id !== idToRemove))
    },
    [selectedServices, onSelectionChange]
  )

  // Мемоизация обработчиков
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Получаем все выбранные option из <select multiple>
      const selectedOptions = Array.from(e.target.selectedOptions)
      const selectedIds = selectedOptions.map(option => option.value)

      // Для отладки - можно получить полные объекты
      if (process.env.NODE_ENV === 'development') {
        const selectedObjects = selectedIds
          .map(id => allServices.find(s => s.id === id))
          .filter(Boolean)
        console.log('Selected service IDs:', selectedIds)
        console.log('Selected service objects:', selectedObjects)
      }

      onSelectionChange(selectedIds)
    },
    [onSelectionChange, allServices]
  )

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
    console.log('Selected services:', selectedServices)
  }
  // (isReady && isMobile)
  //   <TextField className="w-full min-w-0" isRequired name="service" type="text">
  //               <option value="">Bitte wählen...</option>

  if (isReady && isMobile) {
    return (
      <div className="w-full min-w-0">
        <Label className="text-base font-normal flex items-center gap-2">
          <HandHeart className="w-6 h-6" />
          Dienstleistungen
        </Label>

        {/* Чипы с выбранными услугами */}
        {selectedServiceObjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {selectedServiceObjects.map(({ id, fullPath }) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
              >
                {fullPath}
                <button
                  type="button"
                  onClick={() => handleRemoveService(id)}
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
              name="service"
              onChange={handleMobileChange}
              multiple
              value={selectedServices}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {/* Корневые услуги без группы */}
              {servicesForSelect.rootServices.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
              {/* Группы с услугами */}
              {servicesForSelect.groups.map(({ id, label, options }) => (
                <optgroup key={id} label={label}>
                  {options.map(({ id: optionId, name }) => (
                    <option key={optionId} value={optionId}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {/* Видимая кнопка */}
            <Button variant="secondary" size="sm" className="w-full pointer-events-none">
              <Plus size={16} />
              Услугу добавить
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    )
  }
  //          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-default-500">
  //            <ChevronDown size={16} />
  //          </div>

  // --- RENDER FOR DESKTOP ---
  return (
    <div className="space-y-2 ">
      <Autocomplete
        isRequired
        fullWidth
        name="service"
        value={selectedServices || null}
        onChange={handleDesktopChange}
        placeholder="Dienstleistung auswählen..."
        selectionMode="multiple"
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <HandHeart className="w-6 h-6" />
          Dienstleistungen
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
                    const newSelection = selectedServices.filter(id => !keys.has(id))
                    onSelectionChange(newSelection)
                  }}
                >
                  <TagGroup.List>
                    {state.selectedItems.map((item: any) => {
                      const service = allServices.find(s => s.id === item.key)
                      return (
                        <Tag key={item.key} id={item.key} className="font-normal">
                          {service?.fullPath || item.textValue}
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
        <Autocomplete.Popover className="w-full max-w-sm">
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Suche Dienstleistung..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>Keine Ergebnisse</EmptyState>}>
              {/* Корневые услуги */}
              {servicesForSelect.rootServices.length > 0 && (
                <ListBox.Section>
                  {servicesForSelect.rootServices.map(({ id, name }) => (
                    <ListBox.Item key={id} textValue={name} id={id}>
                      {name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              )}
              {/* Группы с услугами */}
              {servicesForSelect.groups.map(({ id, label, options }) => (
                <ListBox.Section key={id}>
                  <Header>{label}</Header>
                  {options.map(({ id: optionId, name }) => (
                    <ListBox.Item key={optionId} textValue={name} id={optionId}>
                      {name}
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

export default memo(ServiceSelect)
