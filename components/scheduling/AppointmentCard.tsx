'use client'

import React, { useMemo, useCallback, memo } from 'react'
import { Card, Chip } from '@heroui/react'
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

      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          appointmentId: appointment.id,
          sourceDate: appointment.date.toISOString(),
        })
      )

      if (e.currentTarget) {
        e.currentTarget.style.opacity = '0.5'
      }
    },
    [isDraggable, appointment.id, appointment.date]
  )

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1'
    }
  }, [])

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
            {appointment.client.strasse} {appointment.client.houseNumber}, {appointment.client.plz}{' '}
            {appointment.client.ort}
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
      onDragEnd={handleDragEnd}
      onClick={e => {
        e.stopPropagation() // Prevent DayView button from triggering
        onClick?.()
      }}
      className={`
        ${isDraggable ? 'cursor-move' : 'cursor-pointer'}
      `}
    >
      {/* Desktop версия (≥ 800px) - полная информация в Card */}
      <Card
        className={`${forceDesktopView ? 'block' : 'hidden lg:block'} hover:scale-[1.02] transition-transform mb-2 shadow-xl rounded-md p-1!`}
      >
        <Card.Content>
          <div className="flex flex-col gap-1.5 p-1">
            {/* Header: Client name + Report indicator */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate flex-1">
                        {appointment.client ? appointment.client.surname + ' ' + appointment.client.name : 'Unknown Client'}
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
            <div className="flex items-center gap-1.5 text-xs text-default-600">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                {appointment.duration > 0 && (
                  <span className="text-default-400 ml-1">({appointment.duration} мин)</span>
                )}
              </span>
            </div>

            {/* Address */}
            {appointment.client && (
              <div className="flex items-start gap-1.5 text-xs text-default-500">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="truncate">
                  {appointment.client.strasse} {appointment.client.houseNumber},{' '}
                  {appointment.client.plz} {appointment.client.ort}
                </span>
              </div>
            )}

            {/* Tags */}
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
          </div>
        </Card.Content>
      </Card>

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
