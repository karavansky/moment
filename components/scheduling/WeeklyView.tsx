'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
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

const DayColumn = React.memo(
  ({
    day,
    today,
    currentDate,
    appointments,
    lang,
    containerWidth,
    setCurrentDate,
    onDragOver,
    onDrop,
    onAppointmentClick,
  }: {
    day: Date
    today: Date
    currentDate: Date
    appointments: Appointment[]
    lang: string
    containerWidth: number
    setCurrentDate: (date: Date) => void
    onDragOver: (e: React.DragEvent<HTMLDivElement>, date: Date) => void
    onDrop: (e: React.DragEvent<HTMLDivElement>, date: Date) => void
    onAppointmentClick: (id: string) => void
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const isCurrentDay = isSameDate(day, currentDate)

    const [now, setNow] = useState(new Date())
    const isToday = isSameDate(day, now)

    useEffect(() => {
      const interval = setInterval(() => setNow(new Date()), 60000)
      return () => clearInterval(interval)
    }, [])

    // Group appointments by hour
    const appointmentsByHour = useMemo(() => {
      const groups: Record<number, Appointment[]> = {}
      appointments.forEach(app => {
        const date = new Date(app.startTime)
        const h = date.getHours()
        if (!groups[h]) groups[h] = []
        groups[h].push(app)
      })
      // Sort by time
      Object.keys(groups).forEach(key => {
        const k = Number(key)
        groups[k].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      })
      return groups
    }, [appointments])

    useEffect(() => {
      if (scrollRef.current) {
        let scrollToMinutes = 6 * 60 // 6:00 AM default

        if (appointments.length > 0) {
          const earliestStart = Math.min(
            ...appointments.map(app => {
              const date = new Date(app.startTime)
              return date.getHours() * 60 + date.getMinutes()
            })
          )
          scrollToMinutes = Math.max(0, earliestStart - 30)
        }

        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollToMinutes
          }
        })
      }
    }, [appointments])

    return (
      <div
        onClick={() => setCurrentDate(day)}
        onDragOver={e => onDragOver(e, day)}
        onDrop={e => onDrop(e, day)}
        className={`
      shrink-0 h-full cursor-pointer snap-center p-0
      ${isCurrentDay ? 'ring-2 ring-primary' : ''}
    `}
        style={{ width: containerWidth }}
      >
        <Card
          className={`
      h-full
      ${isToday ? 'border-2 border-danger' : isCurrentDay ? 'border-2 border-primary' : ''}
    `}
        >
          <Card.Content className="p-0 h-full flex flex-col">
            <div className="mb-3 pb-2 border-b border-divider text-center">
              <div
                className={`
            text-lg font-bold
            ${isToday ? 'text-danger' : isCurrentDay ? 'text-primary' : 'text-foreground'}
          `}
              >
                {day.toLocaleDateString(lang, { weekday: 'long' })}, {day.getDate()}.{' '}
                {day.toLocaleDateString(lang, { month: 'long' })}
              </div>
            </div>

            <ScrollShadow ref={scrollRef} className="flex-1 min-h-0" hideScrollBar={false}>
              <div className="flex flex-col relative pb-10">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourApps = appointmentsByHour[hour] || []
                  const isCurrentHour = isToday && hour === now.getHours()
                  const currentMinute = now.getMinutes()

                  return (
                    <div
                      key={hour}
                      className="flex min-h-12 border-t border-gray-200 dark:border-gray-800 shrink-0 relative"
                    >
                      {isCurrentHour && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{ top: `${(currentMinute / 60) * 100}%` }}
                          style={{ top: `${(currentMinute / 60) * 100}%`, transform: 'translateY(-50%)' }}
                        >
                          <div className="w-full border-t-2 border-red-500 opacity-50" />
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500" />
                          <div className="w-full h-0.5 bg-red-500 opacity-50" />
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500 top-1/2 -translate-y-1/2" />
                        </div>
                      )}
                      <div className="w-12 shrink-0 border-r border-gray-200 dark:border-gray-800 relative">
                        <span className="absolute -top-2.5 right-1 text-xs text-default-500 bg-background px-1">
                          {`${String(hour).padStart(2, '0')}:00`}
                        </span>
                      </div>

                      <div className="flex-1 p-1 min-w-0">
                        <div className="flex flex-wrap gap-1 w-full">
                          {hourApps.map((appointment, idx) => {
                            const start = new Date(appointment.startTime)
                            const end = new Date(appointment.endTime)

                            const duration = (end.getTime() - start.getTime()) / 60000
                            const height = Math.max(duration, 40)

                            return (
                              <div
                                key={appointment.id}
                                onClick={e => {
                                  e.stopPropagation()
                                  onAppointmentClick(appointment.id)
                                }}
                                className="flex-1 min-w-[85px] relative cursor-pointer group"
                                style={{ height: `${height}px` }}
                              >
                                <div className="h-full p-1.5 rounded-lg bg-primary/20 border-l-4 border-primary text-primary-800 dark:text-primary-200 flex flex-col justify-start overflow-hidden group-hover:bg-primary/30 transition-colors">
                                  <div className="font-semibold text-xs truncate">
                                    {appointment.client
                                      ? `${appointment.client.surname} ${appointment.client.name}`
                                      : 'Unknown Client'}
                                  </div>
                                  <div className="text-xs opacity-80">
                                    {formatTime(appointment.startTime)} -{' '}
                                    {formatTime(appointment.endTime)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollShadow>
          </Card.Content>
        </Card>
      </div>
    )
  }
)

export default function WeeklyView({ onAppointmentPress, onExternalDrop }: WeeklyViewProps) {
  const {
    appointments,
    setSelectedAppointment,
    moveAppointmentToDate,
    selectedDate,
    setSelectedDate,
  } = useScheduling()
  const lang = useLanguage()
  const today = useMemo(() => getOnlyDate(new Date()), [])

  // Генерируем короткие названия дней недели на основе текущей локали
  const WEEKDAY_NAMES = useMemo(() => getWeekdayShortNames(lang), [lang])

  const [currentDate, setCurrentDate] = useState(getOnlyDate(selectedDate || today))
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(selectedDate || today))
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Refs для управления скроллом
  const isProgrammaticScroll = useRef(false)
  const skipScrollToDateRef = useRef(false)
  const currentDateRef = useRef(currentDate)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    currentDateRef.current = currentDate
  }, [currentDate])

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width)
        }
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
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    const newDateOnly = getOnlyDate(newDate)

    skipScrollToDateRef.current = false
    isProgrammaticScroll.current = true
    setCurrentDate(newDateOnly)
    setSelectedDate(newDateOnly)
    setCurrentWeekStart(getMonday(newDateOnly))
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    const newDateOnly = getOnlyDate(newDate)

    skipScrollToDateRef.current = false
    isProgrammaticScroll.current = true
    setCurrentDate(newDateOnly)
    setSelectedDate(newDateOnly)
    setCurrentWeekStart(getMonday(newDateOnly))
  }

  // Scroll to current day when it changes (Programmatic)
  useEffect(() => {
    const currentDayIndex = allDays.findIndex(day => isSameDate(day, currentDate))

    if (virtuosoRef.current && currentDayIndex !== -1) {
      // Если изменение даты вызвано скроллом пользователя, не скроллим контейнер обратно
      if (skipScrollToDateRef.current) {
        skipScrollToDateRef.current = false
        return
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }

      isProgrammaticScroll.current = true

      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.scrollSnapType = 'none'
      }

      if (containerRef.current) {
        containerRef.current.style.transition = 'none'
        containerRef.current.style.opacity = '0'
      }

      virtuosoRef.current.scrollToIndex({
        index: currentDayIndex,
        align: 'start',
        behavior: 'auto',
      })

      scrollTimeoutRef.current = setTimeout(() => {
        if (containerRef.current) {
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.style.transition = 'opacity 0.2s ease-out'
              containerRef.current.style.opacity = '1'
            }
          })
        }

        setTimeout(() => {
          isProgrammaticScroll.current = false
          if (scrollContainerRef.current) {
            scrollContainerRef.current.style.scrollSnapType = 'x mandatory'
          }
          scrollTimeoutRef.current = null
        }, 200)
      }, 50)
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [currentDate, allDays])

  // Инициализируем начальный индекс один раз при загрузке
  const [initialTopMostItemIndex] = useState(() => {
    const index = allDays.findIndex(day => isSameDate(day, currentDate))
    return index !== -1 ? { index, align: 'start' as const } : undefined
  })

  // Синхронизация selectedDate -> currentDate (если дата выбрана извне или загрузилась позже)
  useEffect(() => {
    if (selectedDate && !isSameDate(currentDate, selectedDate)) {
      skipScrollToDateRef.current = false
      setCurrentDate(getOnlyDate(selectedDate))
      const newMonday = getMonday(selectedDate)
      setCurrentWeekStart(prev => (isSameDate(prev, newMonday) ? prev : newMonday))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  // Мемоизируем компоненты Virtuoso, чтобы избежать лишних ре-рендеров
  const virtuosoComponents = useMemo(
    () => ({
      List: React.forwardRef<
        HTMLDivElement,
        { style?: React.CSSProperties; children?: React.ReactNode }
      >(({ style, children }, ref) => (
        <div
          ref={ref}
          style={{ ...style, display: 'flex', flexDirection: 'row' }}
          className="h-full"
        >
          {children}
        </div>
      )),
      Item: ({ children, ...props }: any) => (
        <div
          {...props}
          style={{ ...props.style, width: containerWidth }}
          className="h-full shrink-0 snap-center p-2"
        >
          {children}
        </div>
      ),
    }),
    [containerWidth]
  )

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
              <div key={dayIndex} className="flex flex-1 flex-col items-center gap-1 min-w-0">
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
                  onPress={() => {
                    if (isSameDate(day, currentDate)) return
                    //     skipScrollToDateRef.current = false
                    isProgrammaticScroll.current = true
                    setCurrentDate(day)
                    setSelectedDate(day)
                  }}
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
      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        {containerWidth > 0 && (
          <Virtuoso
            ref={virtuosoRef}
            horizontalDirection
            className="snap-x snap-mandatory"
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
            data={allDays}
            initialTopMostItemIndex={initialTopMostItemIndex}
            scrollerRef={ref => {
              if (ref instanceof HTMLElement) scrollContainerRef.current = ref
            }}
            onScroll={e => {
              if (isProgrammaticScroll.current) return
              const target = e.currentTarget as HTMLElement
              const scrollLeft = target.scrollLeft
              if (containerWidth === 0) return

              const index = Math.round(scrollLeft / containerWidth)

              if (index >= 0 && index < allDays.length) {
                const newDate = allDays[index]
                if (!isSameDate(newDate, currentDateRef.current)) {
                  skipScrollToDateRef.current = true
                  setCurrentDate(newDate)
                  setSelectedDate(newDate)

                  const newMonday = getMonday(newDate)
                  setCurrentWeekStart(prev => (isSameDate(prev, newMonday) ? prev : newMonday))
                }
              }
            }}
            components={virtuosoComponents}
            itemContent={(index, day) => {
              const dayAppointments = appointmentsByDate[day.toISOString()] || []

              return (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  today={today}
                  currentDate={currentDate}
                  appointments={dayAppointments}
                  lang={lang}
                  containerWidth={containerWidth}
                  setCurrentDate={setCurrentDate}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onAppointmentClick={handleAppointmentClick}
                />
              )
            }}
          />
        )}
      </div>
    </div>
  )
}
