import { Appointment } from '@/types/scheduling'

// Тип для дня в календаре
export interface CalendarDay {
  id: string
  day: string | null // null для пустых дней
  date: Date | null
  appointments: Appointment[]
}

// Тип для недели
export interface CalendarWeek {
  id: string
  monthName: string // Название месяца для первой недели
  monthScroll: string // Для скроллинга
  days: CalendarDay[]
}

// Генерация уникального ID
const generateId = () => crypto.randomUUID()

// Получить название месяца на немецком
export const getMonthName = (date: Date, locale: string = 'de-DE'): string => {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
  return formatter.format(date)
}

// Получить короткое название дня недели
export const getWeekdayShort = (date: Date, locale: string = 'de-DE'): string => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return formatter.format(date)
}

// Получить только дату без времени
export const getOnlyDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Конвертировать Date в строку YYYY-MM-DD в локальном timezone
// Используется при отправке на сервер чтобы избежать сдвига даты из-за UTC конвертации
export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Парсит строку даты как локальное время (не UTC)
// "2025-02-17" → new Date(2025, 1, 17) (midnight local)
// "2025-02-17T10:00:00.000Z" → new Date("...") (оставляем как есть для timestamp'ов)
export const parseLocalDate = (value: string | Date): Date => {
  if (value instanceof Date) return value
  // Строка формата YYYY-MM-DD (без времени) — парсим как local
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

// Добавить дни к дате
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Добавить месяцы к дате
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

// Получить количество дней в месяце
export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// Получить день недели (0 = воскресенье, 1 = понедельник, ...)
export const getWeekday = (date: Date): number => {
  return date.getDay()
}

// Преобразовать день недели (воскресенье = 7, понедельник = 1)
export const convertWeekday = (day: number): number => {
  return day === 0 ? 7 : day
}

// Сравнить две даты (только дата, без времени)
export const isSameDate = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Основная функция для генерации календаря из appointments
// Аналог функции makeData из DienstplanView.swift
export const generateCalendarWeeks = (
  appointments: Appointment[],
  monthNames?: string[]
): CalendarWeek[] => {
  const result: CalendarWeek[] = []

  if (appointments.length === 0) {
    console.log('No appointments to display')
    return result
  }

  // Находим минимальную и максимальную даты
  const sortedDates = appointments.map(apt => apt.date).sort((a, b) => a.getTime() - b.getTime())
  const startDateApp = sortedDates[0]
  const endDateApp = sortedDates[sortedDates.length - 1]

  console.log('📅 Start Date:', startDateApp.toLocaleDateString())
  console.log('📅 End Date:', endDateApp.toLocaleDateString())

  // Определяем начальный и конечный месяц
  const startMonth = startDateApp.getMonth()
  const startYear = startDateApp.getFullYear()
  const endMonth = endDateApp.getMonth()
  const endYear = endDateApp.getFullYear()

  // Вычисляем количество месяцев
  const deltaYear = endYear - startYear
  let numberOfMonths = 0

  if (deltaYear > 0) {
    numberOfMonths = 12 - startMonth + endMonth + 12 * (deltaYear - 1)
  } else {
    numberOfMonths = endMonth - startMonth + 1
  }

  console.log('Number of months:', numberOfMonths)

  // Начальная дата - первое число начального месяца
  const startDate = new Date(startYear, startMonth, 1)

  let weekIndex = -1
  let isNewWeek = false
  let isFirstWeek = true

  // Итерируем по месяцам
  for (let monthOffset = 0; monthOffset < numberOfMonths; monthOffset++) {
    isFirstWeek = true
    isNewWeek = true

    const currentMonthDate = addMonths(startDate, monthOffset)
    let monthName = monthNames
      ? monthNames[currentMonthDate.getMonth()]
      : getMonthName(currentMonthDate)

    if (currentMonthDate.getMonth() === 0) {
      monthName = `${monthName} ${currentMonthDate.getFullYear()}`
    }

    const daysInMonth = getDaysInMonth(currentMonthDate)

    // console.log('Processing month:', monthName, 'days:', daysInMonth);

    // Итерируем по дням месяца
    for (let dayNum = 0; dayNum < daysInMonth; dayNum++) {
      const date = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), dayNum + 1)

      // Фильтруем appointments для этого дня
      const dayAppointments = appointments.filter(apt => isSameDate(apt.date, date))

      const weekday = getWeekday(date)
      const weekdayConverted = convertWeekday(weekday) // 1 = Пн, 7 = Вс

      // Первая неделя месяца - добавляем пустые дни
      if (isFirstWeek) {
        const emptyDays: CalendarDay[] = []

        // Добавляем пустые дни до начала месяца
        for (let i = 1; i < weekdayConverted; i++) {
          emptyDays.push({
            id: generateId(),
            day: null,
            date: null,
            appointments: [],
          })
        }

        const newWeek: CalendarWeek = {
          id: generateId(),
          monthName: monthName,
          monthScroll: monthName,
          days: emptyDays,
        }

        result.push(newWeek)
        isFirstWeek = false
        weekIndex = result.length - 1
      } else if (isNewWeek) {
        // Новая неделя
        const newWeek: CalendarWeek = {
          id: generateId(),
          monthName: '',
          monthScroll: monthName,
          days: [],
        }
        result.push(newWeek)
      }

      // Добавляем день в текущую неделю
      const calendarDay: CalendarDay = {
        id: generateId(),
        day: String(dayNum + 1),
        date: date,
        appointments: dayAppointments,
      }

      result[weekIndex].days.push(calendarDay)

      // Если воскресенье - начинаем новую неделю
      if (weekdayConverted === 7) {
        isNewWeek = true
        weekIndex = weekIndex + 1
      } else {
        isNewWeek = false
      }
    }
  }

  console.log('Generated calendar weeks:', result.length)
  return result
}

// Получить все дни с appointments в плоском массиве
export const getAllDaysWithAppointments = (weeks: CalendarWeek[]): CalendarDay[] => {
  const allDays: CalendarDay[] = []

  weeks.forEach(week => {
    week.days.forEach(day => {
      if (day.date && day.appointments.length > 0) {
        allDays.push(day)
      }
    })
  })

  return allDays
}

// Форматирование даты
export const formatDate = (date: Date, locale: string = 'de-DE'): string => {
  // Validate date before formatting
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('[formatDate] Invalid date received:', date)
    return '—'
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Форматирование времени
export const formatTime = (date: Date, locale: string = 'de-DE'): string => {
  // Validate date before formatting
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('[formatTime] Invalid date received:', date)
    return '—'
  }
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
