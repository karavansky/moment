'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { CalendarWeek, isSameDate } from '@/lib/calendar-utils'
import WeekView from './WeekView'
import { useLanguage } from '@/hooks/useLanguage'
import { usePlatformContext } from '@/contexts/PlatformContext'
import type { Appointment } from '@/types/scheduling'

interface CalendarViewProps {
  weeks: CalendarWeek[]
  today?: Date
  selectedDate?: Date
  onAppointmentPress?: (appointment: Appointment) => void
  onExternalDrop?: (date: Date, type: 'client' | 'worker', id: string) => void
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

function CalendarView({
  weeks,
  today = new Date(),
  selectedDate,
  onAppointmentPress,
  onExternalDrop,
}: CalendarViewProps) {
  const lang = useLanguage()
  const { isMobile } = usePlatformContext()

  // Constants for row heights
  const WEEK_HEIGHT = isMobile ? 120 : 180
  const HEADER_HEIGHT = isMobile ? 40 : 50

  // Генерируем названия дней недели на основе текущей локали
  const WEEKDAY_HEADERS_FULL = useMemo(() => getWeekdayFullNames(lang), [lang])
  const WEEKDAY_HEADERS_SHORT = useMemo(() => getWeekdayShortNames(lang), [lang])

  // Pre-calculate positions for all weeks
  const { items, totalHeight } = useMemo(() => {
    let currentTop = 0
    const virtualItems: VirtualItem[] = []

    weeks.forEach((week, index) => {
      const hasHeader = !!week.monthName
      const height = WEEK_HEIGHT + (hasHeader ? HEADER_HEIGHT : 0)

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
  }, [weeks, WEEK_HEIGHT, HEADER_HEIGHT])

  // State
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [isResizing, setIsResizing] = useState(false)
  const [isInitialScrollDone, setIsInitialScrollDone] = useState(false)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScroll = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ResizeObserver to handle container size and flicker prevention
  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height)
          setIsResizing(true)

          // Safety fallback
          const safetyTimeout = setTimeout(() => {
            setIsResizing(false)
          }, 500)

          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
          }

          scrollTimeoutRef.current = setTimeout(() => {
            setIsResizing(false)
            clearTimeout(safetyTimeout)
          }, 100)
        }
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Initial scroll to today
  useEffect(() => {
    if (containerHeight > 0 && items.length > 0 && scrollContainerRef.current) {
      const todayItemIndex = items.findIndex(item =>
        item.week.days.some(day => day.date && isSameDate(day.date, today))
      )

      if (todayItemIndex !== -1) {
        const targetTop = items[todayItemIndex].top
        isProgrammaticScroll.current = true
        scrollContainerRef.current.scrollTop = targetTop
        setScrollTop(targetTop)

        // Give it a moment to render at the new position before showing
        setTimeout(() => {
          isProgrammaticScroll.current = false
          setIsInitialScrollDone(true)
        }, 50)
      } else {
        // If today is not found, just show the list at the top
        setIsInitialScrollDone(true)
      }
    }
    // Run only once when ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerHeight]) // Trigger when container is measured

  // Calculate visible range
  const visibleItems = useMemo(() => {
    const OVERSCAN = 2 // Render 2 items above and below

    const startIndex = findStartIndex(items, scrollTop)
    const start = Math.max(0, startIndex - OVERSCAN)

    let end = start
    let currentBottom = items[start] ? items[start].top : 0

    // Advance end index until we cover the viewport + overscan
    while (
      end < items.length &&
      currentBottom < scrollTop + containerHeight + (WEEK_HEIGHT * OVERSCAN)
    ) {
      currentBottom += items[end].height
      end++
    }

    return items.slice(start, end)
  }, [items, scrollTop, containerHeight, WEEK_HEIGHT])

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none">
      {/* Заголовки дней недели */}
      <div className="z-10 bg-background/95 backdrop-blur-sm border-b border-divider rounded-2xl shadow-sm shrink-0">
        <div className="grid grid-cols-7 gap-0">
          {WEEKDAY_HEADERS_SHORT.map((dayShort, index) => (
            <div
              key={index}
              className="lg:min-w-30 p-2 sm:p-3 text-center font-semibold text-default-700 bg-default-50 border-r border-divider last:border-r-0 select-none"
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
              isResizing || !isInitialScrollDone ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-75`}
            onScroll={e => {
              if (isProgrammaticScroll.current) return
              setScrollTop(e.currentTarget.scrollTop)
            }}
          >
            <div
              style={{ height: totalHeight, position: 'relative' }}
              className="w-full"
            >
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
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(CalendarView)
