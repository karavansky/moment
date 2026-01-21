'use client'

import React, { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react'
import { Card, Chip } from '@heroui/react'
import { CalendarDay, getOnlyDate, isSameDate } from '@/lib/calendar-utils'
import AppointmentCard from './AppointmentCard'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Calendar } from 'lucide-react'
import type { Appointment } from '@/types/scheduling'
import { usePlatformContext } from '@/contexts/PlatformContext'

interface DayViewProps {
  day: CalendarDay
  isToday?: boolean
  isSelected?: boolean
  onAppointmentPress?: (appointment: Appointment) => void
  onExternalDrop?: (date: Date, type: 'client' | 'worker', id: string) => void
  onDayPress?: (date: Date) => void
}

function DayView({
  day,
  isToday = false,
  isSelected = false,
  onAppointmentPress,
  onExternalDrop,
  onDayPress,
}: DayViewProps) {
  const { setSelectedDate, setSelectedAppointment, moveAppointmentToDate } = useScheduling()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const { isMobile, isReady } = usePlatformContext()
  // Ref для таймера задержки снятия выделения
  const dragLeaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Глобальный слушатель для надежного сброса состояния при окончании любого перетаскивания
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      // Принудительно убираем подсветку, когда перетаскивание закончилось где угодно на странице
      if (dragLeaveTimerRef.current) {
        clearTimeout(dragLeaveTimerRef.current)
        dragLeaveTimerRef.current = null
      }
      setIsDragOver(false)
    }

    // Событие 'dragend' не всплывает, поэтому слушаем на window
    window.addEventListener('dragend', handleGlobalDragEnd)
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd)
    }
  }, [])

  // Оптимизация: вычисляем today один раз при рендере, а не на каждом dragover
  const today = useMemo(() => getOnlyDate(new Date()), [])

  const handleDayClick = useCallback(() => {
    console.log('Day clicked:', day.date)
    setIsPressed(true)
    if (day.date) {
      if (onDayPress) {
        onDayPress(day.date)
      } else {
        setSelectedDate(day.date)
      }
    }
  }, [day.date, setSelectedDate, onDayPress, setIsPressed])

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

  // Handlers for manual pressed state
  const handleMouseDown = useCallback(() => {
    console.log('MouseDown on day:', day.date)
    if (day.date && canDropHere(day.date)) {
      setIsPressed(true)
    }
  }, [day.date, canDropHere])

  const handleMouseUp = useCallback(() => {
    setIsPressed(false)
  }, [])

  const handleMouseLeaveBtn = useCallback(() => {
    setIsPressed(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!day.date) return

      e.preventDefault()
      e.dataTransfer.dropEffect = canDropHere(day.date) ? 'move' : 'none'

      // Отменяем любой отложенный вызов dragLeave, так как мы все еще над элементом
      if (dragLeaveTimerRef.current) {
        clearTimeout(dragLeaveTimerRef.current)
        dragLeaveTimerRef.current = null
      }
      // Включаем подсветку, если она еще не включена
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
        const rawData = e.dataTransfer.getData('application/json')
        if (!rawData) return

        const data = JSON.parse(rawData)

        // Handle external drop (Client/Worker)
        if (data.type === 'client' || data.type === 'worker') {
          onExternalDrop?.(day.date, data.type, data.id)
          return
        }

        // Handle internal appointment move
        const { appointmentId, sourceDate } = data
        if (appointmentId && sourceDate) {
          const sourceDateObj = new Date(sourceDate)
          if (isSameDate(sourceDateObj, day.date)) {
            return
          }
          moveAppointmentToDate(appointmentId, getOnlyDate(day.date))
        }
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    },
    [day.date, canDropHere, moveAppointmentToDate, onExternalDrop]
  )

  // Пустой день
  if (!day.day || !day.date) {
    return (
      <div
        className={`lg:min-w-30 ${isMobile ? 'min-h-12' : 'min-h-24'} h-full p-1 sm:p-2 bg-default-50`}
      />
    )
  }

  const hasAppointments = day.appointments.length > 0
  const isPast = !canDropHere(day.date)
  const canDrop = !isPast

  return (
    <div
      className={`
        ${isMobile ? 'min-h-12' : 'min-h-24'} h-full
        transition-all duration-200
        select-none 
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={!isPast ? handleDayClick : undefined}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveBtn}
        disabled={isPast}
        className={`w-full h-full text-left rounded-xl`}
      >
        {/* Desktop версия (≥ 800px) - красивый Card */}
        <Card
          className={`
            hidden lg:block
            h-full
            transition-transform duration-100 ease-in-out
            ${isPressed ? 'scale-[0.95] bg-surface-quaternary' : ''}
            ${isPast ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            ${isToday && !isPast ? 'border-2 border-primary' : ''}
            ${isDragOver && canDrop ? 'bg-success/50 border-2 border-success' : ''}
            ${isDragOver && !canDrop ? 'bg-danger/50 border-2 border-danger' : ''}
          `}
        >
          <Card.Content className="p-0">
            {/* День */}
            <div className="flex items-center justify-between ">
              <div className="flex items-center gap-1">
                {isToday && !isPast && <Calendar className="w-4 h-4 " />}
                <span
                  className={`
                    text-md font-normal inline-flex items-center justify-center select-none
                    ${
                      isToday && !isPast
                        ? 'bg-danger text-white rounded-full w-6 h-6'
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
              <div className="text-xs text-success font-medium mb-1.5 text-center py-1 bg-success-100 rounded select-none">
                Отпустите здесь
              </div>
            )}

            {isDragOver && !canDrop && (
              <div className="text-xs text-danger font-medium mb-1.5 text-center py-1 bg-danger-100 rounded select-none">
                Нельзя в прошлое
              </div>
            )}

            {/* Appointments */}
            <div className="space-y-1 " onMouseDown={(e) => e.stopPropagation()}>
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
            w-full h-full
            pt-0.5 pb-0.5
            flex flex-col
            rounded-xl
            ${isPressed ? 'scale-[0.95] bg-surface-quaternary' : ''}
            ${isToday && !isPast ? 'border-l-2 border-primary' : 'border-l border-divider'}
            ${
              isDragOver
                ? canDrop
                  ? '!bg-success/50'
                  : '!bg-danger/50'
                : isSelected
                  ? 'bg-primary/5'
                  : 'bg-transparent'
            }
          `}
        >
          {/* День - компактная версия */}
          <div className="px-0.5 mb-0.5 shrink-0 text-center">
            <span
              className={`
                text-[14px] font-semibold inline-flex items-center justify-center select-none
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
            <div className="text-[9px] text-success font-medium mb-0.5 text-center py-0.5 bg-success-100 rounded select-none">
              ✓
            </div>
          )}

          {isDragOver && !canDrop && (
            <div className="text-[9px] text-danger font-medium mb-0.5 text-center py-0.5 bg-danger-100 rounded select-none">
              ✗
            </div>
          )}

          {/* Appointments */}
          <div className="space-y-2 flex-1" onMouseDown={(e) => e.stopPropagation()}>
            {day.appointments.slice(0, 3).map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onClick={() => handleAppointmentClick(appointment.id)}
                isDraggable={!isPast}
              />
            ))}
            {day.appointments.length > 3 && (
              <div className="flex justify-center h-2 items-start">
                <span className="text-[10px] leading-none text-default-400 font-bold select-none">...</span>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

export default memo(DayView)
