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
import { useTranslation } from '@/components/Providers'
import { generateId } from '@/lib/generate-id'
import { Team, Worker } from '@/types/scheduling'
import { Mail, Plus, UserPlus } from 'lucide-react'
import TeamEdit from './TeamEdit'

interface StaffAddProps {
  isOpen: boolean
  onClose: () => void
  onWorkerAdded?: (worker: Worker) => void
}

export default function StaffAdd({ isOpen, onClose, onWorkerAdded }: StaffAddProps) {
  const { addWorker, teams } = useScheduling()
  const [isTeamEditOpen, setIsTeamEditOpen] = useState(false)
  const { session } = useAuth()
  const { t } = useTranslation()

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    teamId: '',
  })

  const resetForm = useCallback(() => {
    setFormData({ name: '', surname: '', email: '', phone: '', teamId: '' })
  }, [])

  // Сбрасываем форму только после завершения анимации закрытия (не во время)
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
      if (!session?.user) return

      const newWorker: Worker = {
        id: generateId(),
        userID: '',
        firmaID: session.user.firmaID ? session.user.firmaID : '',
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        phone: formData.phone || undefined,
        teamId: formData.teamId,
        isAdress: false,
        status: 0,
      }

      addWorker(newWorker)
      onWorkerAdded?.(newWorker)
      handleClose()
    },
    [formData, session, addWorker, onWorkerAdded, handleClose]
  )

  const handleTeamAdded = useCallback(
    (team: Team) => {
      setFormData(prev => ({ ...prev, teamId: team.id }))
    },
    []
  )

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
                <Modal.Heading>Neuen Mitarbeiter anlegen</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <Form id="staff-add-form" onSubmit={handleSubmit} autoComplete="off">
                <div className="flex flex-col gap-4">
                  {/* Name row */}
                  <div className="flex gap-2 w-full">
                    <TextField className="w-full min-w-0" name="surname" isRequired>
                      <Label>Nachname</Label>
                      <Input
                        placeholder="Müller"
                        value={formData.surname}
                        onChange={e => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                      />
                    </TextField>
                    <TextField className="w-full min-w-0" name="name" isRequired>
                      <Label>Vorname</Label>
                      <Input
                        placeholder="Max"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </TextField>
                  </div>

                  {/* Email */}
                  <TextField className="w-full" name="email" type="email" isRequired>
                    <Label>E-Mail</Label>
                    <InputGroup>
                      <InputGroup.Prefix>
                        <Mail className="size-4 text-muted" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        placeholder="max@firma.de"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </InputGroup>
                  </TextField>

                  {/* Phone */}
                  <TextField className="w-full" name="phone" type="tel">
                    <Label>Telefon</Label>
                    <Input
                      placeholder="+49 ..."
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </TextField>

                  <Separator />

                  {/* Team */}
                  <TextField className="w-full" name="teamId">
                    <div className="flex items-center gap-2">
                      <Label>Team</Label>
                      <Button
                        variant="primary"
                        size="sm"
                        isIconOnly
                        onPress={() => setIsTeamEditOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl px-2 w-full">
                      <select
                        name="teamId"
                        value={formData.teamId}
                        onChange={e => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                        className="w-full px-2 py-0 text-lg font-normal md:text-base border-0 outline-none bg-transparent"
                      >
                        <option value="" disabled>
                          Team auswählen...
                        </option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.teamName}
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
                <Button variant="primary" type="submit" form="staff-add-form">
                  <UserPlus className="w-4 h-4" />
                  Anlegen
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
    <TeamEdit
      isOpen={isTeamEditOpen}
      onClose={() => setIsTeamEditOpen(false)}
      onTeamAdded={handleTeamAdded}
    />
    </>
  )
}
