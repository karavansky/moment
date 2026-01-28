'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button, Card, Spinner, AlertDialog, Tooltip } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { ServiceTreeItem } from '@/types/scheduling'
import { Folder, AlertTriangle, Plus, Expand, ListCollapse, HandHeart } from 'lucide-react'
import TreeItemContainer from './TreeItem'
import ServiceModal from './ServiceModal'

export default function ServicesTree() {
  const { services, isLoading, addService, updateService, deleteService } = useScheduling()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editItem, setEditItem] = useState<ServiceTreeItem | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ServiceTreeItem | null>(null)

  // Root items (parentId === null)
  const rootItems = useMemo(
    () => services.filter(s => s.parentId === null).sort((a, b) => a.order - b.order),
    [services]
  )

  // Check if item has children
  const hasChildren = useCallback(
    (itemId: string) => {
      return services.some(s => s.parentId === itemId)
    },
    [services]
  )

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
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
    const allGroupIds = services.filter(s => s.isGroup).map(s => s.id)
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
    setExpandedIds(prev => new Set([...prev, parentId]))
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
        <HandHeart className="w-6 h-6" />
        <h1 className="text-2xl font-semibold">Dienstleistungen</h1>
        <div className="flex gap-2">
          <Button  size="sm" onPress={handleExpandAll}>
            <Tooltip >
              <Expand className="w-5 h-5 " />
              <Tooltip.Content>
                <p>Alle aufklappen</p>
              </Tooltip.Content>
            </Tooltip>
          </Button>
          <Button size="sm" onPress={handleCollapseAll}>
            <Tooltip >
              <ListCollapse className="w-5 h-5 " />
              <Tooltip.Content>
                <p>Alle zuklappen</p>
              </Tooltip.Content>
            </Tooltip>
          </Button>
          <Button variant="primary" onPress={handleAddRoot}>
            <Plus className="w-4 h-4 mr-2" />
            Neu
          </Button>
        </div>
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
          rootItems.map(item => (
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
        onDelete={id => {
          const item = services.find(s => s.id === id)
          if (item) handleDelete(id)
        }}
        hasChildren={editItem ? hasChildren(editItem.id) : false}
      />

      {/* Standalone AlertDialog for swipe delete confirmation */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={deleteConfirmItem !== null}
          onOpenChange={open => {
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
                Die Gruppe „{deleteConfirmItem?.name}" enthält Unterelemente. Wenn Sie fortfahren,
                werden alle enthaltenen Dienstleistungen und Untergruppen ebenfalls gelöscht.
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
