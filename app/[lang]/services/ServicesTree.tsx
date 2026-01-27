'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { Button, Card, Modal, Label, TextField, Input, Spinner, AlertDialog } from '@heroui/react'
import type { ChangeEvent, TouchEvent } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { ServiceTreeItem, Service, ServiceGroup } from '@/types/scheduling'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

// Swipeable Tree Item
const TreeItem = ({
  item,
  level,
  children,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: {
  item: ServiceTreeItem
  level: number
  children: ServiceTreeItem[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (item: ServiceTreeItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
}) => {
  const isExpanded = expandedIds.has(item.id)
  const hasChildren = children.length > 0

  // Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isHorizontalSwipe = useRef(false)

  const SWIPE_THRESHOLD = 80 // px to reveal delete button
  const DELETE_BUTTON_WIDTH = 80

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontalSwipe.current = false
    setIsSwiping(true)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return

    const deltaX = touchStartX.current - e.touches[0].clientX
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY)

    // Determine if this is a horizontal swipe
    if (!isHorizontalSwipe.current && Math.abs(deltaX) > 10) {
      isHorizontalSwipe.current = deltaY < Math.abs(deltaX)
    }

    if (!isHorizontalSwipe.current) return

    // Only allow swipe left (positive deltaX)
    const newOffset = Math.max(0, Math.min(DELETE_BUTTON_WIDTH, deltaX))
    setSwipeOffset(newOffset)
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    // Snap to either open or closed
    if (swipeOffset > SWIPE_THRESHOLD / 2) {
      setSwipeOffset(DELETE_BUTTON_WIDTH)
    } else {
      setSwipeOffset(0)
    }
  }

  const handleClick = () => {
    // Only trigger edit if not swiped
    if (swipeOffset === 0) {
      onEdit(item)
    } else {
      // Reset swipe
      setSwipeOffset(0)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSwipeOffset(0)
    onDelete(item.id)
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(item.id)
  }

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddChild(item.id)
  }

  return (
    <div>
      <div className="relative overflow-hidden">
        {/* Delete button behind */}
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-danger text-white"
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <button
            onClick={handleDeleteClick}
            className="flex items-center justify-center w-full h-full"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Main content */}
        <div
          className="flex items-center gap-2 py-3 px-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-default-200 rounded-lg cursor-pointer transition-transform"
          style={{
            paddingLeft: `${level * 20 + 8}px`,
            transform: `translateX(-${swipeOffset}px)`,
            transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
          }}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {item.isGroup ? (
            <button
              onClick={handleToggleClick}
              className="p-1 hover:bg-default-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-default-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-default-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {item.isGroup ? (
            <Folder className="w-5 h-5 text-warning-500" />
          ) : (
            <FileText className="w-5 h-5 text-primary-500" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{item.name}</div>
            {item.description && (
              <div className="text-xs text-default-400 truncate">{item.description}</div>
            )}
          </div>

          {!item.isGroup && (
            <div className="text-sm text-default-500 mr-2">
              {(item as Service).duration} Min.
              {(item as Service).price && ` · ${(item as Service).price}€`}
            </div>
          )}

          {item.isGroup && (
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={handleAddClick as any}
              aria-label="Kind hinzufügen"
            >
              <Plus className="w-4 h-4 text-default-500" />
            </Button>
          )}
        </div>
      </div>

      {item.isGroup && isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeItemContainer
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Container for TreeItem with access to services
const TreeItemContainer = ({
  item,
  level,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: {
  item: ServiceTreeItem
  level: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (item: ServiceTreeItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
}) => {
  const { services } = useScheduling()
  const children = useMemo(
    () =>
      services
        .filter((s) => s.parentId === item.id)
        .sort((a, b) => a.order - b.order),
    [services, item.id]
  )

  return (
    <TreeItem
      item={item}
      level={level}
      children={children}
      expandedIds={expandedIds}
      onToggle={onToggle}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddChild={onAddChild}
    />
  )
}

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
  const [duration, setDuration] = useState(editItem && !editItem.isGroup ? (editItem as Service).duration.toString() : '30')
  const [price, setPrice] = useState(editItem && !editItem.isGroup && (editItem as Service).price ? (editItem as Service).price!.toString() : '')
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
          onOpenChange={(open) => {
            if (!open) onClose()
          }}
          variant="blur"
        >
          <Modal.Container className="max-w-md" placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />

              <Modal.Header>
                <h2 className="text-xl font-bold">
                  {editItem ? 'Bearbeiten' : 'Neu erstellen'}
                </h2>
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
          onOpenChange={(open) => {
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
                Diese Gruppe enthält Unterelemente. Wenn Sie fortfahren, werden alle
                enthaltenen Dienstleistungen und Untergruppen ebenfalls gelöscht.
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

export default function ServicesTree() {
  const { services, isLoading, addService, updateService, deleteService } = useScheduling()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editItem, setEditItem] = useState<ServiceTreeItem | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ServiceTreeItem | null>(null)

  // Root items (parentId === null)
  const rootItems = useMemo(
    () =>
      services
        .filter((s) => s.parentId === null)
        .sort((a, b) => a.order - b.order),
    [services]
  )

  // Check if item has children
  const hasChildren = useCallback((itemId: string) => {
    return services.some(s => s.parentId === itemId)
  }, [services])

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleExpandAll = () => {
    const allGroupIds = services.filter((s) => s.isGroup).map((s) => s.id)
    setExpandedIds(new Set(allGroupIds))
  }

  const handleCollapseAll = () => {
    setExpandedIds(new Set())
  }

  const handleEdit = (item: ServiceTreeItem) => {
    setEditItem(item)
    setParentIdForNew(null)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    const item = services.find(s => s.id === id)
    if (!item) return

    if (item.isGroup && hasChildren(id)) {
      setDeleteConfirmItem(item)
    } else {
      deleteService(id)
    }
  }

  const handleConfirmDelete = () => {
    if (deleteConfirmItem) {
      deleteService(deleteConfirmItem.id)
      setDeleteConfirmItem(null)
    }
  }

  const handleAddChild = (parentId: string) => {
    setEditItem(null)
    setParentIdForNew(parentId)
    setExpandedIds((prev) => new Set([...prev, parentId]))
    setIsModalOpen(true)
  }

  const handleAddRoot = () => {
    setEditItem(null)
    setParentIdForNew(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditItem(null)
    setParentIdForNew(null)
  }

  const handleSave = (item: ServiceTreeItem) => {
    if (editItem) {
      updateService(item)
    } else {
      addService(item)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dienstleistungen</h1>

      </div>

      <Card className="flex-1 overflow-auto p-2">
        {rootItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-default-400 py-12">
            <Folder className="w-12 h-12 mb-4" />
            <p>Keine Dienstleistungen vorhanden</p>
            <Button variant="tertiary" onPress={handleAddRoot} className="mt-4">
              Erste Dienstleistung erstellen
            </Button>
          </div>
        ) : (
          rootItems.map((item) => (
            <TreeItemContainer
              key={item.id}
              item={item}
              level={0}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
            />
          ))
        )}
      </Card>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editItem={editItem}
        parentId={parentIdForNew}
        onSave={handleSave}
        onDelete={(id) => {
          const item = services.find(s => s.id === id)
          if (item) handleDelete(id)
        }}
        hasChildren={editItem ? hasChildren(editItem.id) : false}
      />

      {/* Standalone AlertDialog for swipe delete confirmation */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={deleteConfirmItem !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmItem(null)
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
                Die Gruppe „{deleteConfirmItem?.name}" enthält Unterelemente.
                Wenn Sie fortfahren, werden alle enthaltenen Dienstleistungen
                und Untergruppen ebenfalls gelöscht.
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onPress={() => setDeleteConfirmItem(null)}>
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
    </div>
  )
}



/*
        <div className="flex gap-2">
          <Button variant="tertiary" size="sm" onPress={handleExpandAll}>
            Alle aufklappen
          </Button>
          <Button variant="tertiary" size="sm" onPress={handleCollapseAll}>
            Alle zuklappen
          </Button>
          <Button variant="primary" onPress={handleAddRoot}>
            <Plus className="w-4 h-4 mr-2" />
            Neu
          </Button>
        </div>
        */