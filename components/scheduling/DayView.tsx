'use client'

import React, { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react'
import { Card, Chip } from '@heroui/react'
import { CalendarDay, getOnlyDate, isSameDate } from '@/lib/calendar-utils'
import AppointmentCard from './AppointmentCard'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Calendar } from 'lucide-react'
import type { Appointment } from '@/types/scheduling'

interface DayViewProps {
  day: CalendarDay
  isToday?: boolean
  isSelected?: boolean
  onAppointmentPress?: (appointment: Appointment) => void
}

function DayView({ day, isToday = false, isSelected = false, onAppointmentPress }: DayViewProps) {
  const { setSelectedDate, setSelectedAppointment, moveAppointmentToDate } = useScheduling()
  const [isDragOver, setIsDragOver] = useState(false)

  // Ref для таймера задержки снятия выделения
  const dragLeaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (dragLeaveTimerRef.current) {
        clearTimeout(dragLeaveTimerRef.current)
      }
    }
  }, [])

  // Оптимизация: вычисляем today один раз при рендере, а не на каждом dragover
  const today = useMemo(() => getOnlyDate(new Date()), [])

  const handleDayClick = useCallback(() => {
    if (day.date) {
      setSelectedDate(day.date)
    }
  }, [day.date, setSelectedDate])

  const handleAppointmentClick = useCallback(
    (appointmentId: string) => {
      const appointment = day.appointments.find(apt => apt.id === appointmentId)
      if (appointment) {
        // Используем переданный callback если есть, иначе fallback на context
        if (onAppointmentPress) {
          onAppointmentPress(appointment)
        } else {
          setSelectedAppointment(appointment)
        }
      }
    },
    [day.appointments, onAppointmentPress, setSelectedAppointment]
  )

  const canDropHere = useCallback(
    (targetDate: Date | null): boolean => {
      if (!targetDate) return false
      const target = getOnlyDate(targetDate)
      return target >= today
    },
    [today]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!day.date || !canDropHere(day.date)) {
        e.dataTransfer.dropEffect = 'none'
        return
      }

      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      // Если есть активный таймер на скрытие (dragLeave), отменяем его,
      // так как мы все еще находимся над элементом (или вернулись на него)
      if (dragLeaveTimerRef.current) {
        clearTimeout(dragLeaveTimerRef.current)
        dragLeaveTimerRef.current = null
      }

      if (!isDragOver) setIsDragOver(true)
    },
    [day.date, canDropHere, isDragOver]
  )

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Предотвращаем мерцание: если мы перешли на дочерний элемент (например, карточку),
    // не считаем это выходом за пределы дня
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }

    // Вместо мгновенного снятия флага, запускаем таймер.
    // Если это было случайное срабатывание (например, на границе),
    // следующий dragOver отменит этот таймер.
    if (dragLeaveTimerRef.current) clearTimeout(dragLeaveTimerRef.current)

    dragLeaveTimerRef.current = setTimeout(() => {
      setIsDragOver(false)
      dragLeaveTimerRef.current = null
    }, 50) // 50мс достаточно для устранения дребезга
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()

      // Очищаем таймер и сбрасываем состояние
      if (dragLeaveTimerRef.current) {
        clearTimeout(dragLeaveTimerRef.current)
        dragLeaveTimerRef.current = null
      }
      setIsDragOver(false)

      if (!day.date || !canDropHere(day.date)) {
        return
      }

      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        const { appointmentId, sourceDate } = data

        const sourceDateObj = new Date(sourceDate)
        if (isSameDate(sourceDateObj, day.date)) {
          return
        }

        moveAppointmentToDate(appointmentId, getOnlyDate(day.date))
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    },
    [day.date, canDropHere, moveAppointmentToDate]
  )

  // Пустой день
  if (!day.day || !day.date) {
    return <div className="lg:min-w-30 h-24 sm:h-auto p-1 sm:p-2 bg-default-50" />
  }

  const hasAppointments = day.appointments.length > 0
  const isPast = !canDropHere(day.date)
  const canDrop = !isPast

  return (
    <div
      className={`
        lg:min-w-30 h-auto
        transition-all duration-200
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={!isPast ? handleDayClick : undefined}
        disabled={isPast}
        className="w-full text-left focus:outline-none"
      >
        {/* Desktop версия (≥ 800px) - красивый Card */}
        <Card
          className={`
            hidden lg:block
            h-full
            ${isPast ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            ${isToday && !isPast ? 'border-2 border-primary' : ''}
            ${isSelected ? 'ring-2 ring-primary' : ''}
            ${isDragOver && canDrop ? 'bg-success-50 border-2 border-success' : ''}
            ${isDragOver && !canDrop ? 'bg-danger-50 border-2 border-danger' : ''}
          `}
        >
          <Card.Content className="p-0">
            {/* День */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                {isToday && !isPast && <Calendar className="w-4 h-4 text-primary" />}
                <span
                  className={`
                    text-sm font-semibold inline-flex items-center justify-center
                    ${
                      isToday && !isPast
                        ? 'bg-danger text-white rounded-full w-6 h-6'
                        : isPast
                          ? 'text-default-400'
                          : 'text-foreground'
                    }
                  `}
                >
                  {day.day}
                </span>
              </div>

              {/* Счетчик appointments 
              {hasAppointments && (
                <Chip
                  size="sm"
                  variant="soft"
                  color={isPast ? 'default' : 'accent'}
                  className="h-5 min-w-5 px-1"
                >
                  <span className="text-xs">{day.appointments.length}</span>
                </Chip>
              )}
                */}
            </div>

            {/* Drop zone hint */}
            {isDragOver && canDrop && (
              <div className="text-xs text-success font-medium mb-1.5 text-center py-1 bg-success-100 rounded">
                Отпустите здесь
              </div>
            )}

            {isDragOver && !canDrop && (
              <div className="text-xs text-danger font-medium mb-1.5 text-center py-1 bg-danger-100 rounded">
                Нельзя в прошлое
              </div>
            )}

            {/* Appointments */}
            <div className="space-y-1">
              {day.appointments.map(appointment => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => handleAppointmentClick(appointment.id)}
                  isDraggable={!isPast}
                />
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Mobile версия (< 800px) - прозрачный div с минимальными отступами */}
        <div
          className={`
            lg:hidden
            h-full
            pt-0.5 pb-0.5
            flex flex-col
            
            ${isToday && !isPast ? 'border-l-2 border-primary' : 'border-l border-divider'}
            ${isSelected ? 'bg-primary/5' : 'bg-transparent'}
            ${isDragOver && canDrop ? 'bg-success-50 border-l-2 border-success' : ''}
            ${isDragOver && !canDrop ? 'bg-danger-50 border-l-2 border-danger' : ''}
          `}
        >
          {/* День - компактная версия */}
          <div className="px-0.5 mb-0.5 shrink-0 text-center">
            <span
              className={`
                text-[10px] font-semibold inline-flex items-center justify-center
                ${
                  isToday && !isPast
                    ? 'bg-danger text-white rounded-full w-5 h-5'
                    : isPast
                      ? 'text-default-400'
                      : 'text-foreground'
                }
                ${isPast ? 'opacity-50' : ''}
              `}
            >
              {day.day}
            </span>
          </div>

          {/* Drop zone hint - компактная версия */}
          {isDragOver && canDrop && (
            <div className="text-[9px] text-success font-medium mb-0.5 text-center py-0.5 bg-success-100 rounded">
              ✓
            </div>
          )}

          {isDragOver && !canDrop && (
            <div className="text-[9px] text-danger font-medium mb-0.5 text-center py-0.5 bg-danger-100 rounded">
              ✗
            </div>
          )}

          {/* Appointments */}
          <div className="space-y-0.5 flex-1">
            {day.appointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onClick={() => handleAppointmentClick(appointment.id)}
                isDraggable={!isPast}
              />
            ))}
          </div>
        </div>
      </button>
    </div>
  )
}

export default memo(DayView)
