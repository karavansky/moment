'use client'

import { useState } from 'react'
import { Button, Modal, Label, TextField, Input, AlertDialog } from '@heroui/react'
import type { ChangeEvent } from 'react'
import { Folder, FileText, Trash2, AlertTriangle } from 'lucide-react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { ServiceTreeItem, Service, ServiceGroup } from '@/types/scheduling'

// Modal for create/edit with delete button
const ServiceModal = ({
  isOpen,
  onClose,
  editItem,
  parentId,
  onSave,
  onDelete,
  hasChildren,
}: {
  isOpen: boolean
  onClose: () => void
  editItem: ServiceTreeItem | null
  parentId: string | null
  onSave: (item: ServiceTreeItem) => void
  onDelete: (id: string) => void
  hasChildren: boolean
}) => {
  const { firmaID } = useScheduling()
  const [isGroup, setIsGroup] = useState(editItem?.isGroup ?? false)
  const [name, setName] = useState(editItem?.name ?? '')
  const [description, setDescription] = useState(editItem?.description ?? '')
  const [duration, setDuration] = useState(
    editItem && !editItem.isGroup ? (editItem as Service).duration.toString() : '30'
  )
  const [price, setPrice] = useState(
    editItem && !editItem.isGroup && (editItem as Service).price
      ? (editItem as Service).price!.toString()
      : ''
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = () => {
    const baseItem = {
      id: editItem?.id ?? crypto.randomUUID(),
      firmaID,
      name,
      description: description || undefined,
      parentId: editItem?.parentId ?? parentId,
      order: editItem?.order ?? Date.now(),
    }

    if (isGroup) {
      const group: ServiceGroup = {
        ...baseItem,
        isGroup: true,
      }
      onSave(group)
    } else {
      const service: Service = {
        ...baseItem,
        isGroup: false,
        duration: parseInt(duration) || 30,
        price: price ? parseFloat(price) : undefined,
      }
      onSave(service)
    }
    onClose()
  }

  const handleDeleteClick = () => {
    if (editItem?.isGroup && hasChildren) {
      setShowDeleteConfirm(true)
    } else {
      onDelete(editItem!.id)
      onClose()
    }
  }

  const handleConfirmDelete = () => {
    onDelete(editItem!.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <>
      <Modal>
        <Modal.Backdrop
          isOpen={isOpen}
          onOpenChange={open => {
            if (!open) onClose()
          }}
          variant="blur"
        >
          <Modal.Container className="max-w-md" placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />

              <Modal.Header>
                <h2 className="text-xl font-bold">{editItem ? 'Bearbeiten' : 'Neu erstellen'}</h2>
              </Modal.Header>

              <Modal.Body className="gap-4 py-4">
                {!editItem && (
                  <div className="flex gap-2">
                    <Button
                      variant={isGroup ? 'primary' : 'outline'}
                      onPress={() => setIsGroup(true)}
                      className="flex-1"
                    >
                      <Folder className="w-4 h-4 mr-2" />
                      Gruppe
                    </Button>
                    <Button
                      variant={!isGroup ? 'primary' : 'outline'}
                      onPress={() => setIsGroup(false)}
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Dienstleistung
                    </Button>
                  </div>
                )}

                <TextField isRequired>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  />
                </TextField>

                <TextField>
                  <Label>Beschreibung</Label>
                  <Input
                    value={description}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  />
                </TextField>

                {!isGroup && (
                  <>
                    <TextField isRequired>
                      <Label>Dauer (Minuten)</Label>
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setDuration(e.target.value)}
                      />
                    </TextField>

                    <TextField>
                      <Label>Preis (€)</Label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                      />
                    </TextField>
                  </>
                )}
              </Modal.Body>

              <div className="flex justify-between gap-2 p-4 border-t border-default-200">
                {editItem ? (
                  <Button variant="danger" onPress={handleDeleteClick}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button variant="tertiary" onPress={onClose}>
                    Abbrechen
                  </Button>
                  <Button variant="primary" onPress={handleSave} isDisabled={!name.trim()}>
                    Speichern
                  </Button>
                </div>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* AlertDialog for group deletion confirmation */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={showDeleteConfirm}
          onOpenChange={open => {
            if (!open) setShowDeleteConfirm(false)
          }}
          variant="blur"
          isDismissable
        >
          <AlertDialog.Container placement="center">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <AlertTriangle className="w-6 h-6" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Gruppe löschen?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                Diese Gruppe enthält Unterelemente. Wenn Sie fortfahren, werden alle enthaltenen
                Dienstleistungen und Untergruppen ebenfalls gelöscht.
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onPress={() => setShowDeleteConfirm(false)}>
                  Abbrechen
                </Button>
                <Button variant="danger" onPress={handleConfirmDelete}>
                  Alles löschen
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  )
}

export default ServiceModal
