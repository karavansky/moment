'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { CalendarWeek, isSameDate } from '@/lib/calendar-utils'
import WeekView from './WeekView'
import { useLanguage } from '@/hooks/useLanguage'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePlatformContext } from '@/contexts/PlatformContext'
import { CalendarDragProvider } from '@/contexts/CalendarDragContext'
import type { Appointment } from '@/types/scheduling'

interface CalendarViewProps {
  weeks: CalendarWeek[]
  today?: Date
  selectedDate?: Date
  onAppointmentPress?: (appointment: Appointment) => void
  onExternalDrop?: (date: Date, type: 'client' | 'worker', id: string) => void
  onDayPress?: (date: Date) => void
  onEditAppointment?: (appointment: Appointment) => void
  onAddReport?: (appointment: Appointment) => void
}

// Функция для получения полных названий дней недели на основе локали
const getWeekdayFullNames = (locale: string): string[] => {
  const baseDate = new Date(2024, 0, 1) // Понедельник, 1 января 2024
  const names: string[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + i)
    const fullName = date.toLocaleDateString(locale, { weekday: 'long' })
    names.push(fullName.charAt(0).toUpperCase() + fullName.slice(1))
  }

  return names
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

interface VirtualItem {
  week: CalendarWeek
  index: number
  top: number
  height: number
  hasHeader: boolean
}

// Helper to binary search for the first visible item
const findStartIndex = (items: VirtualItem[], scrollTop: number) => {
  let low = 0
  let high = items.length - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const item = items[mid]
    if (item.top + item.height <= scrollTop) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return Math.max(0, low)
}

// Helper to estimate appointment card height (moved outside component)
const estimateAppointmentHeight = () => {
  return 12 + 8 + 50 // Base padding + margin-bottom + content
}

// Stable default date to avoid new Date() on every render
const DEFAULT_TODAY = new Date()

function CalendarView({
  weeks,
  today = DEFAULT_TODAY,
  selectedDate,
  onAppointmentPress,
  onExternalDrop,
  onDayPress,
  onEditAppointment,
  onAddReport,
}: CalendarViewProps) {
  const lang = useLanguage()
  const { isMobile } = usePlatformContext()
  const isCompact = useMediaQuery('(max-width: 640px)')
  const isMobileLayout = isMobile || isCompact
  console.log('Rendering CalendarView with isMobileLayout:', isMobileLayout)
  const MIN_WEEK_HEIGHT = isMobileLayout ? 60 : 104
  const HEADER_HEIGHT = isMobileLayout ? 38 : 46
  const DAY_HEADER_HEIGHT_DESKTOP = 30
  // Генерируем названия дней недели на основе текущей локали
  const WEEKDAY_HEADERS_FULL = useMemo(() => getWeekdayFullNames(lang), [lang])
  const WEEKDAY_HEADERS_SHORT = useMemo(() => getWeekdayShortNames(lang), [lang])
  
  // Pre-calculate positions for all weeks
  const { items, totalHeight } = useMemo(() => {
    let currentTop = 0
    const virtualItems: VirtualItem[] = []

    weeks.forEach((week, index) => {
      const hasHeader = !!week.monthName

      let height = MIN_WEEK_HEIGHT

      if (isMobileLayout) {
        // Mobile/Compact logic: max 2 appointments + "..."
        let maxDayHeight = 0
        const APP_HEIGHT_MOBILE = 40 // Compact appointment height for mobile
        const DOTS_HEIGHT = 15 // Height for "..."

        week.days.forEach(day => {
          let currentDayHeight = 20 // Base padding/header for mobile day

          if (day.appointments && day.appointments.length > 0) {
            const count = Math.min(day.appointments.length, 2)
            currentDayHeight += count * APP_HEIGHT_MOBILE

            if (day.appointments.length > 2) {
              currentDayHeight += DOTS_HEIGHT
            }
            // Add some bottom padding
            currentDayHeight += 5
          }

          if (currentDayHeight > maxDayHeight) {
            maxDayHeight = currentDayHeight
          }
        })
        height = Math.max(MIN_WEEK_HEIGHT, maxDayHeight)
      } else {
        // Desktop logic: fit all appointments
        // Find the tallest day in this week
        let maxDayHeight = 0

        week.days.forEach(day => {
          let currentDayHeight = DAY_HEADER_HEIGHT_DESKTOP
          if (day.appointments) {
            day.appointments.forEach(() => {
              currentDayHeight += estimateAppointmentHeight()
            })
          }
          if (currentDayHeight > maxDayHeight) {
            maxDayHeight = currentDayHeight
          }
        })

        // Add some padding to the tallest day
        const contentHeight = maxDayHeight + 20
        height = Math.max(MIN_WEEK_HEIGHT, contentHeight)
      }

      // Add month header height if applicable
      if (hasHeader) {
        height += HEADER_HEIGHT
      }

      virtualItems.push({
        week,
        index,
        top: currentTop,
        height,
        hasHeader,
      })

      currentTop += height
    })

    return { items: virtualItems, totalHeight: currentTop }
  }, [weeks, MIN_WEEK_HEIGHT, HEADER_HEIGHT, isMobileLayout])

  // State
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  // Removed isResizing state that was causing visibility issues
  const [isInitialScrollDone, setIsInitialScrollDone] = useState(false)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  const lastScrollTopRef = useRef(0)

  // Throttled scroll handler using requestAnimationFrame
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    lastScrollTopRef.current = newScrollTop

    // Cancel previous frame if pending
    if (scrollRafRef.current !== null) {
      return // Skip if we already have a pending update
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      setScrollTop(lastScrollTopRef.current)
      scrollRafRef.current = null
    })
  }, [])

  // Cleanup for scroll RAF on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [])

  // ResizeObserver to handle container size
  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height)
        }
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Initial scroll to today
  useEffect(() => {
    // Wait for layout to be generally ready (container measured and items calculated)
    if (
      containerHeight > 0 &&
      items.length > 0 &&
      scrollContainerRef.current &&
      !isInitialScrollDone
    ) {
      const todayItemIndex = items.findIndex(item =>
        item.week.days.some(day => day.date && isSameDate(day.date, today))
      )

      let targetTop = 0
      if (todayItemIndex !== -1) {
        targetTop = items[todayItemIndex].top
      } else if (scrollContainerRef.current.scrollTop > 0) {
        // If no today target, but browser restored scroll, use that
        targetTop = scrollContainerRef.current.scrollTop
      }

      // Apply scroll
      if (scrollContainerRef.current.scrollTop !== targetTop) {
         scrollContainerRef.current.scrollTop = targetTop
      }
      // Sync state
      setScrollTop(targetTop)
      
      // Mark as done immediately
      setIsInitialScrollDone(true)
    }
  }, [containerHeight, items, today, isInitialScrollDone])

  // Calculate visible range
  const visibleItems = useMemo(() => {
    const OVERSCAN = 2 // Render 2 items above and below

    const startIndex = findStartIndex(items, scrollTop)
    const start = Math.max(0, startIndex - OVERSCAN)

    let end = start
    let currentBottom = items[start] ? items[start].top : 0

    // Advance end index until we cover the viewport + overscan
    // We use containerHeight as a dynamic buffer zone
    const buffer = containerHeight || 800 // Larger buffer default to ensure coverage

    while (end < items.length && currentBottom < scrollTop + containerHeight + buffer) {
      currentBottom += items[end].height
      end++
    }

    return items.slice(start, end)
  }, [items, scrollTop, containerHeight])

  return (
    <CalendarDragProvider>
    <div className="w-full h-full flex flex-col overflow-hidden select-none">
      {/* Заголовки дней недели */}
      <div className="z-10 bg-background/95 backdrop-blur-sm rounded-2xl shadow-sm shrink-0">
        <div className="grid grid-cols-7 gap-0">
          {WEEKDAY_HEADERS_SHORT.map((dayShort, index) => (
            <div
              key={index}
              className="lg:min-w-30 p-2 sm:p-3 text-center font-semibold text-default-700 bg-default-50 select-none"
            >
              {/* Показываем короткие названия на мобильных, полные на десктопе */}
              <span className="sm:hidden">{dayShort}</span>
              <span className="hidden sm:inline">{WEEKDAY_HEADERS_FULL[index]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Недели (Custom Virtualized List) */}
      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        {weeks.length === 0 ? (
          <div className="p-8 text-center text-default-500">Нет назначений для отображения</div>
        ) : (
          <div
            ref={scrollContainerRef}
            className={`w-full h-full overflow-y-auto no-scrollbar ${
              !isInitialScrollDone ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-150`}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: 'relative' }} className="w-full">
              {visibleItems.map(item => (
                <div
                  key={item.week.id}
                  style={{
                    position: 'absolute',
                    top: item.top,
                    left: 0,
                    width: '100%',
                    height: item.height,
                  }}
                >
                  <div className="h-full w-full overflow-hidden">
                    <WeekView
                      week={item.week}
                      today={today}
                      selectedDate={selectedDate}
                      onAppointmentPress={onAppointmentPress}
                      onExternalDrop={onExternalDrop}
                      onDayPress={onDayPress}
                      onEditAppointment={onEditAppointment}
                      onAddReport={onAddReport}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </CalendarDragProvider>
  )
}

export default React.memo(CalendarView)
