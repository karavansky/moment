'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { VirtuosoGrid, VirtuosoGridHandle } from 'react-virtuoso'
import { Card, Chip, ScrollShadow, Button } from '@heroui/react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { isSameDate, getOnlyDate, formatTime } from '@/lib/calendar-utils'
import AppointmentCard from './AppointmentCard'
import { useLanguage } from '@/hooks/useLanguage'
import type { Appointment } from '@/types/scheduling'

interface WeeklyViewProps {
  onAppointmentPress?: (appointment: Appointment) => void
  onExternalDrop?: (date: Date, type: 'client' | 'worker', id: string) => void
}

// Получить понедельник недели для указанной даты
const getMonday = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Функция для получения коротких названий дней недели на основе локали
const getWeekdayShortNames = (locale: string): string[] => {
  const baseDate = new Date(2024, 0, 1) // Понедельник, 1 января 2024
  const names: string[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + i)
    const shortName = date.toLocaleDateString(locale, { weekday: 'short' })
    names.push(shortName.charAt(0).toUpperCase() + shortName.slice(1))
  }

  return names
}

export default function WeeklyView({ onAppointmentPress, onExternalDrop }: WeeklyViewProps) {
  const { appointments, setSelectedAppointment, moveAppointmentToDate } = useScheduling()
  const lang = useLanguage()
  const today = getOnlyDate(new Date())

  // Генерируем короткие названия дней недели на основе текущей локали
  const WEEKDAY_NAMES = useMemo(() => getWeekdayShortNames(lang), [lang])

  const [currentDate, setCurrentDate] = useState(today)
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(today))
  const virtuosoRef = useRef<VirtuosoGridHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        // Обновляем размеры только если они валидны (> 0), чтобы избежать схлопывания
        if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width)
        if (entry.contentRect.height > 0) setContainerHeight(entry.contentRect.height)
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Создаем большой, но конечный список дней для виртуализации
  // +/- 1 год от сегодняшнего дня
  const allDays = useMemo(() => {
    const days = []
    const centerDate = today
    const weeksToRender = 52 // 52 недели до и 52 после
    const daysToGenerate = weeksToRender * 7

    for (let i = -daysToGenerate; i <= daysToGenerate; i++) {
      const date = new Date(centerDate)
      date.setDate(centerDate.getDate() + i)
      days.push(getOnlyDate(date))
    }
    return days
  }, [today])

  // Генерируем текущую неделю для header (desktop и tablet)
  const currentWeekDays = useMemo(() => {
    const monday = getMonday(currentWeekStart)
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      days.push(getOnlyDate(date))
    }
    return days
  }, [currentWeekStart])

  // Переключение недели
  const handlePrevWeek = () => {
    // Сохраняем день недели текущего дня
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    const newDateOnly = getOnlyDate(newDate)

    setCurrentDate(newDateOnly)
    setCurrentWeekStart(getMonday(newDateOnly))
  }

  const handleNextWeek = () => {
    // Сохраняем день недели текущего дня
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    const newDateOnly = getOnlyDate(newDate)

    setCurrentDate(newDateOnly)
    setCurrentWeekStart(getMonday(newDateOnly))
  }

  // Scroll to current day when it changes
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      const currentDayIndex = allDays.findIndex(day => isSameDate(day, currentDate))

      if (virtuosoRef.current && currentDayIndex !== -1) {
        virtuosoRef.current.scrollToIndex({
          index: currentDayIndex,
          align: 'center',
          behavior: 'smooth',
        })
      }
    }, 50) // 50ms delay

    return () => clearTimeout(scrollTimeout)
  }, [currentDate, allDays]) // Keep dependencies

  const initialDayIndex = useMemo(() => {
    return allDays.findIndex(day => isSameDate(day, today))
  }, [allDays, today])

  const handleAppointmentClick = useCallback(
    (appointmentId: string) => {
      const appointment = appointments.find(apt => apt.id === appointmentId)
      if (appointment) {
        // Используем переданный callback если есть, иначе fallback на context
        if (onAppointmentPress) {
          onAppointmentPress(appointment)
        } else {
          setSelectedAppointment(appointment)
        }
      }
    },
    [appointments, onAppointmentPress, setSelectedAppointment]
  )

  // Drag & Drop handlers for WeeklyView cards
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, date: Date) => {
      e.preventDefault()
      const isPast = date < today
      if (isPast) {
        e.dataTransfer.dropEffect = 'none'
        return
      }
      e.dataTransfer.dropEffect = 'move'
    },
    [today]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, date: Date) => {
      e.preventDefault()
      const isPast = date < today
      if (isPast) return

      try {
        const rawData = e.dataTransfer.getData('application/json')
        if (!rawData) return
        const data = JSON.parse(rawData)

        // Handle external drop
        if (data.type === 'client' || data.type === 'worker') {
          onExternalDrop?.(date, data.type, data.id)
          return
        }

        // Handle internal move
        const { appointmentId, sourceDate } = data
        if (appointmentId && sourceDate) {
          const sourceDateObj = new Date(sourceDate)
          if (isSameDate(sourceDateObj, date)) return
          moveAppointmentToDate(appointmentId, getOnlyDate(date))
        }
      } catch (error) {
        console.error('Error handling drop in WeeklyView:', error)
      }
    },
    [today, moveAppointmentToDate, onExternalDrop]
  )

  // Форматирование диапазона дат для заголовка
  const weekRangeString = useMemo(() => {
    // Генерируем 7 дней текущей недели от понедельника
    const monday = getMonday(currentWeekStart)
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      weekDays.push(getOnlyDate(day))
    }

    const firstDay = weekDays[0]
    const lastDay = weekDays[6]

    const firstDayNum = firstDay.getDate()
    const lastDayNum = lastDay.getDate()
    const firstMonth = firstDay.toLocaleDateString(lang, { month: 'long' })
    const lastMonth = lastDay.toLocaleDateString(lang, { month: 'long' })
    const firstYear = firstDay.getFullYear()
    const lastYear = lastDay.getFullYear()

    // Если месяцы и годы одинаковые
    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `${firstDayNum} - ${lastDayNum} ${firstMonth} ${firstYear}`
    }
    // Если годы одинаковые, но разные месяцы
    else if (firstYear === lastYear) {
      const firstMonthShort = firstDay.toLocaleDateString(lang, { month: 'short' })
      return `${firstDayNum} ${firstMonthShort} - ${lastDayNum} ${lastMonth} ${firstYear}`
    }
    // Если разные годы
    else {
      const firstMonthShort = firstDay.toLocaleDateString(lang, { month: 'short' })
      const lastMonthShort = lastDay.toLocaleDateString(lang, { month: 'short' })
      return `${firstDayNum} ${firstMonthShort} ${firstYear} - ${lastDayNum} ${lastMonthShort} ${lastYear}`
    }
  }, [currentWeekStart, lang])

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped = appointments.reduce(
      (acc, appointment) => {
        const dateKey = getOnlyDate(appointment.date).toISOString()
        if (!acc[dateKey]) {
          acc[dateKey] = []
        }
        acc[dateKey].push(appointment)
        return acc
      },
      {} as Record<string, typeof appointments>
    )

    // Sort appointments for each day once
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        return a.startTime > b.startTime ? 1 : a.startTime < b.startTime ? -1 : 0
      })
    })

    return grouped
  }, [appointments])

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header with current date */}
      <div className="shrink-0 bg-background border-b rounded-2xl border-divider pb-3">
        <div className="flex items-center justify-between gap-2 px-2 sm:px-4 mb-3">
          <Button
            onClick={handlePrevWeek}
            className=""
            aria-label="Next week"
            variant="ghost"
            isIconOnly
            size="lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-bold">{weekRangeString}</h2>
          </div>

          <Button
            onClick={handleNextWeek}
            className=""
            aria-label="Next week"
            variant="ghost"
            isIconOnly
            size="lg"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Week days header - Desktop version (≥1024px, static, full names) */}
        <div className="flex justify-center gap-2 px-2">
          {currentWeekDays.map((day, dayIndex) => {
            const isToday = isSameDate(day, today)
            const isCurrentDay = isSameDate(day, currentDate)

            // Получаем полное название дня недели на основе текущей локали
            const weekdayLong = day.toLocaleDateString(lang, { weekday: 'long' })
            const capitalizedWeekdayLong =
              weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1)

            // Определяем вариант кнопки
            const buttonVariant = isCurrentDay ? 'primary' : isToday ? 'danger' : 'tertiary'

            return (
              <div key={day.toISOString()} className="flex flex-1 flex-col items-center gap-1">
                {/* Полное название дня */}
                <div className="text-xs text-default-500 text-center hidden sm:block">
                  {capitalizedWeekdayLong}
                </div>
                <div className="text-xs text-default-500 text-center block sm:hidden">
                  {WEEKDAY_NAMES[dayIndex]}
                </div>
                <Button
                  size="sm"
                  variant={buttonVariant}
                  onPress={() => setCurrentDate(day)}
                  className="min-w-0 w-10 h-10 p-0 rounded-full flex items-center justify-center"
                >
                  <div className="text-lg font-bold">{day.getDate()}</div>
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Horizontal scrollable days (DayView cards) */}
      <div className="flex-1 min-h-0" ref={containerRef}>
        {containerWidth > 0 && containerHeight > 0 && (
          <VirtuosoGrid
            ref={virtuosoRef}
            style={{ height: containerHeight }}
            totalCount={allDays.length}
            initialTopMostItemIndex={initialDayIndex !== -1 ? { index: initialDayIndex, align: 'center' } : undefined}
            components={{
              List: React.forwardRef<HTMLDivElement, { style?: React.CSSProperties; children?: React.ReactNode }>(({ style, children }, ref) => (
                <div ref={ref} style={{ ...style, display: 'flex', flexDirection: 'row' }} className="h-full">
                  {children}
                </div>
              )),
              Item: ({ children, ...props }) => (
                <div {...props} style={{ ...props.style, width: containerWidth }} className="h-full shrink-0 snap-center p-2">
                  {children}
                </div>
              ),
            }}
            itemContent={(index) => {
            const day = allDays[index]
            const isToday = isSameDate(day, today)
            const isCurrentDay = isSameDate(day, currentDate)
            const dayAppointments = appointmentsByDate[day.toISOString()] || []

            return (
              <div
                key={day.toISOString()}
                onClick={() => setCurrentDate(day)}
                onDragOver={e => handleDragOver(e, day)}
                onDrop={e => handleDrop(e, day)}
                className={`h-full cursor-pointer ${isCurrentDay ? 'ring-2 ring-primary' : ''}`}
              >
                <Card className={`h-full ${isToday ? 'border-2 border-danger' : isCurrentDay ? 'border-2 border-primary' : ''}`}>
                  <Card.Content className="p-2 h-full flex flex-col">
                    <div className="mb-3 pb-2 border-b border-divider text-center">
                      <div className={`text-lg font-bold ${isToday ? 'text-danger' : isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                        {day.toLocaleDateString(lang, { weekday: 'long' })}, {day.getDate()}.{' '}
                        {day.toLocaleDateString(lang, { month: 'long' })}
                      </div>
                    </div>
                    <ScrollShadow className="flex-1 min-h-0" hideScrollBar={false}>
                      <div className="relative" style={{ height: `${24 * 60}px` }}>
                        <div className="absolute inset-0 grid grid-cols-[40px_1fr] gap-x-2">
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <React.Fragment key={hour}>
                              <div className="text-right">
                                <span className="relative -top-2 text-xs text-default-500">
                                  {hour > 0 ? `${String(hour).padStart(2, '0')}:00` : ''}
                                </span>
                              </div>
                              <div className="border-t border-divider h-15" style={{ height: '60px' }} />
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="absolute top-0 left-[48px] right-0 bottom-0">
                          {dayAppointments.map(appointment => {
                            const start = new Date(appointment.startTime)
                            const end = new Date(appointment.endTime)
                            const top = start.getHours() * 60 + start.getMinutes()
                            const duration = (end.getTime() - start.getTime()) / (1000 * 60)
                            const height = Math.max(duration, 15)
                            return (
                              <div
                                key={appointment.id}
                                onClick={() => handleAppointmentClick(appointment.id)}
                                className="absolute w-full pr-1 cursor-pointer group"
                                style={{ top: `${top}px`, height: `${height}px` }}
                              >
                                <div className="h-full p-1.5 rounded-lg bg-primary/20 border-l-4 border-primary text-primary-800 dark:text-primary-200 flex flex-col justify-start overflow-hidden group-hover:bg-primary/30 transition-colors">
                                  <div className="font-semibold text-xs truncate">
                                    {appointment.client ? `${appointment.client.surname} ${appointment.client.name}` : 'Unknown Client'}
                                  </div>
                                  <div className="text-xs opacity-80">
                                    {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </ScrollShadow>
                  </Card.Content>
                </Card>
              </div>
            )
            }}
          />
        )}
      </div>
    </div>
  )
}
