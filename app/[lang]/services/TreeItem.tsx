'use client'

import { useState, useMemo } from 'react'
import { Button } from '@heroui/react'
import { ChevronDown, ChevronRight, Folder, FileText, Plus, Trash2 } from 'lucide-react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { ServiceTreeItem, Service } from '@/types/scheduling'
import { motion, useAnimation, PanInfo } from 'framer-motion'

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

  // Animation controls
  const controls = useAnimation()
  const [isOpen, setIsOpen] = useState(false)
  const DELETE_BUTTON_WIDTH = 80
  const SWIPE_THRESHOLD = 30

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    // Open if dragged far enough left or flicked left
    if (offset < -SWIPE_THRESHOLD || velocity < -300) {
      setIsOpen(true)
      controls.start({ x: -DELETE_BUTTON_WIDTH, transition: { type: "spring", stiffness: 400, damping: 40 } })
    } else {
      // Close
      setIsOpen(false)
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } })
    }
  }

  const handleContentClick = () => {
    if (isOpen) {
      setIsOpen(false)
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } })
    } else {
      onEdit(item)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // We assume onDelete might handle its own confirmation or state update.
    // If it deletes immediately, this component unmounts.
    // If it shows a dialog, we might want to close the swipe or keep it open.
    // Let's close it for safety/cleanliness.
    setIsOpen(false)
    controls.start({ x: 0 })
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
          className="absolute right-2 top-2 bottom-2 flex items-center justify-center rounded-full bg-danger text-white"
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <button
            onClick={handleDeleteClick}
            className="flex items-center justify-center w-full h-full "
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        {/* Main content */}
        <motion.div
          className="flex items-center gap-2 py-3 px-2 rounded-3xl cursor-pointer bg-zinc-100 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 relative z-10"
          style={{
            paddingLeft: `${level * 10 + 8}px`,
            touchAction: 'pan-y'
          }}
          drag="x"
          dragConstraints={{ left: -DELETE_BUTTON_WIDTH, right: 0 }}
          dragElastic={{ right: 0.05, left: 0.1 }}
          onDragEnd={handleDragEnd}
          animate={controls}
          onClick={handleContentClick}
          whileTap={{ scale: 0.98 }}
        >
          {item.isGroup ? (
            <button onClick={handleToggleClick} className="p-1 hover:bg-default-200 rounded">
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
              onClick={handleAddClick}
              aria-label="Kind hinzufügen"
            >
              <Plus className="w-4 h-4 text-default-500" />
            </Button>
          )}
        </motion.div>
      </div>

      {item.isGroup && isExpanded && hasChildren && (
        <div>
          {children.map(child => (
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
    () => services.filter(s => s.parentId === item.id).sort((a, b) => a.order - b.order),
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

export default TreeItemContainer