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
import { Worker } from '@/types/scheduling'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Mail } from 'lucide-react'
import React, { useState, useEffect, useCallback, memo } from 'react'

interface WorkerProps {
  worker: Worker
  isCreateNew?: boolean
  className?: string
}

export const WorkerContacts = memo(function WorkerContacts({
  worker,
  isCreateNew = false,
  className,
}: WorkerProps) {
  const { updateWorker, addWorker } = useScheduling()
  const [formData, setFormData] = useState({
    name: worker.name || '',
    surname: worker.surname || '',
    email: worker.email || '',
    phone: worker.phone || '',
  })

  useEffect(() => {
    setFormData({
      name: worker.name || '',
      surname: worker.surname || '',
      email: worker.email || '',
      phone: worker.phone || '',
    })
  }, [worker])

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setFormData({
      name: worker.name || '',
      surname: worker.surname || '',
      email: worker.email || '',
      phone: worker.phone || '',
    })
  }, [worker])

  const isChanged =
    formData.name !== (worker.name || '') ||
    formData.surname !== (worker.surname || '') ||
    formData.email !== (worker.email || '') ||
    formData.phone !== (worker.phone || '')

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      // Создаем обновленный объект работника
      const workerData: Worker = {
        ...worker,
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        phone: formData.phone,
      }

      if (isCreateNew) {
        console.log('Creating new worker with contacts:', workerData)
        // Добавляем нового работника в контексте
        addWorker(workerData)
        // TODO: Отправить данные на сервер
        // await createWorker(workerData)
        alert(`Worker ${formData.name} ${formData.surname} created successfully!`)
      } else {
        console.log('Updating worker with contacts:', workerData)
        // Обновляем работника в контексте
        updateWorker(workerData)
        // TODO: Отправить данные на сервер
        // await updateClient(client.id, clientData)
        alert('Contact information saved successfully!')
      }
    },
    [formData, worker, updateWorker, addWorker, isCreateNew]
  )
  const [date, setDate] = useState('')
  return (
    <Card
      className={`w-full max-w-md border border-gray-200 dark:border-gray-700 ${className || ''}`}
    >
      <Card.Header>
        <Card.Title>{isCreateNew ? 'New Worker Contacts' : 'Contact Information'}</Card.Title>
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
            <div className="flex flex-col w-full max-w-64">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                className="w-full h-10 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={date}
                min="2026-01-15"
                max="2027-01-13"
                onChange={e => {
                  // Manual validation check for iOS/Safari
                  if (e.target.value && e.target.value < '2026-01-15') {
                    alert('Selected date: ' + e.target.value)
                    return
                  }
                  setDate(e.target.value)
                }}
              />
              {date && <p className="mt-1 text-sm text-gray-500">Selected: {date}</p>}
              <select>
                <optgroup label="Недоступно">
                  <option>Вариант A</option>
                  <option>Вариант B</option>
                </optgroup>

                <optgroup label="Доступно">
                  <option>Вариант C</option>
                  <option>Вариант D</option>
                </optgroup>
              </select>
              <div className="relative">
                <button className="absolute inset-0 opacity-0 btn">Open Dropdown</button>
                <select>
                  <optgroup label="Недоступно" disabled>
                    <option>Вариант A</option>
                    <option>Вариант B</option>
                  </optgroup>

                  <optgroup label="Доступно">
                    <option>Вариант C</option>
                    <option>Вариант D</option>
                  </optgroup>
                </select>
              </div>
            </div>
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
                    Reset
                  </Button>
                )}
                <Button className="w-full max-w-50" type="submit">
                  {isCreateNew ? 'Create' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </Card.Footer>
      </Form>
    </Card>
  )
})
