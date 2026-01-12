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
import { Mail } from 'lucide-react'
import React, { useState, useEffect, useCallback, memo } from 'react'

interface ClientAdressProps {
  client: Client
  className?: string
}

export const ClientContacts = memo(function ClientContacts({
  client,
  className,
}: ClientAdressProps) {
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

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}

    // Convert FormData to plain object
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    alert('Form submitted successfully!')
  }, [])

  return (
    <Card className="w-full max-w-md border border-gray-200 dark:border-gray-700">
      <Card.Header>
        <Card.Title>Contact Information</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content>
          <div className="flex flex-col gap-4">
            <div className="flex items-center flex-row gap-2 w-full">
              <TextField className="w-full min-w-0" name="name" type="text">
                <Label>Vorname</Label>
                <Input
                  placeholder="Vorname"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
              </TextField>
              <TextField className="w-full min-w-0" name="surname" type="text">
                <Label>Nachname</Label>
                <Input
                  placeholder="Nachname"
                  value={formData.surname}
                  onChange={e => handleChange('surname', e.target.value)}
                />
              </TextField>
            </div>
            <TextField className="w-full max-w-64" name="email" type="email">
              <Label>Email</Label>
              <InputGroup>
                <InputGroup.Prefix>
                  <Mail className="size-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  className="w-full max-w-70"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                />
              </InputGroup>
            </TextField>
            <TextField className="w-full max-w-64" name="phone" type="tel">
              <Label>Phone</Label>
              <InputGroup>
                <InputGroup.Prefix>
                  <Button size="sm" variant="ghost">
                    +49
                  </Button>
                </InputGroup.Prefix>
                <InputGroup.Input
                  className="w-full max-w-70"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                />
              </InputGroup>
            </TextField>
          </div>
        </Card.Content>
        <Card.Footer className="mt-4 flex flex-col gap-2">
          {isChanged && (
            <>
              <Separator />
              <div className="flex gap-6 justify-end">
                <Button
                  className="w-full max-w-50 "
                  variant="danger-soft"
                  type="reset"
                  onPress={handleReset}
                >
                  Reset
                </Button>
                <Button className="w-full max-w-50" type="submit">
                  Save
                </Button>
              </div>
            </>
          )}
        </Card.Footer>
      </Form>
    </Card>
  )
})
