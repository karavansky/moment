'use client'

import { useEffect, useMemo, useState, useCallback, memo, useTransition } from 'react'
import { Button, Spinner, Card, ScrollShadow, Chip } from '@heroui/react'
import { RefreshCw, Calendar as CalendarIcon, CalendarDays, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useScheduling } from '@/contexts/SchedulingContext'
import { generateCalendarWeeks, formatTime } from '@/lib/calendar-utils'
import CalendarView from './CalendarView'
import WeeklyView from './WeeklyView'
import AppointmentModal from './AppointmentModal'
import { useLanguage } from '@/hooks/useLanguage'

type ViewMode = 'month' | 'week'

function DienstplanView() {
  const lang = useLanguage()
  const { appointments, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Генерация календарных недель из appointments
  const calendarWeeks = useMemo(() => {
    if (appointments.length === 0) return []
    return generateCalendarWeeks(appointments)
  }, [appointments])

  // Мемоизируем обработчики для предотвращения ре-рендеров
  const handleSetMonthMode = useCallback(() => {
    startTransition(() => {
      setViewMode('month')
    })
  }, [])
  const handleSetWeekMode = useCallback(() => {
    startTransition(() => {
      setViewMode('week')
    })
  }, [])
  const handleRefresh = useCallback(() => window.location.reload(), [])
  const [isNewAppointment, setIsNewAppointment] = useState(false)

  const handleAddNew = useCallback(() => {
    setIsNewAppointment(true)
    setSelectedAppointment(null)
    setIsModalOpen(true)
  }, [setSelectedAppointment, setIsNewAppointment, setIsModalOpen])

  // Обработчик клика на appointment - прокидывается через props в DayView
  const handlePressOnAppointment = useCallback(
    (appointment: NonNullable<typeof selectedAppointment>) => {
      console.log('handlePressOnAppointment:', appointment)
      setSelectedAppointment(appointment) // сохраняем в context (не удаляем)
      setIsNewAppointment(false)
      setIsModalOpen(true) // открываем модалку напрямую
    },
    [setSelectedAppointment]
  )

  // Мемоизируем today для стабильности
  const today = useMemo(() => new Date(), [])

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedAppointment(null)
    setIsNewAppointment(false)
  }, [setSelectedAppointment, setIsNewAppointment, setIsModalOpen])

  // Логируем только mount/unmount, без зависимостей от данных
  useEffect(() => {
    console.log('DienstplanView mounted')
    return () => console.log('DienstplanView unmounted')
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-default-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col gap-1 px-1 sm:px-6 overflow-hidden">
      {/* Header */}
      <div className="flex-none flex flex-col gap-3 pb-3 border-b border-divider shrink-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Dienstplan</h1>
          </div>
          {/* View mode switcher */}
          <div className="flex gap-2">
            <button onClick={handleSetMonthMode}>
              <Chip
                color={viewMode === 'month' ? 'accent' : 'default'}
                variant={viewMode === 'month' ? 'primary' : 'soft'}
                size="md"
                className="cursor-pointer"
              >
                <CalendarIcon className="w-3 h-3 mr-1" />
                Месяц
              </Chip>
            </button>
            <button onClick={handleSetWeekMode}>
              <Chip
                color={viewMode === 'week' ? 'accent' : 'default'}
                variant={viewMode === 'week' ? 'primary' : 'soft'}
                size="md"
                className="cursor-pointer"
              >
                <CalendarDays className="w-3 h-3 mr-1" />
                Неделя
              </Chip>
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Статистика - скрываем на мобильных */}
            <div className="hidden sm:block text-sm text-default-600">
              Всего назначений: <span className="font-semibold">{appointments.length}</span>
            </div>

            {/* Кнопка добавления */}
            <Button variant="primary" size="sm" onPress={handleAddNew} className="gap-1">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Neu</span>
            </Button>

            {/* Кнопка обновления */}
            <Button variant="tertiary" size="sm" onPress={handleRefresh} className="gap-1">
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Обновить</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar - занимает оставшееся пространство */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-sm">
              <Card.Content className="p-8 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-default-400 mb-4" />
                <h3 className="text-base font-medium text-foreground mb-2">Нет назначений</h3>
                <p className="text-sm text-default-500">Начните с создания нового назначения</p>
              </Card.Content>
            </Card>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === 'month' ? (
              <motion.div
                key="month"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <CalendarView
                  weeks={calendarWeeks}
                  today={today}
                  selectedDate={selectedDate}
                  onAppointmentPress={handlePressOnAppointment}
                />
              </motion.div>
            ) : (
              <motion.div
                key="week"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <WeeklyView onAppointmentPress={handlePressOnAppointment} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Horizontal ScrollShadow - прижат к bottom */}
      <div className="flex-none h-32 shrink-0">
        <Card className="h-full p-0">
          <Card.Content className="p-0 h-full overflow-hidden">
            <ScrollShadow className="h-full " orientation="horizontal" hideScrollBar={true}>
              <div className="flex flex-row gap-4 h-full items-center">
                {appointments.slice(0, 10).map(appointment => (
                  <Card
                    key={appointment.id}
                    className="flex min-w-62.5 flex-row gap-3 p-3 border border-divider"
                  >
                    <div className="flex flex-col justify-center gap-1 flex-1">
                      <div className="text-sm font-semibold truncate">
                        {appointment.client
                          ? appointment.client.surname + ' ' + appointment.client.name
                          : 'Unknown Client'}
                      </div>
                      <div className="text-xs text-default-500">
                        {appointment.worker ? appointment.worker.workerName : 'Unknown Worker'}
                      </div>
                      <div className="text-xs text-default-400">
                        {appointment.date.toLocaleDateString('de-DE')} •{' '}
                        {formatTime(appointment.startTime)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollShadow>
          </Card.Content>
        </Card>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        appointment={selectedAppointment}
        selectedDate={selectedDate}
        isNewAppointment={isNewAppointment}
        readOnly={
          selectedAppointment
            ? selectedAppointment.reports && selectedAppointment.reports.length > 0
            : false
        }
      />
    </div>
  )
}

export default memo(DienstplanView)
