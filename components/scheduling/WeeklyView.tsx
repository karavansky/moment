'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { Card, ScrollShadow, Button } from '@heroui/react'
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
    onExternalDrop,
    moveAppointmentToDate,
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
    onExternalDrop?: (date: Date, type: 'client' | 'worker', id: string) => void
    moveAppointmentToDate: (id: string, date: Date) => void
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const isCurrentDay = isSameDate(day, currentDate)

    const [now, setNow] = useState(new Date())
    const isToday = isSameDate(day, now)
    const [dragOverHour, setDragOverHour] = useState<number | null>(null)

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
        const HOUR_HEIGHT = 48 // 48px (min-h-12)
        let targetMinutes = 6 * 60 // 6:00 AM default

        if (appointments.length > 0) {
          const earliestStart = Math.min(
            ...appointments.map(app => {
              const date = new Date(app.startTime)
              return date.getHours() * 60 + date.getMinutes()
            })
          )
          targetMinutes = Math.max(0, earliestStart - 30)
        }

        const scrollToPixels = (targetMinutes / 60) * HOUR_HEIGHT

        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollToPixels
          }
        }, 0)
      }
    }, [appointments])
    //   ${isToday ? 'border-2 border-danger' : isCurrentDay ? 'border-2 border-primary' : ''}

    const handleHourDragOver = (e: React.DragEvent<HTMLDivElement>, hour: number) => {
      e.preventDefault()
      e.stopPropagation()

      const targetDate = new Date(day)
      targetDate.setHours(hour, 0, 0, 0)
      const now = new Date()

      // Разрешаем, если день в будущем или сегодня (но час не прошел)
      if (getOnlyDate(targetDate) < getOnlyDate(now)) {
        e.dataTransfer.dropEffect = 'none'
        setDragOverHour(null)
        return
      }
      if (isSameDate(targetDate, now) && hour < now.getHours()) {
        e.dataTransfer.dropEffect = 'none'
        setDragOverHour(null)
        return
      }

      e.dataTransfer.dropEffect = 'move'
      setDragOverHour(hour)
    }

    const handleHourDrop = (e: React.DragEvent<HTMLDivElement>, hour: number) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOverHour(null)

      const targetDate = new Date(day)
      targetDate.setHours(hour, 0, 0, 0)

      try {
        const rawData = e.dataTransfer.getData('application/json')
        if (!rawData) return
        const data = JSON.parse(rawData)

        if (data.type === 'client' || data.type === 'worker') {
          onExternalDrop?.(targetDate, data.type, data.id)
        } else if (data.appointmentId) {
          moveAppointmentToDate(data.appointmentId, getOnlyDate(targetDate))
        }
      } catch (err) {
        console.error(err)
      }
    }

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
        <Card className={`pt-1  h-full   `}>
          <Card.Content className="p-0 h-full flex flex-col">
            <div className="mb-1 pb-1 border-b  border-gray-200 dark:border-gray-800  text-center">
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

            <ScrollShadow ref={scrollRef} className="flex-1 min-h-0" hideScrollBar={false} size={4}>
              <div className="flex flex-col relative ">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourApps = appointmentsByHour[hour] || []
                  const isCurrentHour = isToday && hour === now.getHours()
                  const currentMinute = now.getMinutes()
                  const isDragOver = dragOverHour === hour

                  return (
                    <div
                      key={hour}
                      className={`flex min-h-12 border-t border-gray-200 dark:border-gray-800 shrink-0 rounded-lg relative ${isDragOver ? 'bg-success/20' : ''}`}
                      onDragOver={e => handleHourDragOver(e, hour)}
                      onDragLeave={e => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return
                        setDragOverHour(null)
                      }}
                      onDrop={e => handleHourDrop(e, hour)}
                    >
                      {isCurrentHour && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{
                            top: `${(currentMinute / 60) * 100}%`,
                            transform: 'translateY(-50%)',
                          }}
                        >
                          <div className="w-full h-0.5 bg-red-500 opacity-50" />
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500 top-1/2 -translate-y-1/2" />
                        </div>
                      )}
                      <div className="w-12 shrink-0 border-r border-gray-200 dark:border-gray-800 relative">
                        <span className="absolute top-1 right-1 text-xs text-default-500 bg-background px-1">
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

  const headerVirtuosoRef = useRef<VirtuosoHandle>(null)
  const headerContainerRef = useRef<HTMLDivElement>(null)
  const headerScrollerRef = useRef<HTMLElement | null>(null)
  const [headerWidth, setHeaderWidth] = useState(0)
  const skipHeaderScrollRef = useRef(false)
  const isHeaderProgrammaticScroll = useRef(false)

  // Refs для управления скроллом
  const isProgrammaticScroll = useRef(false)
  const skipScrollToDateRef = useRef(false)
  const currentDateRef = useRef(currentDate)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentWeekStartRef = useRef(currentWeekStart)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const headerWidthRef = useRef(0)
  const lastResizeTimeRef = useRef(0)
  const containerWidthRef = useRef(0)
  const lastMainResizeTimeRef = useRef(0)
  const headerScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleResize = () => {
      lastMainResizeTimeRef.current = Date.now()
      console.log(
        'Window resize detected lastMainResizeTimeRef updated',
        lastMainResizeTimeRef.current
      )
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    currentDateRef.current = currentDate
  }, [currentDate])

  useEffect(() => {
    currentWeekStartRef.current = currentWeekStart
  }, [currentWeekStart])

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

  const allWeeks = useMemo(() => {
    const weeks = []
    const centerDate = getMonday(today)
    const weeksToRender = 52
    for (let i = -weeksToRender; i <= weeksToRender; i++) {
      const date = new Date(centerDate)
      date.setDate(centerDate.getDate() + i * 7)
      weeks.push(getOnlyDate(date))
    }
    return weeks
  }, [today])

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      console.log('[ResizeObserver] containerRef')
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          lastMainResizeTimeRef.current = Date.now()
          isProgrammaticScroll.current = true
          setContainerWidth(entry.contentRect.width)
          containerWidthRef.current = entry.contentRect.width

          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
          }

          scrollTimeoutRef.current = setTimeout(() => {
            const currentDayIndex = allDays.findIndex(day =>
              isSameDate(day, currentDateRef.current)
            )
            if (virtuosoRef.current && currentDayIndex !== -1) {
              virtuosoRef.current.scrollToIndex({
                index: currentDayIndex,
                align: 'start',
                behavior: 'auto',
              })
            }
            setTimeout(() => {
              isProgrammaticScroll.current = false
            }, 200)
          }, 100)
        }
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [allDays])

  useEffect(() => {
    if (!headerContainerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      console.log('[ResizeObserver] headerContainerRef')

      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          lastMainResizeTimeRef.current = Date.now()
          isHeaderProgrammaticScroll.current = true
          setHeaderWidth(entry.contentRect.width)
          headerWidthRef.current = entry.contentRect.width

          if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current)
          }

          resizeTimeoutRef.current = setTimeout(() => {
            const weekIndex = allWeeks.findIndex(week =>
              isSameDate(week, currentWeekStartRef.current)
            )

            if (headerVirtuosoRef.current && weekIndex !== -1) {
              headerVirtuosoRef.current.scrollToIndex({
                index: weekIndex,
                align: 'start',
                behavior: 'auto',
              })
            }
            setTimeout(() => {
              isHeaderProgrammaticScroll.current = false
            }, 200)
          }, 100)
        }
      }
    })
    resizeObserver.observe(headerContainerRef.current)
    return () => {
      resizeObserver.disconnect()
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [allWeeks])

  const [initialWeekIndex] = useState(() => {
    return allWeeks.findIndex(week => isSameDate(week, currentWeekStart))
  })

  // Переключение недели
  const handlePrevWeek = useCallback(() => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    const newDateOnly = getOnlyDate(newDate)

    skipScrollToDateRef.current = false
    skipHeaderScrollRef.current = false
    isProgrammaticScroll.current = true
    setCurrentDate(newDateOnly)
    setSelectedDate(newDateOnly)
    setCurrentWeekStart(getMonday(newDateOnly))
  }, [currentDate, setSelectedDate, setCurrentWeekStart, setCurrentDate, skipScrollToDateRef.current, skipHeaderScrollRef.current, isProgrammaticScroll.current])

  const handleNextWeek = useCallback(() => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    const newDateOnly = getOnlyDate(newDate)

    skipScrollToDateRef.current = false
    skipHeaderScrollRef.current = false
    isProgrammaticScroll.current = true
    setCurrentDate(newDateOnly)
    setSelectedDate(newDateOnly)
    setCurrentWeekStart(getMonday(newDateOnly))
  }, [currentDate, setSelectedDate, setCurrentWeekStart, setCurrentDate, , skipScrollToDateRef.current, skipHeaderScrollRef.current, isProgrammaticScroll.current])

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

  // Sync header scroll when currentWeekStart changes
  useEffect(() => {
    const weekIndex = allWeeks.findIndex(week => isSameDate(week, currentWeekStart))

    if (headerVirtuosoRef.current && weekIndex !== -1) {
      if (skipHeaderScrollRef.current) {
        skipHeaderScrollRef.current = false
        return
      }

      if (headerScrollTimeoutRef.current) {
        clearTimeout(headerScrollTimeoutRef.current)
      }

      isHeaderProgrammaticScroll.current = true

      if (headerScrollerRef.current) {
        headerScrollerRef.current.style.scrollSnapType = 'none'
      }

      headerVirtuosoRef.current?.scrollToIndex({
        index: weekIndex,
        align: 'start',
        behavior: 'auto',
      })

      headerScrollTimeoutRef.current = setTimeout(() => {
        isHeaderProgrammaticScroll.current = false
        if (headerScrollerRef.current) {
          headerScrollerRef.current.style.scrollSnapType = 'x mandatory'
        }
      }, 200)
    }
    return () => {
      if (headerScrollTimeoutRef.current) clearTimeout(headerScrollTimeoutRef.current)
    }
  }, [currentWeekStart, allWeeks])

  // Инициализируем начальный индекс один раз при загрузке
  const [initialTopMostItemIndex] = useState(() => {
    const index = allDays.findIndex(day => isSameDate(day, currentDate))
    return index !== -1 ? { index, align: 'start' as const } : undefined
  })

  // Синхронизация selectedDate -> currentDate (если дата выбрана извне или загрузилась позже)
  useEffect(() => {
    if (selectedDate && !isSameDate(currentDate, selectedDate)) {
      skipScrollToDateRef.current = false
      console.log(
        'Синхронизация selectedDate -> currentDate (если дата выбрана извне или загрузилась позже) '
      )
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
          className="h-full shrink-0 snap-center p-0"
        >
          {children}
        </div>
      ),
    }),
    [containerWidth]
  )

  const headerVirtuosoComponents = useMemo(
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
          style={{ ...props.style, width: headerWidth }}
          className="h-full shrink-0 snap-center flex justify-center"
        >
          {children}
        </div>
      ),
    }),
    [headerWidth]
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

        {/* Week days header */}
        <div ref={headerContainerRef} className="w-full h-16 relative">
          {headerWidth > 0 && (
            <Virtuoso
              ref={headerVirtuosoRef}
              horizontalDirection
              className="snap-x snap-mandatory no-scrollbar"
              style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
              data={allWeeks}
              initialTopMostItemIndex={initialWeekIndex}
              components={headerVirtuosoComponents}
              scrollerRef={ref => {
                if (ref instanceof HTMLElement) headerScrollerRef.current = ref
              }}
              onScroll={e => {
                if (isHeaderProgrammaticScroll.current) return
                const target = e.currentTarget as HTMLElement
                const currentHeaderWidth = headerWidthRef.current

                // Ignore scroll events if the container width doesn't match the item width
                // This prevents incorrect index calculation during resize/sidebar toggle
                if (Date.now() - lastMainResizeTimeRef.current < 1000) return
                if (Math.abs(target.clientWidth - currentHeaderWidth) > 1) return
                console.log(
                  '[Header scroll event] Date.now() - lastMainResizeTimeRef.current < 1000',
                  Date.now() - lastMainResizeTimeRef.current < 1000
                )
                const scrollLeft = target.scrollLeft
                if (currentHeaderWidth === 0) return

                const index = Math.round(scrollLeft / currentHeaderWidth)

                if (index >= 0 && index < allWeeks.length) {
                  const newWeekStart = allWeeks[index]
                  const currentWeekStartVal = currentWeekStartRef.current
                  if (!isSameDate(newWeekStart, currentWeekStartVal)) {
                    skipHeaderScrollRef.current = true
                    console.log(
                      '[Header scroll event] !isSameDate(newWeekStart, currentWeekStartVal) to true'
                    )
                    // Calculate the new date preserving the day of the week
                    // We calculate the offset of the current date from its week's Monday
                    // and apply that offset to the new week's Monday.
                    // This is more robust than calculating the difference between weeks
                    // because it doesn't rely on currentWeekStartRef being perfectly in sync with currentDateRef
                    const currentVal = currentDateRef.current
                    const currentMonday = getMonday(currentVal)
                    const offsetInMs = currentVal.getTime() - currentMonday.getTime()

                    const newDate = new Date(newWeekStart.getTime() + offsetInMs)
                    const newDateOnly = getOnlyDate(newDate)

                    setCurrentDate(newDateOnly)
                    setSelectedDate(newDateOnly)
                    setCurrentWeekStart(newWeekStart)
                  }
                }
              }}
              itemContent={(index, weekStart) => {
                const days = []
                for (let i = 0; i < 7; i++) {
                  const date = new Date(weekStart)
                  date.setDate(weekStart.getDate() + i)
                  days.push(getOnlyDate(date))
                }

                return (
                  <div className="flex justify-center gap-2 px-2 w-full">
                    {days.map((day, dayIndex) => {
                      const isToday = isSameDate(day, today)
                      const isCurrentDay = isSameDate(day, currentDate)

                      // Получаем полное название дня недели на основе текущей локали
                      const weekdayLong = day.toLocaleDateString(lang, { weekday: 'long' })
                      const capitalizedWeekdayLong =
                        weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1)

                      // Определяем вариант кнопки
                      const buttonVariant = isCurrentDay
                        ? 'primary'
                        : isToday
                          ? 'danger'
                          : 'tertiary'

                      return (
                        <div
                          key={dayIndex}
                          className="flex flex-1 flex-col items-center gap-1 min-w-0"
                        >
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
                )
              }}
            />
          )}
        </div>
      </div>

      {/* Horizontal scrollable days (DayView cards) */}
      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        {containerWidth > 0 && (
          <Virtuoso
            ref={virtuosoRef}
            horizontalDirection
            className="snap-x snap-mandatory no-scrollbar"
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
            data={allDays}
            initialTopMostItemIndex={initialTopMostItemIndex}
            scrollerRef={ref => {
              if (ref instanceof HTMLElement) scrollContainerRef.current = ref
            }}
            onScroll={e => {
              if (isProgrammaticScroll.current) return
              const target = e.currentTarget as HTMLElement
              const currentContainerWidth = containerWidthRef.current

              if (Date.now() - lastMainResizeTimeRef.current < 1000) return
              if (Math.abs(target.clientWidth - currentContainerWidth) > 1) return

              const scrollLeft = target.scrollLeft
              if (currentContainerWidth === 0) return

              console.log(
                '[DayView scroll event] Date.now() - lastMainResizeTimeRef.current < 1000',
                Date.now() - lastMainResizeTimeRef.current < 1000
              )

              const index = Math.round(scrollLeft / currentContainerWidth)

              if (index >= 0 && index < allDays.length) {
                const newDate = allDays[index]
                if (!isSameDate(newDate, currentDateRef.current)) {
                  console.log(
                    '[DayView scroll event] !isSameDate(newDate, currentDateRef.current) to true'
                  )
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
                  onExternalDrop={onExternalDrop}
                  moveAppointmentToDate={moveAppointmentToDate}
                />
              )
            }}
          />
        )}
      </div>
    </div>
  )
}
