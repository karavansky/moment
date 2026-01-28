'use client'

import React, { useCallback, memo } from 'react'
import { ComboBox, Input, Label, ListBox, TextField } from '@heroui/react'
import { ChevronDown, User } from 'lucide-react'
import { usePlatformContext } from '@/contexts/PlatformContext'

interface ServicesForSelect {
  service: string
  id: string
  path: string
}

interface ServiceSelectProps {
  servicesForSelect: ServicesForSelect[]
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
  // Мемоизация обработчиков
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedName = e.target.value

      // Найти service по name в servicesForSelect
      const found = servicesForSelect.find(s => s.service === selectedName)
      if (found) {
        console.log('Mobile selected service:', found)
        onSelectionChange(found.id)
        setTest(found.service)
        return
      }
      setTest(selectedName)
      // Если не нашли точное совпадение - пользователь ещё печатает
      onSelectionChange(selectedName)
    },
    [onSelectionChange, servicesForSelect]
  )

  const handleDesktopChange = useCallback(
    (key: React.Key | null) => {
      if (key) onSelectionChange(key as string)
    },
    [onSelectionChange]
  )

  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (process.env.NODE_ENV === 'development') {
    console.log("Selected services:", selectedServices)
  }
  // (isReady && isMobile)
  if (true) {
    return (
      <TextField className="w-1/2 min-w-0" isRequired name="service" type="text">
        <Label className="text-base font-normal">Dienstleistungen</Label>
        <div className="relative w-full">
          <Input
            value={test}
            onChange={handleMobileChange}
            autoComplete="off"
            list="service-options"
            className="text-lg font-normal md:text-base w-full pr-10 "
            required
            placeholder='Select service...'
          />
          <datalist id="service-options">
            {servicesForSelect.map(({ service, id, path }) => (
              <option key={id} value={service} label={path || 'empty'} />
            ))}
          </datalist>
        </div>
      </TextField>
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
            {servicesForSelect.map(({ service, id, path }) => (
              <ListBox.Item
                key={id}
                textValue={path ? `${path} - ${service}` : service}
                id={id}
              >
                {path ? `${path} - ${service}` : service}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default memo(ServiceSelect)
