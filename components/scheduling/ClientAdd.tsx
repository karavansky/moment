'use client'

import React, { useState, useCallback } from 'react'
import {
  Modal,
  Button,
  Form,
  Input,
  InputGroup,
  Label,
  TextField,
  Separator,
} from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useAuth } from '@/components/AuthProvider'
import { generateId } from '@/lib/generate-id'
import { Client, Groupe } from '@/types/scheduling'
import { Mail, UserPlus, MapPin, Plus } from 'lucide-react'
import GroupeEdit from './GroupeEdit'

interface ClientAddProps {
  isOpen: boolean
  onClose: () => void
  onClientAdded?: (client: Client) => void
}

export default function ClientAdd({ isOpen, onClose, onClientAdded }: ClientAddProps) {
  const { addClient, groups } = useScheduling()
  const { session } = useAuth()
  const [isGroupeEditOpen, setIsGroupeEditOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    groupeId: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    country: '',
  })

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      surname: '',
      email: '',
      phone: '',
      groupeId: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: '',
    })
  }, [])

  React.useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(resetForm, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, resetForm])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const selectedGroupe = groups.find(g => g.id === formData.groupeId)

      const newClient: Client = {
        id: generateId(),
        firmaID: session?.user?.firmaID || 'demo',
        name: formData.name,
        surname: formData.surname,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        country: formData.country || 'DE',
        street: formData.street,
        houseNumber: formData.houseNumber,
        postalCode: formData.postalCode,
        city: formData.city,
        latitude: 0,
        longitude: 0,
        status: 0,
        groupe: selectedGroupe,
      }

      addClient(newClient)
      onClientAdded?.(newClient)
      handleClose()
    },
    [formData, session, groups, addClient, onClientAdded, handleClose]
  )

  const handleGroupeAdded = useCallback(
    (groupe: Groupe) => {
      setFormData(prev => ({ ...prev, groupeId: groupe.id }))
    },
    []
  )

  const isFormValid = formData.name.length > 0 && formData.surname.length > 0

  return (
    <>
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={open => {
          if (!open) handleClose()
        }}
        variant="blur"
      >
        <Modal.Container className="max-w-md" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <Modal.Heading>Neuen Klienten anlegen</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <Form id="client-add-form" onSubmit={handleSubmit} autoComplete="off">
                <div className="flex flex-col gap-4">
                  {/* Name row */}
                  <div className="flex gap-2 w-full">
                    <TextField className="w-full min-w-0 ml-1" name="surname" isRequired autoFocus>
                      <Label>Nachname</Label>
                      <Input
                        placeholder="Schmidt"
                        value={formData.surname}
                        onChange={e => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                      />
                    </TextField>
                    <TextField className="w-full min-w-0 mr-1" name="name" isRequired>
                      <Label>Vorname</Label>
                      <Input
                        placeholder="Anna"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </TextField>
                  </div>

                  {/* Email */}
                  <TextField className="w-full pl-1 pr-1" name="email" type="email">
                    <Label>E-Mail</Label>
                    <InputGroup>
                      <InputGroup.Prefix>
                        <Mail className="size-4 text-muted" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        placeholder="anna@example.de"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </InputGroup>
                  </TextField>

                  {/* Phone */}
                  <TextField className="w-full pl-1 pr-1" name="phone" type="tel">
                    <Label>Telefon</Label>
                    <Input
                      placeholder="+49 ..."
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </TextField>

                  <Separator />

                  {/* Address section */}
                  <div className="flex items-center gap-2 pl-1">
                    <MapPin className="w-4 h-4 text-muted" />
                    <span className="text-sm font-medium">Adresse</span>
                  </div>

                  <div className="flex gap-2 w-full">
                    <TextField className="flex-1 min-w-0 ml-1" name="street">
                      <Label>Straße</Label>
                      <Input
                        placeholder="Musterstraße"
                        value={formData.street}
                        onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
                      />
                    </TextField>
                    <TextField className="w-24 mr-1" name="houseNumber">
                      <Label>Nr.</Label>
                      <Input
                        placeholder="12"
                        value={formData.houseNumber}
                        onChange={e => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
                      />
                    </TextField>
                  </div>

                  <div className="flex gap-2 w-full">
                    <TextField className="w-28 ml-1" name="postalCode">
                      <Label>PLZ</Label>
                      <Input
                        placeholder="10115"
                        value={formData.postalCode}
                        onChange={e => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      />
                    </TextField>
                    <TextField className="flex-1 min-w-0 mr-1" name="city">
                      <Label>Stadt</Label>
                      <Input
                        placeholder="Berlin"
                        value={formData.city}
                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </TextField>
                  </div>

                  <Separator />

                  {/* Groupe */}
                  <TextField className="w-full pl-1 pr-1" name="groupeId">
                    <div className="flex items-center gap-2 w-full">
                      <Label>Gruppe</Label>
                      <Button className="ml-auto"
                        variant="primary"
                        size="sm"
                        isIconOnly
                        onPress={() => setIsGroupeEditOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl px-2 w-full">
                      <select
                        name="groupeId"
                        value={formData.groupeId}
                        onChange={e => setFormData(prev => ({ ...prev, groupeId: e.target.value }))}
                        className="w-full px-2 py-0 text-lg font-normal md:text-base border-0 outline-none bg-transparent"
                      >
                        <option value="">Keine Gruppe</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.groupeName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TextField>
                </div>
              </Form>
            </Modal.Body>

            <Modal.Footer>
              <div className="flex items-center justify-end gap-2 w-full">
                <Button variant="tertiary" onPress={handleClose}>
                  Abbrechen
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  form="client-add-form"
                  isDisabled={!isFormValid}
                >
                  <UserPlus className="w-4 h-4" />
                  Anlegen
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
    <GroupeEdit
      isOpen={isGroupeEditOpen}
      onClose={() => setIsGroupeEditOpen(false)}
      onGroupeAdded={handleGroupeAdded}
    />
    </>
  )
}
