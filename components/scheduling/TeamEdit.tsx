'use client'

import React, { useState, useCallback } from 'react'
import { Modal, Button, Form, Input, Label, TextField } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Team } from '@/types/scheduling'
import { generateId } from '@/lib/generate-id'
import { Users } from 'lucide-react'

interface TeamEditProps {
  isOpen: boolean
  onClose: () => void
  onTeamAdded?: (team: Team) => void
}

export default function TeamEdit({ isOpen, onClose, onTeamAdded }: TeamEditProps) {
  const { addTeam, firmaID } = useScheduling()
  const [teamName, setTeamName] = useState('')

  const resetForm = useCallback(() => {
    setTeamName('')
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

      const newTeam: Team = {
        id: generateId(),
        teamName: teamName.trim(),
        firmaID: firmaID,
      }

      addTeam(newTeam)
      onTeamAdded?.(newTeam)
      handleClose()
    },
    [teamName, firmaID, addTeam, onTeamAdded, handleClose]
  )

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={open => {
          if (!open) handleClose()
        }}
        variant="blur"
      >
        <Modal.Container className="max-w-sm" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <Modal.Heading>Neues Team anlegen</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <Form id="team-edit-form" onSubmit={handleSubmit} autoComplete="off">
                <TextField className="w-full" name="teamName" isRequired>
                  <Label>Teamname</Label>
                  <Input
                    placeholder="z. B. Außendienst"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                  />
                </TextField>
              </Form>
            </Modal.Body>

            <Modal.Footer>
              <div className="flex items-center justify-end gap-2 w-full">
                <Button variant="tertiary" onPress={handleClose}>
                  Abbrechen
                </Button>
                <Button variant="primary" type="submit" form="team-edit-form">
                  <Users className="w-4 h-4" />
                  Anlegen
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
