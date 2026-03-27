'use client'

import {
  Button,
  Card,
  Form,
  Input,
  InputGroup,
  Label,
  Link,
  Separator,
  TextField,
} from '@heroui/react'
import { Client } from '@/types/scheduling'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Mail } from 'lucide-react'
import React, { useState, useEffect, useCallback, memo, useRef } from 'react'
import { useTranslation } from '@/components/Providers'

interface ClientContactsProps {
  client: Client
  isCreateNew?: boolean
  className?: string
}

export const ClientContacts = memo(function ClientContacts({
  client,
  isCreateNew = false,
  className,
}: ClientContactsProps) {
  const { updateClient, addClient } = useScheduling()
  const { t } = useTranslation()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: client.name || '',
    surname: client.surname || '',
    email: client.email || '',
    phone: client.phone || '',
  })

  useEffect(() => {
    setFormData({
      name: client.name || '',
      surname: client.surname || '',
      email: client.email || '',
      phone: client.phone || '',
    })
  }, [client])

  useEffect(() => {
    if (isCreateNew && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isCreateNew])

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setFormData({
      name: client.name || '',
      surname: client.surname || '',
      email: client.email || '',
      phone: client.phone || '',
    })
  }, [client])

  const isChanged =
    formData.name !== (client.name || '') ||
    formData.surname !== (client.surname || '') ||
    formData.email !== (client.email || '') ||
    formData.phone !== (client.phone || '')

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      // Создаем обновленный объект клиента
      const clientData: Client = {
        ...client,
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        phone: formData.phone,
      }

      if (isCreateNew) {
        console.log('Creating new client with contacts:', clientData)
        // Добавляем нового клиента в контексте
        addClient(clientData)
        // TODO: Отправить данные на сервер
        // await createClient(clientData)
        alert(t('clients.contacts.createSuccess'))
      } else {
        console.log('Updating client with contacts:', clientData)
        // Обновляем клиента в контексте
        updateClient(clientData)
        // TODO: Отправить данные на сервер
        // await updateClient(client.id, clientData)
        alert(t('clients.contacts.saveSuccess'))
      }
    },
    [formData, client, updateClient, addClient, isCreateNew]
  )
  const [date, setDate] = useState('')
  return (
    <Card
      className={`w-full max-w-md border border-gray-200 dark:border-gray-700 ${className || ''}`}
    >
      <Card.Header>
        <Card.Title>{isCreateNew ? t('clients.contacts.titleNew') : t('clients.contacts.title')}</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content>
          <div className="flex flex-col gap-4">
            <div className="flex items-center flex-row gap-2 w-full">
              <TextField className="w-full min-w-0" name="name" type="text">
                <Label>{t('clients.contacts.firstName')}</Label>
                <Input
                  ref={nameInputRef}
                  placeholder={t('clients.contacts.firstName')}
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
              </TextField>
              <TextField className="w-full min-w-0" name="surname" type="text">
                <Label>{t('clients.contacts.lastName')}</Label>
                <Input
                  placeholder={t('clients.contacts.lastName')}
                  value={formData.surname}
                  onChange={e => handleChange('surname', e.target.value)}
                />
              </TextField>
            </div>
            <TextField className="w-full max-w-64" name="email" type="email">
              <Label>{t('clients.contacts.email')}</Label>
              <InputGroup>
                <InputGroup.Prefix>
                  <Mail className="size-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  className="w-full max-w-70"
                  placeholder={t('clients.contacts.emailPlaceholder')}
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                />
              </InputGroup>
            </TextField>
            <TextField className="w-full max-w-64" name="phone" type="tel">
              <Label>{t('clients.contacts.phone')}</Label>
              <InputGroup>
                <InputGroup.Prefix>
                  <Button size="sm" variant="ghost">
                    +49
                  </Button>
                </InputGroup.Prefix>
                <InputGroup.Input
                  className="w-full max-w-70"
                  placeholder={t('clients.contacts.phonePlaceholder')}
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                />
              </InputGroup>
            </TextField>

          </div>
        </Card.Content>
        <Card.Footer className="mt-4 flex flex-col gap-2">
          {(isChanged || isCreateNew) && (
            <>
              <Separator />
              <div className="flex gap-6 justify-end">
                {!isCreateNew && (
                  <Button
                    className="w-full max-w-50 "
                    variant="danger-soft"
                    type="reset"
                    onPress={handleReset}
                  >
                    {t('clients.contacts.reset')}
                  </Button>
                )}
                {(formData.name.length > 0 || formData.surname.length > 0) && <Button className="w-full max-w-50" type="submit">

                  {isCreateNew ? t('clients.contacts.create') : t('clients.contacts.save')}
                </Button>}
              </div>
            </>
          )}
        </Card.Footer>
      </Form>
    </Card>
  )
})
