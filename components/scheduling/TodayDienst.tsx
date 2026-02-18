'use client'

import { memo, useMemo, useCallback } from 'react'
import { Card, ScrollShadow, Button } from '@heroui/react'
import { Play, Pause, Square, Calendar, UserStar } from 'lucide-react'
import { LogoMoment } from '@/components/icons'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useTranslation } from '@/components/Providers'
import { isSameDate } from '@/lib/calendar-utils'
import ElapsedTimer from './ElapsedTimer'
import type { Appointment } from '@/types/scheduling'

interface TodayDienstProps {
  onAppointmentPress?: (appointment: Appointment) => void
  onFinish?: (appointment: Appointment) => void
}

export default memo(function TodayDienst({ onAppointmentPress, onFinish }: TodayDienstProps) {
  const { appointments, user, openAppointment, closeAppointment } = useScheduling()
  const { t } = useTranslation()

  const today = useMemo(() => new Date(), [])

  const todayAppointments = useMemo(
    () => appointments.filter(a => isSameDate(new Date(a.date), today)),
    [appointments, today]
  )

  const handleStart = useCallback(
    (appointment: Appointment) => {
      console.log(`[TodayDienst] Starting appointment ${appointment.id} for user ${user?.id}`)
      if (user?.myWorkerID) {
        openAppointment(appointment.id, user.myWorkerID)
      }
    },
    [openAppointment, user?.myWorkerID]
  )

  const handlePause = useCallback(
    (appointment: Appointment) => {
      closeAppointment(appointment.id)
    },
    [closeAppointment]
  )

  const handleFinish = useCallback(
    (appointment: Appointment) => {
      closeAppointment(appointment.id)
      onFinish?.(appointment)
    },
    [closeAppointment, onFinish]
  )

  const handleCardPress = useCallback(
    (appointment: Appointment) => {
      onAppointmentPress?.(appointment)
    },
    [onAppointmentPress]
  )

  return (
    <div className="flex-none h-32 shrink-0">
      <Card className="h-full p-0">
        <Card.Content className="p-0 h-full overflow-hidden">
          {todayAppointments.length === 0 ? (
            <div className="flex items-center justify-center h-full gap-2 text-default-400">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">{t('dienstplan.noAppointments')}</span>
            </div>
          ) : (
            <ScrollShadow
              className="h-full select-none"
              orientation="horizontal"
              hideScrollBar={true}
            >
              <div className="flex flex-row gap-3 h-full items-center px-2">
                {todayAppointments.map(appointment => {
                  const client = appointment.client
                  const address = client
                    ? [client.street, client.houseNumber, client.city].filter(Boolean).join(', ')
                    : ''

                  return (
                    <div
                      key={appointment.id}
                      className="flex flex-col justify-between p-3 border border-divider bg-white dark:bg-gray-800 rounded-xl shadow-sm shrink-0 h-26 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleCardPress(appointment)}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <UserStar className="w-6 h-6 shrink-0 text-primary" />
                          <span className="truncate">
                            {client ? `${client.name} ${client.surname}` : '—'}
                          </span>
                          {appointment.isOpen && appointment.openedAt && (
                            <ElapsedTimer
                              openedAt={appointment.openedAt}
                              className="ml-auto text-xs shrink-0"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-default-500 truncate">
                          <LogoMoment className="w-5 h-5 shrink-0" />
                          {address || '—'}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5 mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          className="gap-1 bg-green-500! text-white! hover:bg-green-600!"
                          isDisabled={appointment.isOpen}
                          onPress={() => handleStart(appointment)}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {t('appointment.edit.start')}
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 bg-yellow-500! text-white! hover:bg-yellow-600!"
                          isDisabled={!appointment.isOpen}
                          onPress={() => handlePause(appointment)}
                        >
                          <Pause className="w-3.5 h-3.5" />
                          {t('appointment.edit.pause')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="gap-1"
                          isDisabled={!appointment.isOpen}
                          onPress={() => handleFinish(appointment)}
                        >
                          <Square className="w-3.5 h-3.5" />
                          {t('appointment.edit.finish')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollShadow>
          )}
        </Card.Content>
      </Card>
    </div>
  )
})
