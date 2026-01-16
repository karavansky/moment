'use client'

import { useMemo, memo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { CalendarWeek, isSameDate } from '@/lib/calendar-utils'
import WeekView from './WeekView'
import { useLanguage } from '@/hooks/useLanguage'
import type { Appointment } from '@/types/scheduling'

interface CalendarViewProps {
  weeks: CalendarWeek[]
  today?: Date
  selectedDate?: Date
  onAppointmentPress?: (appointment: Appointment) => void
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

function CalendarView({
  weeks,
  today = new Date(),
  selectedDate,
  onAppointmentPress,
}: CalendarViewProps) {
  const lang = useLanguage()

  // Генерируем названия дней недели на основе текущей локали
  const WEEKDAY_HEADERS_FULL = useMemo(() => getWeekdayFullNames(lang), [lang])
  const WEEKDAY_HEADERS_SHORT = useMemo(() => getWeekdayShortNames(lang), [lang])

  // Группируем недели по месяцам для оптимизации рендеринга
  const months = useMemo(() => {
    if (!weeks.length) return []

    const groups: { id: string; weeks: CalendarWeek[] }[] = []
    let currentGroup: CalendarWeek[] = []

    weeks.forEach((week, i) => {
      // Начинаем новую группу, если это не первая неделя И у недели есть monthName (начало месяца)
      if (i > 0 && week.monthName) {
        groups.push({ id: `month-${groups.length}`, weeks: currentGroup })
        currentGroup = []
      }
      currentGroup.push(week)
    })

    if (currentGroup.length > 0) {
      groups.push({ id: `month-${groups.length}`, weeks: currentGroup })
    }

    return groups
  }, [weeks])

  // Вычисляем индекс текущей недели для начального скролла
  const initialTopMostItemIndex = useMemo(() => {
    const index = months.findIndex(month =>
      month.weeks.some(week => week.days.some(day => day.date && isSameDate(day.date, today)))
    )
    return index !== -1 ? index : 0
  }, [months, today])

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

      {/* Недели */}
      <div className="flex-1 min-h-0">
        {weeks.length === 0 ? (
          <div className="p-8 text-center text-default-500">Нет назначений для отображения</div>
        ) : (
          <Virtuoso
            data={months}
            initialTopMostItemIndex={initialTopMostItemIndex}
            overscan={2000} // Увеличенный буфер для плавности (рендерит соседние месяцы)
            itemContent={(index, month) => (
              <div>
                {month.weeks.map(week => (
                  <WeekView
                    key={week.id}
                    week={week}
                    today={today}
                    selectedDate={selectedDate}
                    onAppointmentPress={onAppointmentPress}
                  />
                ))}
              </div>
            )}
            style={{ height: '100%' }}
          />
        )}
      </div>
    </div>
  )
}

export default memo(CalendarView)
