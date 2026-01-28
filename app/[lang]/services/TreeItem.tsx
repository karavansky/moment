'use client'

import { useState, useMemo, useEffect } from 'react'
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
  openSwipeId,
  setOpenSwipeId,
}: {
  item: ServiceTreeItem
  level: number
  children: ServiceTreeItem[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (item: ServiceTreeItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  openSwipeId: string | null
  setOpenSwipeId: (id: string | null) => void
}) => {
  const isExpanded = expandedIds.has(item.id)
  const hasChildren = children.length > 0
  const isOpen = openSwipeId === item.id

  // Animation controls
  const controls = useAnimation()
  const DELETE_BUTTON_WIDTH = 80
  const SWIPE_THRESHOLD = 30

  // Sync animation with isOpen state
  useEffect(() => {
    if (isOpen) {
      controls.start({ x: -DELETE_BUTTON_WIDTH, transition: { type: "spring", stiffness: 400, damping: 40 } })
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } })
    }
  }, [isOpen, controls, DELETE_BUTTON_WIDTH])

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    // Open if dragged far enough left or flicked left
    if (offset < -SWIPE_THRESHOLD || velocity < -300) {
      setOpenSwipeId(item.id)
    } else {
      setOpenSwipeId(null)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    // Only handle if horizontal scroll is dominant
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const isScrollingRight = e.deltaX > 0
      
      // If scrolling right (positive deltaX), we want to move content left to reveal the button on the right
      if (isScrollingRight) {
        if (!isOpen && e.deltaX > 10) {
           setOpenSwipeId(item.id)
        }
      } else {
        // Scrolling left (negative deltaX), we want to close
        if (isOpen && e.deltaX < -10) {
           setOpenSwipeId(null)
        }
      }
    }
  }

  const handleContentClick = () => {
    if (isOpen) {
      setOpenSwipeId(null)
    } else {
      onEdit(item)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenSwipeId(null)
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

  const handlePointerDown = () => {
    if (openSwipeId && openSwipeId !== item.id) {
        setOpenSwipeId(null)
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden ">
        {/* Delete button behind */}
        <div
          className="absolute right-2 top-2 bottom-2 flex items-center justify-center rounded-full bg-danger text-white  h-30px "
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <Button
            isIconOnly
            variant="danger"
            size='lg'
            onClick={handleDeleteClick}
          >
            <Trash2 className="w-6 h-6" />
          </Button>
        </div>

        {/* Main content */}
        <motion.div
          className="flex items-center gap-2 py-3 px-2 rounded-3xl cursor-pointer  bg-zinc-100 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 relative z-10"
          style={{
            paddingLeft: `${level * 10 + 8}px`,
            touchAction: 'pan-y'
          }}
          drag="x"
          dragConstraints={{ left: -DELETE_BUTTON_WIDTH, right: 0 }}
          dragElastic={{ right: 0.05, left: 0.1 }}
          onDragEnd={handleDragEnd}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          animate={controls}
          onClick={handleContentClick}
          whileTap={{ scale: 0.98 }}
        >
          {item.isGroup ? (
            <Button 
            isIconOnly
            size="sm" 
            variant="tertiary"
            onClick={handleToggleClick} className="p-1 hover:bg-default-200 ">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-default-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-default-500" />
              )}
            </Button>
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
              openSwipeId={openSwipeId}
              setOpenSwipeId={setOpenSwipeId}
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
  openSwipeId,
  setOpenSwipeId,
}: {
  item: ServiceTreeItem
  level: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (item: ServiceTreeItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  openSwipeId: string | null
  setOpenSwipeId: (id: string | null) => void
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
      openSwipeId={openSwipeId}
      setOpenSwipeId={setOpenSwipeId}
    />
  )
}

export default TreeItemContainer
