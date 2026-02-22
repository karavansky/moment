'use client'

import React, { useMemo, useCallback, memo } from 'react'
import { Button, ComboBox, Header, Input, Label, ListBox, Separator } from '@heroui/react'
import { UserStar, MapPin, Plus } from 'lucide-react'
import { Client, Groupe } from '@/types/scheduling'
import { usePlatformContext } from '@/contexts/PlatformContext'
import { LogoMoment } from '@/components/icons'
import { useTranslation } from '@/components/Providers'
import { generateId } from '@/lib/generate-id'
import { useAuth } from '@/components/AuthProvider'

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
  const { t } = useTranslation()
  const [isNewSelected, setIsNewSelected] = React.useState(false)
  const { session, status: authStatus } = useAuth()

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
  const handleAddClient = () => {
    console.log('Attempting to add new client...')
    if (!session?.user.firmaID) return
    const newClientId = generateId()
    console.log('Adding new client with ID:', session.user.firmaID)
    // Optimistically add client to context (you may want to handle this differently)
    // For example, you could open a separate modal to enter client details
  }
  const addClient = (
    <div className="flex flex-row w-full gap-2 mb-2">
      <Label className="text-base font-normal flex items-center gap-2">
        <UserStar className="w-6 h-6" />
        {t('appointment.edit.client.label')}
      </Label>
      <div className="ml-auto">
        <Button variant="primary" size="sm" isIconOnly onPress={handleAddClient}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
  // --- RENDER FOR MOBILE (iOS/Android) ---
  if (process.env.NODE_ENV === 'development') {
    console.log('Selected client ID:', selectedClientId)
  }
  if (isReady && isMobile) {
    return (
      <div className="space-y-2 ">
        {addClient}
        <div
          className="relative surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl w-full"
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
          <select
            name="client"
            value={
              isNew && !isNewSelected ? t('appointment.edit.client.selectClient') : selectedClientId
            }
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
              <option value={t('appointment.edit.client.selectClient')} disabled>
                {t('appointment.edit.client.selectClient')}
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
              <LogoMoment className="w-4 h-4 mt-0.5 text-default-500" />
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
    <div className="space-y-2 ">
      <ComboBox
        isRequired
        className="w-[256px]"
        name="client"
        selectedKey={selectedClientId}
        onSelectionChange={handleDesktopChange}
      >
          <Label className="text-base font-normal flex items-center gap-2">
            <UserStar className="w-6 h-6" />
            {t('appointment.edit.client.label')}
          </Label>
        <ComboBox.InputGroup>
          <Input placeholder={t('appointment.edit.client.searchPlaceholder')} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {groupedClients.flatMap(({ group, clients: groupClients }, index) => [
              <ListBox.Section key={group.id}>
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
              </ListBox.Section>,
              ...(index < groupedClients.length - 1 ? [<Separator key={`sep-${group.id}`} />] : []),
            ])}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Selected Client Info */}
      {selectedClient && (
        <div className=" bg-default-50 rounded-lg">
          <div className="flex items-start gap-2 text-sm">
            <LogoMoment className="w-4 h-4 mt-0.5 text-default-500" />
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
