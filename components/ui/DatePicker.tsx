'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, Check } from 'lucide-react'
import {
  Button,
  Surface,
  TimeField,
  Label as HeroLabel,
  DateInputGroup,
  Label,
} from '@heroui/react'
import { DateValue, parseDate, getLocalTimeZone, Time } from '@internationalized/date'
import { useDateFormatter, useLocale } from '@react-aria/i18n'

interface DatePickerProps {
  value?: DateValue
  onChange?: (date: DateValue) => void
  label?: string
  className?: string
  placeholder?: string
  isDisabled?: boolean
  minValue?: DateValue
  maxValue?: DateValue
  showTime?: boolean
  onTimeChange?: (time: Time | null) => void
  timeValue?: Time | null
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  className = '',
  placeholder,
  isDisabled = false,
  minValue,
  maxValue,
  showTime = false,
  onTimeChange,
  timeValue,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<DateValue | undefined>(value)
  const [inputValue, setInputValue] = useState('')
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [selectedTime, setSelectedTime] = useState<Time | null>(timeValue || null)

  // Temporary state for calendar (not committed until "Fertig" is clicked)
  const [tempDate, setTempDate] = useState<DateValue | undefined>(value)
  const [tempTime, setTempTime] = useState<Time | null>(timeValue || null)

  const { locale } = useLocale()

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const formatter = useDateFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const monthFormatter = useDateFormatter({
    month: 'long',
    year: 'numeric',
  })

  const dayFormatter = useDateFormatter({
    weekday: 'short',
  })

  // Format date for display
  const formatDate = (date: DateValue | undefined) => {
    if (!date) return ''
    try {
      const jsDate = date.toDate(getLocalTimeZone())
      return formatter.format(jsDate)
    } catch {
      return ''
    }
  }

  useEffect(() => {
    setSelectedDate(value)
    setTempDate(value)
    const dateStr = formatDate(value)
    const timeStr = selectedTime
      ? ` ${String(selectedTime.hour).padStart(2, '0')}:${String(selectedTime.minute).padStart(2, '0')}`
      : ''
    setInputValue(dateStr + timeStr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedTime])

  // Update temp time when props change
  useEffect(() => {
    setTempTime(timeValue || null)
  }, [timeValue])

  const handleDateChange = (newDate: DateValue) => {
    // Only update temporary state, don't call onChange yet
    setTempDate(newDate)
  }

  const handleApplyChanges = () => {
    // Apply changes when "Fertig" is clicked
    setSelectedDate(tempDate)
    setSelectedTime(tempTime)

    if (tempDate) {
      onChange?.(tempDate)
    }

    if (tempTime !== selectedTime) {
      onTimeChange?.(tempTime)
    }

    // Update input value
    const dateStr = formatDate(tempDate)
    const timeStr = tempTime
      ? ` ${String(tempTime.hour).padStart(2, '0')}:${String(tempTime.minute).padStart(2, '0')}`
      : ''
    setInputValue(dateStr + timeStr)

    setIsOpen(false)
  }

  const handleCancel = () => {
    // Reset temporary state to current values
    setTempDate(selectedDate)
    setTempTime(selectedTime)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal)

    // Try to parse the input as date
    // Format: DD.MM.YYYY or DD/MM/YYYY or YYYY-MM-DD
    const datePatterns = [
      /^(\d{2})[./](\d{2})[./](\d{4})$/, // DD.MM.YYYY or DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    ]

    for (const pattern of datePatterns) {
      const match = inputVal.match(pattern)
      if (match) {
        try {
          let dateStr: string
          if (pattern.source.startsWith('^(\\d{2})')) {
            // DD.MM.YYYY format
            const [, day, month, year] = match
            dateStr = `${year}-${month}-${day}`
          } else {
            // YYYY-MM-DD format
            dateStr = inputVal
          }

          const parsedDate = parseDate(dateStr)

          // Validate min/max
          if (minValue && parsedDate.compare(minValue) < 0) return
          if (maxValue && parsedDate.compare(maxValue) > 0) return

          setSelectedDate(parsedDate)
          onChange?.(parsedDate)
          return
        } catch {
          // Invalid date, continue
        }
      }
    }
  }

  // Generate calendar days
  const generateCalendar = () => {
    const dateToUse = selectedDate || parseDate(new Date().toISOString().split('T')[0])

    const year = dateToUse.year
    const month = dateToUse.month
    const firstDay = parseDate(`${year}-${String(month).padStart(2, '0')}-01`)
    const daysInMonth = firstDay.set({ day: 1 }).add({ months: 1 }).subtract({ days: 1 }).day

    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.toDate(getLocalTimeZone()).getDay()
    const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Monday = 0

    const days: (DateValue | null)[] = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        parseDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
      )
    }

    return days
  }

  const currentMonth = tempDate || parseDate(new Date().toISOString().split('T')[0])
  const days = generateCalendar()

  const navigateMonth = (offset: number) => {
    const newDate = currentMonth.add({ months: offset })
    setTempDate(newDate)
  }

  // Generate localized day names (Monday - Sunday)
  const dayNames = useMemo(() => {
    const baseDate = new Date(2024, 0, 1) // Monday, January 1, 2024
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate)
      date.setDate(baseDate.getDate() + i)
      days.push(dayFormatter.format(date))
    }
    return days
  }, [locale, dayFormatter])

  // Format month and year using locale
  const monthYearDisplay = useMemo(() => {
    const jsDate = currentMonth.toDate(getLocalTimeZone())
    return monthFormatter.format(jsDate)
  }, [currentMonth, locale, monthFormatter])

  // Update time when props change
  useEffect(() => {
    setSelectedTime(timeValue || null)
    setTempTime(timeValue || null)
  }, [timeValue])

  // Get localized placeholder text
  const placeholderText = useMemo(() => {
    if (placeholder) return placeholder

    const translations: Record<string, string> = {
      en: 'Select date',
      de: 'Datum wählen',
      es: 'Seleccionar fecha',
      fr: 'Sélectionner une date',
      id: 'Pilih tanggal',
      ja: '日付を選択',
      pt: 'Selecionar data',
      tr: 'Tarih seç',
      uk: 'Виберіть дату',
      it: 'Seleziona data',
      pl: 'Wybierz datę',
      ru: 'Выберите дату',
    }
    return translations[locale] || translations.en
  }, [locale, placeholder])

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <div className="relative">
        <Surface className="relative rounded-xl" variant="secondary">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholderText}
            disabled={isDisabled}
            readOnly={isTouchDevice}
            className="w-full px-3 py-2 pr-10 border border-divider rounded-lg bg-default-50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            variant="tertiary"
            onClick={() => setIsOpen(!isOpen)}
            isDisabled={isDisabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-default-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarIcon className="w-4 h-4 text-default-500" />
          </Button>
        </Surface>

        {/* Calendar dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[100000]" onClick={handleCancel} />

            {/* Calendar - centered in viewport */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100001] w-85 max-w-[90vw] p-4 bg-background rounded-lg shadow-2xl border border-divider">
              {/* Month/Year navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  onPress={() => navigateMonth(-1)}
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  className="min-w-8 h-8"
                >
                  ←
                </Button>

                <div className="text-base font-semibold">{monthYearDisplay}</div>

                <Button
                  onPress={() => navigateMonth(1)}
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  className="min-w-8 h-8"
                >
                  →
                </Button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day names */}
                {dayNames.map(day => (
                  <div
                    key={day}
                    className="text-xs font-medium text-default-500 text-center h-8 flex items-center justify-center"
                  >
                    {day}
                  </div>
                ))}

                {/* Days */}
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="h-10" />
                  }

                  const isSelected =
                    tempDate &&
                    day.year === tempDate.year &&
                    day.month === tempDate.month &&
                    day.day === tempDate.day

                  const isToday =
                    day.year === new Date().getFullYear() &&
                    day.month === new Date().getMonth() + 1 &&
                    day.day === new Date().getDate()

                  const isDisabledDay =
                    (minValue && day.compare(minValue) < 0) ||
                    (maxValue && day.compare(maxValue) > 0)

                  return (
                    <Button
                      key={index}
                      onPress={() => !isDisabledDay && handleDateChange(day)}
                      isDisabled={isDisabledDay}
                      size="sm"
                      variant={isSelected ? 'primary' : 'ghost'}
                      isIconOnly
                      className={`
                        h-10 min-w-10 text-sm
                        ${isToday && !isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                      `}
                    >
                      {day.day}
                    </Button>
                  )
                })}
              </div>

              {/* Time picker        {showTime && ( */}

              <div className="flex items-center justify-between gap-4 mt-4 py-2">
                <Label className="text-lg pl-2">Zeit</Label>
                <TimeField
                  className="w-30"
                  name="time"
                  value={tempTime}
                  onChange={time => {
                    setTempTime(time)
                  }}
                  hourCycle={24}
                >
                  <DateInputGroup>
                    <DateInputGroup.Prefix>
                      <Clock className="size-4 text-muted" />
                    </DateInputGroup.Prefix>
                    <DateInputGroup.Input>
                      {segment => <DateInputGroup.Segment segment={segment} />}
                    </DateInputGroup.Input>
                  </DateInputGroup>
                </TimeField>
                {/* Action button */}

                <Button
                  onPress={handleApplyChanges}
                  variant="primary"
                  className="w-12 h-12"
                  size="sm"
                  isIconOnly
                >
                  <Check className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DatePicker
