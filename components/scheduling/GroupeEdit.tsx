'use client'

import React, { useState, useCallback } from 'react'
import { Modal, Button, Form, Input, Label, TextField } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Groupe } from '@/types/scheduling'
import { generateId } from '@/lib/generate-id'
import { Users } from 'lucide-react'

interface GroupeEditProps {
  isOpen: boolean
  onClose: () => void
  onGroupeAdded?: (groupe: Groupe) => void
}

export default function GroupeEdit({ isOpen, onClose, onGroupeAdded }: GroupeEditProps) {
  const { addGroupe, firmaID } = useScheduling()
  const [groupeName, setGroupeName] = useState('')

  const resetForm = useCallback(() => {
    setGroupeName('')
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

      const newGroupe: Groupe = {
        id: generateId(),
        groupeName: groupeName.trim(),
        firmaID: firmaID || 'demo',
      }

      addGroupe(newGroupe)
      onGroupeAdded?.(newGroupe)
      handleClose()
    },
    [groupeName, firmaID, addGroupe, onGroupeAdded, handleClose]
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
                <Modal.Heading>Neue Gruppe anlegen</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <Form id="groupe-edit-form" onSubmit={handleSubmit} autoComplete="off">
                <TextField className="w-full" name="groupeName" isRequired autoFocus>
                  <Label>Gruppenname</Label>
                  <Input
                    placeholder="z. B. VIP, Stammkunden"
                    value={groupeName}
                    onChange={e => setGroupeName(e.target.value)}
                  />
                </TextField>
              </Form>
            </Modal.Body>

            <Modal.Footer>
              <div className="flex items-center justify-end gap-2 w-full">
                <Button variant="tertiary" onPress={handleClose}>
                  Abbrechen
                </Button>
                <Button variant="primary" type="submit" form="groupe-edit-form">
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
