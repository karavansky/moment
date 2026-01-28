'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button, Card, Spinner, AlertDialog } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { ServiceTreeItem } from '@/types/scheduling'
import { Folder, AlertTriangle, Plus, Expand, ListCollapse, HandHeart } from 'lucide-react'
import TreeItemContainer from './TreeItem'
import ServiceModal from './ServiceModal'
import { SimpleTooltip } from '@/components/SimpleTooltip'

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

  // Optimization: Pre-calculate which items have children for O(1) lookup
  const parentIdsWithChildren = useMemo(() => {
    const ids = new Set<string>()
    services.forEach(s => {
      if (s.parentId) ids.add(s.parentId)
    })
    return ids
  }, [services])

  // Check if item has children (O(1))
  const hasChildren = useCallback(
    (itemId: string) => {
      return parentIdsWithChildren.has(itemId)
    },
    [parentIdsWithChildren]
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

  const handleExpandAll = useCallback(() => {
    const allGroupIds = services.filter(s => s.isGroup).map(s => s.id)
    setExpandedIds(new Set(allGroupIds))
  }, [services])

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const handleEdit = useCallback((item: ServiceTreeItem) => {
    setEditItem(item)
    setParentIdForNew(null)
    setIsModalOpen(true)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      const item = services.find(s => s.id === id)
      if (!item) return

      if (item.isGroup && hasChildren(id)) {
        setDeleteConfirmItem(item)
      } else {
        deleteService(id)
      }
    },
    [services, hasChildren, deleteService]
  )

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmItem) {
      deleteService(deleteConfirmItem.id)
      setDeleteConfirmItem(null)
    }
  }, [deleteConfirmItem, deleteService])

  const handleAddChild = useCallback((parentId: string) => {
    setEditItem(null)
    setParentIdForNew(parentId)
    setExpandedIds(prev => new Set([...prev, parentId]))
    setIsModalOpen(true)
  }, [])

  const handleAddRoot = useCallback(() => {
    setEditItem(null)
    setParentIdForNew(null)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setEditItem(null)
    setParentIdForNew(null)
  }, [])

  const handleSave = useCallback(
    (item: ServiceTreeItem) => {
      if (editItem) {
        updateService(item)
      } else {
        addService(item)
      }
    },
    [editItem, updateService, addService]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-2 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2"> 
        <HandHeart className="w-8 h-8" />
        <h1 className="text-2xl font-semibold truncate">Dienstleistungen</h1>
        </div>
        <div className="flex gap-1">
          <SimpleTooltip content="Alle aufklappen">
            <Button size="sm" onPress={handleExpandAll}>
              <Expand className="w-5 h-5" />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Alle zuklappen">
            <Button size="sm" onPress={handleCollapseAll}>
              <ListCollapse className="w-5 h-5" />
            </Button>
          </SimpleTooltip>
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
