'use client'

import React, { useCallback, memo } from 'react'
import { Button, ButtonRoot, ComboBox, Input, Label, ListBox, TextField } from '@heroui/react'
import { Plus, Trash, User } from 'lucide-react'
import { usePlatformContext } from '@/contexts/PlatformContext'
import { useScheduling } from '@/contexts/SchedulingContext'

interface ServiceOption {
  id: string;
  name: string;
  numbering: string;
}

interface ServiceGroupForSelect {
  id: string;
  label: string;
  options: ServiceOption[];
}

interface ServicesForSelect {
  rootServices: ServiceOption[];
  groups: ServiceGroupForSelect[];
}

interface ServiceSelectProps {
  servicesForSelect: ServicesForSelect
  selectedServices: string
  onSelectionChange: (serviceId: string) => void
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
  const [test, setTest] = React.useState('')

  const { services } = useScheduling()

  // Мемоизация обработчиков
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value
      onSelectionChange(selectedId)
      setTest(selectedId)
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
    console.log('Selected services:', selectedServices)
  }
  // (isReady && isMobile)
   //   <TextField className="w-full min-w-0" isRequired name="service" type="text">

  if (true) {
    return (
      <div className="w-full min-w-0" >
        <Label className="text-base font-normal">Dienstleistungen</Label>
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <select
              value={test}
              onChange={handleMobileChange}
            >
              <option value="">Bitte wählen...</option>
              {/* Корневые услуги без группы */}
              {servicesForSelect.rootServices.map(({ id, name, numbering }) => (
                <option key={id} value={id}>{numbering} {name}</option>
              ))}
              {/* Группы с услугами */}
              {servicesForSelect.groups.map(({ id, label, options }) => (
                <optgroup key={id} label={label}>
                  {options.map(({ id: optionId, name, numbering }) => (
                    <option key={optionId} value={optionId}>{numbering} {name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Button isIconOnly size="sm" variant="tertiary" onPress={() => setTest('')}>
            <Trash size={16} />
          </Button>
          <Button isIconOnly size="sm" variant="primary" onPress={() => setTest('')}>
            <Plus size={16} />
          </Button>
        </div>
      </div>
    )
  }
  //          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-default-500">
  //            <ChevronDown size={16} />
  //          </div>

  // --- RENDER FOR DESKTOP ---
  return (
    <div className="space-y-2 p-2">
      <ComboBox
        isRequired
        className="w-[256px]"
        name="service"
        selectedKey={selectedServices}
        onSelectionChange={handleDesktopChange}
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          Dienstleistungen
        </Label>
        <ComboBox.InputGroup>
          <Input placeholder="Suche Fachkraft..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {/* Корневые услуги */}
            {servicesForSelect.rootServices.map(({ id, name, numbering }) => (
              <ListBox.Item key={id} textValue={`${numbering} ${name}`} id={id}>
                {numbering} {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
            {/* Группы с услугами */}
            {servicesForSelect.groups.flatMap(({ label, options }) => [
              <ListBox.Item key={`header-${label}`} textValue={label} isDisabled>
                <span className="font-semibold text-default-500">{label}</span>
              </ListBox.Item>,
              ...options.map(({ id: optionId, name, numbering }) => (
                <ListBox.Item key={optionId} textValue={`${numbering} ${name}`} id={optionId}>
                  <span className="pl-4">{numbering} {name}</span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )),
            ])}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default memo(ServiceSelect)
