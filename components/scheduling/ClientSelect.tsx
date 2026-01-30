'use client'

import React, { useMemo, useCallback, memo } from 'react'
import { ComboBox, Header, Input, Label, ListBox, Separator } from '@heroui/react'
import { UserStar, MapPin } from 'lucide-react'
import { Client, Groupe } from '@/types/scheduling'
import { usePlatformContext } from '@/contexts/PlatformContext'

interface GroupedClients {
  group: Groupe
  clients: Client[]
}

interface ClientSelectProps {
  groupedClients: GroupedClients[]
  clients: Client[]
  selectedClientId: string
  onSelectionChange: (clientId: string) => void
  error?: string
  className?: string
  isNew?: boolean
}

function ClientSelect({
  groupedClients,
  clients,
  selectedClientId,
  onSelectionChange,
  error,
  className,
  isNew = false,
}: ClientSelectProps) {
  const { isMobile, isReady } = usePlatformContext()
  const [isNewSelected, setIsNewSelected] = React.useState(false)

  // Мемоизация выбранного клиента
  const selectedClient = useMemo(
    () => clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  )

  // Мемоизация обработчиков
  const handleMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (isNew) {
        setIsNewSelected(true)
      }
      onSelectionChange(e.target.value)
    },
    [onSelectionChange, isNew]
  )

  const handleDesktopChange = useCallback(
    (key: React.Key | null) => {
      if (isNew) {
        setIsNewSelected(true)
      }
      if (key) onSelectionChange(key as string)
    },
    [onSelectionChange, isNew]
  )

  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (process.env.NODE_ENV === 'development') {
    console.log('Selected client ID:', selectedClientId)
  }
  if (isReady && isMobile) {
    return (
      <div className="space-y-2 p-2">
        <Label className="text-base font-normal flex items-center gap-2">
          <UserStar className="w-6 h-6" />
          Kunde
        </Label>
        <div
          className="relative surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl w-full"
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <select
            name="client"
            value={isNew && !isNewSelected ? 'Kunde auswählen' : selectedClientId}
            onChange={handleMobileChange}
            className="h-full w-full bg-transparent border-none outline-none text-foreground text-lg md:text-base ring-0 appearance-none px-3 pr-10 z-10 relative focus:outline-none focus:ring-0 focus:border-none"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              minHeight: '100%',
              lineHeight: 'normal',
              outline: 'none',
              boxShadow: 'none',
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
            required
          >
            {isNew && !isNewSelected && (
              <option value="Kunde auswählen" disabled>
                Kunde auswählen
              </option>
            )}
            {groupedClients.map(({ group, clients: groupClients }) => (
              <optgroup key={group.id} label={group.groupeName}>
                {groupClients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.surname} {client.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <UserStar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-default-500 pointer-events-none z-0" />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}

        {/* Selected Client Info */}
        {selectedClient && (
          <div className="bg-default-50 rounded-lg">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 mt-0.5 text-default-500" />
              <div>
                <p className="text-xs text-default-500">
                  {selectedClient.street} {selectedClient.houseNumber}
                  <br />
                  {selectedClient.postalCode} {selectedClient.city}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- RENDER FOR DESKTOP ---
  return (
    <div className="space-y-2 p-2">
      <ComboBox
        isRequired
        className="w-[256px]"
        name="client"
        selectedKey={selectedClientId}
        onSelectionChange={handleDesktopChange}
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <UserStar className="w-6 h-6" />
          Kunde
        </Label>
        <ComboBox.InputGroup>
          <Input placeholder="Suche Kunde..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {groupedClients.map(({ group, clients: groupClients }, index) => (
              <React.Fragment key={group.id}>
                <ListBox.Section>
                  <Header>{group.groupeName}</Header>
                  {groupClients.map(client => (
                    <ListBox.Item
                      key={client.id}
                      textValue={`${client.surname} ${client.name}`}
                      id={client.id}
                    >
                      {client.surname} {client.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
                {index < groupedClients.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Selected Client Info */}
      {selectedClient && (
        <div className="pt-1 bg-default-50 rounded-lg">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 mt-0.5 text-default-500" />
            <div>
              <p className="text-xs text-default-500">
                {selectedClient.street} {selectedClient.houseNumber}
                <br />
                {selectedClient.postalCode} {selectedClient.city}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ClientSelect)
