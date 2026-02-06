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
import AppointmentReport from './AppointmentReport'
import { useLanguage } from '@/hooks/useLanguage'
import { useTranslation } from '@/components/Providers'
import FooterDienst from './FooterDienst'

type ViewMode = 'month' | 'week'

function DienstplanView() {
  const lang = useLanguage()
  const { t } = useTranslation()
  const {
    appointments,
    isLoading,
    selectedDate,
    selectedAppointment,
    setSelectedAppointment,
    setSelectedDate,
  } = useScheduling()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Названия месяцев из словаря локализации
  const monthNames = t('dienstplan.calendar.months') as unknown as string[]

  // Генерация календарных недель из appointments
  const calendarWeeks = useMemo(() => {
    if (appointments.length === 0) return []
    return generateCalendarWeeks(appointments, monthNames)
  }, [appointments, monthNames])

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

  const handlePressOnDay = useCallback(
    (day: Date) => {
      startTransition(() => {
        setViewMode('week')
      })
      setSelectedDate(day)
    },
    [setSelectedDate]
  )

  // Мемоизируем today для стабильности
  const today = useMemo(() => new Date(), [])

  // Обработчик клика на appointment - для не сегодняшних дней
  const handlePressOnAppointment = useCallback(
    (appointment: NonNullable<typeof selectedAppointment>) => {
      console.log('handlePressOnAppointment:', appointment)
      setSelectedAppointment(appointment)
      setIsNewAppointment(false)
      // Check if appointment date is today
      const appDate = new Date(appointment.date)
      const isPast = new Date(appDate.toDateString()) < new Date(today.toDateString())

      if (isPast) {
        setIsReportModalOpen(true)
      } else {
        setIsModalOpen(true)
      }
    },
    [setSelectedAppointment, today]
  )

  // Обработчик редактирования appointment (из Dropdown для сегодняшних)
  const handleEditAppointment = useCallback(
    (appointment: NonNullable<typeof selectedAppointment>) => {
      console.log('handleEditAppointment:', appointment)
      setSelectedAppointment(appointment)
      setIsNewAppointment(false)
      setIsModalOpen(true)
    },
    [setSelectedAppointment]
  )

  // Обработчик добавления отчета (из Dropdown для сегодняшних)
  const handleAddReport = useCallback(
    (appointment: NonNullable<typeof selectedAppointment>) => {
      console.log('handleAddReport:', appointment)
      setSelectedAppointment(appointment)
      setIsReportModalOpen(true)
    },
    [setSelectedAppointment]
  )

  // Обработчик внешнего drop (из FooterDienst)
  const handleExternalDrop = useCallback(
    (date: Date, type: 'client' | 'worker', id: string) => {
      const template: any = {
        id: 'new-from-drop',
        date: date,
        startTime: date,
        endTime: new Date(date.getTime() + 60 * 60000),
        clientID: type === 'client' ? id : '',
        workerId: type === 'worker' ? id : '',
        duration: 60,
        fahrzeit: 0,
        isFixedTime: false,
        services: [],
        reports: [],
        worker: [],
      }
      setSelectedDate(date)
      setSelectedAppointment(template)
      setIsNewAppointment(true)
      setIsModalOpen(true)
    },
    [setSelectedDate, setSelectedAppointment, setIsNewAppointment, setIsModalOpen]
  )

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
          <p className="text-default-600">{t('dienstplan.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col gap-1 px-1 sm:px-6 overflow-hidden">
      {/* Header */}
      <div className="flex-none flex flex-col gap-3 pb-1 sm:pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">{t('dienstplan.title')}</h1>
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
                {t('dienstplan.month')}
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
                {t('dienstplan.week')}
              </Chip>
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Статистика - скрываем на мобильных */}
            <div className="hidden sm:block text-sm text-default-600">
              {t('dienstplan.totalAppointments')} <span className="font-semibold">{appointments.length}</span>
            </div>

            {/* Кнопка добавления */}
            <Button variant="primary" size="sm" onPress={handleAddNew} className="gap-1 rounded-full">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('dienstplan.new')}</span>
            </Button>

            {/* Кнопка обновления */}
            <Button variant="tertiary" size="sm" onPress={handleRefresh} className="gap-1">
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('dienstplan.refresh')}</span>
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
                <h3 className="text-base font-medium text-foreground mb-2">{t('dienstplan.noAppointments')}</h3>
                <p className="text-sm text-default-500">{t('dienstplan.noAppointmentsHint')}</p>
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
                  onExternalDrop={handleExternalDrop}
                  onDayPress={handlePressOnDay}
                  onEditAppointment={handleEditAppointment}
                  onAddReport={handleAddReport}
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
                <WeeklyView
                  onAppointmentPress={handlePressOnAppointment}
                  onExternalDrop={handleExternalDrop}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Horizontal ScrollShadow - прижат к bottom */}
      <FooterDienst />

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

      {/* Appointment Report Modal */}
      <AppointmentReport
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false)
          setSelectedAppointment(null)
        }}
        appointment={selectedAppointment}
      />
    </div>
  )
}

export default memo(DienstplanView)
