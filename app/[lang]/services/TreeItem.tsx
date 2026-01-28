'use client'

import { useState, useRef, useMemo } from 'react'
import { Button } from '@heroui/react'
import { ChevronDown, ChevronRight, Folder, FileText, Plus, Trash2 } from 'lucide-react'
import type { TouchEvent } from 'react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { ServiceTreeItem, Service } from '@/types/scheduling'

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
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-full bg-danger text-white"
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
        <div
          className="flex items-center gap-2 py-3 px-2 rounded-3xl cursor-pointer bg-zinc-100 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
          style={{
            paddingLeft: `${level * 10 + 8}px`,
            transform: `translateX(-${swipeOffset}px)`,
            transition: isSwiping
              ? 'none'
              : 'transform 0.2s ease-out, background-color 0.2s, color 0.2s',
          }}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
        </div>
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
