'use client';

import { forwardRef, memo } from 'react';
import { CalendarWeek } from '@/lib/calendar-utils';
import DayView from './DayView';
import { isSameDate } from '@/lib/calendar-utils';
import { Separator } from '@heroui/react';

interface WeekViewProps {
  week: CalendarWeek;
  today: Date;
  selectedDate?: Date;
}

const WeekView = forwardRef<HTMLDivElement, WeekViewProps>(
  ({ week, today, selectedDate }, ref) => {
    return (
      <div ref={ref} className="mb-2 sm:mb-4">
        {/* Название месяца (если это первая неделя месяца) */}
        {week.monthName && (
          <div className="bg-default-100 px-3 sm:px-4 py-2 border-b border-divider">
            <h2 className="text-base sm:text-lg font-bold text-foreground">{week.monthName}</h2>
          </div>
        )}
        <Separator />
        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 bg-divider p-0.5 sm:p-1">
          {week.days.map((day) => (
            <DayView
              key={day.id}
              day={day}
              isToday={day.date ? isSameDate(day.date, today) : false}
              isSelected={day.date && selectedDate ? isSameDate(day.date, selectedDate) : false}
            />
          ))}
        </div>
      </div>
    );
  }
);

WeekView.displayName = 'WeekView';

export default memo(WeekView);
