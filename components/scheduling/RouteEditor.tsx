'use client'

import React, { useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import AddressAutocomplete from './AddressAutocomplete'

export interface RoutePoint {
  id: string
  address: string
  lat?: number
  lng?: number
}

interface RouteEditorProps {
  points: RoutePoint[]
  onChange: (points: RoutePoint[]) => void
  error?: string
}

function RouteEditor({ points, onChange, error }: RouteEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Добавить новый пункт
  const addPoint = (afterIndex?: number) => {
    const newPoint: RoutePoint = {
      id: `point_${Date.now()}_${Math.random()}`,
      address: '',
    }

    if (afterIndex !== undefined) {
      // Вставить после указанного индекса
      const newPoints = [...points]
      newPoints.splice(afterIndex + 1, 0, newPoint)
      onChange(newPoints)
    } else {
      // Добавить в конец
      onChange([...points, newPoint])
    }
  }

  // Удалить пункт
  const removePoint = (index: number) => {
    if (points.length <= 2) {
      // Минимум 2 пункта (откуда и куда)
      return
    }
    const newPoints = points.filter((_, i) => i !== index)
    onChange(newPoints)
  }

  // Обновить адрес пункта
  const updatePoint = (index: number, address: string, lat?: number, lng?: number) => {
    const newPoints = [...points]
    newPoints[index] = { ...newPoints[index], address, lat, lng }
    onChange(newPoints)
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newPoints = [...points]
    const draggedPoint = newPoints[draggedIndex]
    newPoints.splice(draggedIndex, 1)
    newPoints.splice(index, 0, draggedPoint)

    setDraggedIndex(index)
    onChange(newPoints)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Инициализация: если точек нет, добавляем 2 по умолчанию
  React.useEffect(() => {
    if (points.length === 0) {
      onChange([
        { id: 'start', address: '' },
        { id: 'end', address: '' },
      ])
    }
  }, [])

  return (
    <div className="space-y-3">
      {points.map((point, index) => (
        <div
          key={point.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-2 ${
            draggedIndex === index ? 'opacity-50' : ''
          }`}
        >
          {/* Drag Handle */}
          <div className="cursor-move text-default-400 hover:text-default-600">
            <GripVertical size={18} />
          </div>

          {/* Point Number */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold">
            {index + 1}
          </div>

          {/* Address Autocomplete */}
          <div className="flex-1">
            <AddressAutocomplete
              placeholder={
                index === 0
                  ? 'Пункт отправления'
                  : index === points.length - 1
                    ? 'Пункт прибытия'
                    : `Промежуточный пункт ${index}`
              }
              value={point.address}
              onChange={(address, lat, lng) => updatePoint(index, address, lat, lng)}
              fullWidth
              aria-label={`Route point ${index + 1}`}
            />
          </div>

          {/* Add Intermediate Point Button */}
          {index < points.length - 1 && (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => addPoint(index)}
              className="text-default-400 hover:text-primary-500"
            >
              <Plus size={16} />
            </Button>
          )}

          {/* Remove Point Button */}
          {points.length > 2 && (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => removePoint(index)}
              className="text-default-400 hover:text-danger-500"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ))}

      {/* Add Final Point Button */}
      <Button
        size="sm"
        variant="outline"
        onPress={() => addPoint()}
        className="w-full"
      >
        <Plus size={16} />
        Добавить пункт в конец
      </Button>

      {error && <p className="text-xs text-danger-500 mt-1">{error}</p>}

      {/* Info Text */}
      <div className="text-xs text-default-400 mt-2">
        <p>• Перетаскивайте пункты для изменения порядка</p>
        <p>• Нажмите <Plus size={12} className="inline" /> между пунктами для добавления промежуточных</p>
        <p>• Минимум 2 пункта (отправление и прибытие)</p>
      </div>
    </div>
  )
}

export default RouteEditor
