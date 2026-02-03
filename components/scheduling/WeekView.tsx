'use client'

import { forwardRef, memo } from 'react'
import { CalendarWeek } from '@/lib/calendar-utils'
import DayView from './DayView'
import { isSameDate } from '@/lib/calendar-utils'
import { Separator } from '@heroui/react'
import type { Appointment } from '@/types/scheduling'

interface WeekViewProps {
  week: CalendarWeek
  today: Date
  selectedDate?: Date
  onAppointmentPress?: (appointment: Appointment) => void
  onExternalDrop?: (date: Date, type: 'client' | 'worker', id: string) => void
  onDayPress?: (date: Date) => void
  onEditAppointment?: (appointment: Appointment) => void
  onAddReport?: (appointment: Appointment) => void
}

const WeekView = forwardRef<HTMLDivElement, WeekViewProps>(
  ({ week, today, selectedDate, onAppointmentPress, onExternalDrop, onDayPress, onEditAppointment, onAddReport }, ref) => {
    return (
      <div ref={ref} className="mb-2 sm:mb-4 select-none h-full flex flex-col">
        {/* Название месяца (если это первая неделя месяца) */}
        {week.monthName && (
          <>
            <Separator className='mt-2'/>
            <div className="bg-default-100 px-3 sm:px-4 pt-2 pb-0 select-none shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{week.monthName}</h2>
            </div>
          </>
        )}

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 bg-divider p-0.5 sm:p-1 flex-1 min-h-0 ">
          {week.days.map(day => (
            <DayView
              key={day.id}
              day={day}
              isToday={day.date ? isSameDate(day.date, today) : false}
              isSelected={day.date && selectedDate ? isSameDate(day.date, selectedDate) : false}
              onAppointmentPress={onAppointmentPress}
              onExternalDrop={onExternalDrop}
              onDayPress={onDayPress}
              onEditAppointment={onEditAppointment}
              onAddReport={onAddReport}
            />
          ))}
        </div>
      </div>
    )
  }
)

WeekView.displayName = 'WeekView'

export default memo(WeekView)
