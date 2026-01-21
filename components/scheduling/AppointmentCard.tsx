'use client'

import React, { useMemo, useCallback, memo, useRef, useState, useEffect } from 'react'
import { Chip } from '@heroui/react'
import { SimpleTooltip } from '@/components/SimpleTooltip'
import TruncatedChip from './TruncatedChip'
import { Appointment } from '@/types/scheduling'
import { formatTime } from '@/lib/calendar-utils'
import { Clock, MapPin, User, CheckCircle, CircleAlert } from 'lucide-react'

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: () => void
  isDraggable?: boolean
  forceDesktopView?: boolean
}

function AppointmentCard({
  appointment,
  onClick,
  isDraggable = true,
  forceDesktopView = false,
}: AppointmentCardProps) {
  const hasReport = appointment.reports && appointment.reports.length > 0

  // Мемоизируем проверку прошлого
  const isPastWithoutReport = useMemo((): boolean => {
    if (hasReport) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const appointmentDate = new Date(appointment.date)
    appointmentDate.setHours(0, 0, 0, 0)

    return appointmentDate < today
  }, [hasReport, appointment.date])

  // Мемоизируем цвет чипа
  const chipColor = useMemo((): 'success' | 'warning' | 'accent' => {
    if (hasReport) return 'success'

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const appointmentDate = new Date(appointment.date)
    appointmentDate.setHours(0, 0, 0, 0)

    if (appointmentDate < today) {
      return 'warning'
    }

    return 'accent'
  }, [hasReport, appointment.date])

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isDraggable) {
        e.preventDefault()
        return
      }

      console.log('[AppointmentCard] Drag start', { id: appointment.id })
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          appointmentId: appointment.id,
          sourceDate: appointment.date.toISOString(),
        })
      )

      // --- Canvas Generation Logic ---
      try {
        const canvas = document.createElement('canvas')
        const width = 200
        const height = 60
        const scale = window.devicePixelRatio > 1 ? 2 : 1 // Cap at 2x

        canvas.width = width * scale
        canvas.height = height * scale
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.error('Failed to get 2D context')
          return
        }

        ctx.scale(scale, scale)

        const isDark = document.documentElement.classList.contains('dark')

        // --- Workaround for WebKit alpha channel bug ---
        // Fill the entire canvas with a solid color matching the page background.
        // This avoids transparency, which iOS renders as black corners.
        ctx.fillStyle = isDark ? '#111827' : '#ffffff' // bg-gray-900 or white
        ctx.fillRect(0, 0, width, height)

        // Draw rounded rectangle
        const x = 2,
          y = 2,
          w = width - 4,
          h = height - 4,
          r = 12
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()

        // Fill and Stroke
        ctx.fillStyle = isDark ? '#1f2937' : '#ffffff'
        ctx.fill()
   //     ctx.lineWidth = 2
   //     ctx.strokeStyle = '#006FEE'
   //     ctx.stroke()

        // Text
        const clientName = appointment.client
          ? `${appointment.client.surname} ${appointment.client.name}`
          : 'Unknown Client'
        const timeText = `${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime)}`

        ctx.fillStyle = isDark ? '#ffffff' : '#000000'
        ctx.font = 'bold 14px system-ui, sans-serif'
        ctx.fillText(clientName, x + 12, y + 22, w - 24)

        ctx.fillStyle = '#71717a'
        ctx.font = '12px system-ui, sans-serif'
        ctx.fillText(timeText, x + 12, y + 42, w - 24)

        // Add to DOM for iOS compatibility
        canvas.style.position = 'fixed'
        canvas.style.top = '-9999px'
        canvas.style.left = '-9999px'
        document.body.appendChild(canvas)

        // Set drag image
        let offsetX = width
        let offsetY = height
        if (e.clientX < width) offsetX = 0
        if (e.clientY < height) offsetY = 0
        e.dataTransfer.setDragImage(canvas, offsetX, offsetY)

        // Cleanup
        setTimeout(() => {
          if (document.body.contains(canvas)) {
            document.body.removeChild(canvas)
          }
        }, 0)
      } catch (err) {
        console.error('[AppointmentCard] Error generating canvas drag image:', err)
      }
    },
    [
      isDraggable,
      appointment.id,
      appointment.date,
      appointment.client,
      appointment.startTime,
      appointment.endTime,
    ]
  )

  // Контент для tooltip на мобильной версии
  const tooltipContent = (
    <div className="space-y-1 min-w-50">
      <div className="font-semibold text-sm border-b border-gray-700 pb-1">
        {appointment.client
          ? appointment.client.surname + ' ' + appointment.client.name
          : 'Unknown Client'}
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <User className="w-3 h-3 shrink-0" />
        <span>{appointment.worker ? appointment.worker.workerName : 'Unknown Worker'}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <Clock className="w-3 h-3 shrink-0" />
        <span>
          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          {appointment.duration > 0 && (
            <span className="text-gray-400 ml-1">({appointment.duration} мин)</span>
          )}
        </span>
      </div>

      {appointment.client && (
        <div className="flex items-start gap-1.5 text-xs">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="text-xs">
            {appointment.client.street} {appointment.client.houseNumber},{' '}
            {appointment.client.postalCode} {appointment.client.city}
          </span>
        </div>
      )}

      <div className="flex gap-1 flex-wrap pt-1">
        {appointment.isFixedTime && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded">Фикс. время</span>
        )}
        {appointment.fahrzeit > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded">
            +{appointment.fahrzeit} мин в пути
          </span>
        )}
        {hasReport && (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-700 rounded flex items-center gap-0.5">
            <CheckCircle className="w-2.5 h-2.5" /> Отчёт
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onClick={e => {
        e.stopPropagation() // Prevent DayView button from triggering
        onClick?.()
      }}
      className={`
        ${isDraggable ? 'cursor-move' : 'cursor-pointer'}
        relative
        select-none
      `}
    >
      {/* Desktop версия (≥ 800px) - полная информация в Card */}
      <div
        className={`${forceDesktopView ? 'block' : 'hidden lg:block'} hover:scale-[1.02] transition-transform mb-2 shadow-xl rounded-md p-1! bg-content1`}
      >
        <div className="flex flex-col gap-1.5 p-1">
          {/* Header: Client name + Report indicator */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate flex-1">
              {appointment.client
                ? appointment.client.surname + ' ' + appointment.client.name
                : 'Unknown Client'}
            </h4>
            {hasReport && <CheckCircle className="w-4 h-4 text-success shrink-0" />}
            {isPastWithoutReport && <CircleAlert className="w-4 h-4 text-danger shrink-0" />}
          </div>

          {/* Worker */}
          <div className="flex items-center gap-1.5 text-xs text-default-600">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{appointment.worker?.workerName || 'Unknown Worker'}</span>
          </div>

          {/* Time */}


          {/* Address */}


          {/* Tags */}

        </div>
      </div>

      {/* Mobile версия (< 800px) - только Chip с Tooltip */}
      <div
        className={`${forceDesktopView ? 'hidden' : 'lg:hidden'} mb-0.5 px-0.5 flex justify-center min-w-0`}
      >
        <TruncatedChip size="sm" color={chipColor} variant="primary">
          <span className="truncate block min-w-0">
            {appointment.client ? appointment.client.surname : 'Unknown Client'}
          </span>
        </TruncatedChip>
      </div>
    </div>
  )
}

export default memo(AppointmentCard)

/*
          <div className="flex items-center gap-1.5 text-xs text-default-600">
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
              {appointment.duration > 0 && (
                <span className="text-default-400 ml-1">({appointment.duration} мин)</span>
              )}
            </span>
          </div> 
          
          {appointment.client && (
            <div className="flex items-start gap-1.5 text-xs text-default-500">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="truncate">
                {appointment.client.street} {appointment.client.houseNumber},{' '}
                {appointment.client.postalCode} {appointment.client.city}
              </span>
            </div>
          )}

          <div className="flex gap-1 flex-wrap mt-1">
            {appointment.isFixedTime && (
              <Chip size="sm" color="accent" variant="soft" className="text-xs">
                Фикс. время
              </Chip>
            )}
            {appointment.fahrzeit > 0 && (
              <Chip size="sm" color="default" variant="soft" className="text-xs">
                +{appointment.fahrzeit} мин в пути
              </Chip>
            )}
          </div>
*/