'use client';

import { useMemo, useLayoutEffect, useRef, memo } from 'react';
import { ScrollShadow } from '@heroui/react';
import { CalendarWeek, isSameDate } from '@/lib/calendar-utils';
import WeekView from './WeekView';
import { useLanguage } from '@/hooks/useLanguage';

interface CalendarViewProps {
  weeks: CalendarWeek[];
  today?: Date;
  selectedDate?: Date;
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

function CalendarView({ weeks, today = new Date(), selectedDate }: CalendarViewProps) {
  const lang = useLanguage()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const weekRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Генерируем названия дней недели на основе текущей локали
  const WEEKDAY_HEADERS_FULL = useMemo(() => getWeekdayFullNames(lang), [lang])
  const WEEKDAY_HEADERS_SHORT = useMemo(() => getWeekdayShortNames(lang), [lang])

  // Автоскролл к текущей неделе СИНХРОННО до отрисовки (без мигания)
  useLayoutEffect(() => {
    if (weeks.length === 0 || !scrollContainerRef.current) return

    // Находим индекс недели с текущим днем
    const currentWeekIndex = weeks.findIndex(week =>
      week.days.some(day => day.date && isSameDate(day.date, today))
    )

    if (currentWeekIndex === -1) return

    const currentWeek = weeks[currentWeekIndex]
    const weekElement = weekRefs.current.get(currentWeek.id)

    if (weekElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const containerHeight = container.clientHeight
      const weekTop = weekElement.offsetTop
      const weekHeight = weekElement.clientHeight

      // Прокручиваем так, чтобы неделя была примерно посередине
      const scrollTo = weekTop - (containerHeight / 2) + (weekHeight / 2)

      container.scrollTop = Math.max(0, scrollTo)
    }
  }, [weeks, today])

  const setWeekRef = (id: string, element: HTMLDivElement | null) => {
    if (element) {
      weekRefs.current.set(id, element)
    } else {
      weekRefs.current.delete(id)
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Заголовки дней недели */}
      <div className="z-10 bg-background/95 backdrop-blur-sm border-b border-divider rounded-2xl shadow-sm shrink-0">
        <div className="grid grid-cols-7 gap-0">
          {WEEKDAY_HEADERS_SHORT.map((dayShort, index) => (
            <div
              key={index}
              className="lg:min-w-30 p-2 sm:p-3 text-center font-semibold text-default-700 bg-default-50 border-r border-divider last:border-r-0"
            >
              {/* Показываем короткие названия на мобильных, полные на десктопе */}
              <span className="sm:hidden">{dayShort}</span>
              <span className="hidden sm:inline">{WEEKDAY_HEADERS_FULL[index]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Недели */}
      <ScrollShadow ref={scrollContainerRef} className="flex-1 min-h-0" hideScrollBar={false} size={60}>
        {weeks.length === 0 ? (
          <div className="p-8 text-center text-default-500">
            Нет назначений для отображения
          </div>
        ) : (
          weeks.map((week) => (
            <WeekView
              key={week.id}
              ref={(el) => setWeekRef(week.id, el)}
              week={week}
              today={today}
              selectedDate={selectedDate}
            />
          ))
        )}
      </ScrollShadow>
    </div>
  );
}

export default memo(CalendarView)
