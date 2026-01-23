'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Card, ScrollShadow } from '@heroui/react'
import { isSameDate, getOnlyDate, formatTime } from '@/lib/calendar-utils'
import type { Appointment } from '@/types/scheduling'

export interface DayColumnProps {
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
  }: DayColumnProps) => {
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

                  // Определяем, является ли час прошедшим
                  const isPastHour =
                    getOnlyDate(day) < getOnlyDate(now) || (isToday && hour < now.getHours())

                  return (
                    <div
                      key={hour}
                      className={`flex min-h-12 border-t border-gray-200 dark:border-gray-800 shrink-0 rounded-lg relative ${
                        isDragOver ? 'bg-success/50' : ''
                      } ${isPastHour ? 'bg-danger/50' : ''}`}
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

DayColumn.displayName = 'DayColumn'

export default DayColumn
