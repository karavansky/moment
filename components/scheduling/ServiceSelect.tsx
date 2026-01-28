'use client'

import React, { useCallback, memo, useRef } from 'react'
import { Button, ButtonRoot, ComboBox, Input, Label, ListBox, TextField } from '@heroui/react'
import { ChevronDown, Plus, Trash, User } from 'lucide-react'
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
  const inputRef = useRef<HTMLInputElement>(null)
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
            <input
              ref={inputRef}
              value={test}
              onChange={handleMobileChange}
              onKeyDown={e => {
                // Блокируем ввод с клавиатуры, разрешаем только Tab и выбор из списка
                if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
                  e.preventDefault()
                }
              }}
              autoComplete="off"
              list="service-options"
              inputMode="none"
              className="text-lg font-normal md:text-base w-full pr-8 border border-divider rounded-lg px-3 py-2 bg-default-50"
              required
              placeholder="Select service..."
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-default-500 hover:text-default-700"
              onClick={() => inputRef.current?.focus()}
            >
              <ChevronDown size={18} />
            </button>
            <datalist id="service-options">
              {servicesForSelect.map(({ service, id, path }) => (
                <option key={id} value={service} label={path || 'empty'} />
              ))}
            </datalist>
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
            {servicesForSelect.map(({ service, id, path }) => (
              <ListBox.Item key={id} textValue={path ? `${path} - ${service}` : service} id={id}>
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
