'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import {
  Button,
  ButtonGroup,
  Card,
  DateField,
  DateRangePicker,
  Drawer,
  Dropdown,
  DropdownItem,
  DropdownItemIndicator,
  Input,
  Label,
  RangeCalendar,
  Selection,
  Spinner,
  Table,
  TextField,
} from '@heroui/react'
import { Calendar, Download, FileSpreadsheet, FileText, Filter, RefreshCw } from 'lucide-react'
import { ChevronDownIcon } from '@/components/icons'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { exportToExcel, exportToPDF } from '@/lib/export-utils'

type DateRange = {
  start: DateValue
  end: DateValue
}

interface AppointmentData {
  id: string
  date: string
  startTime: string
  endTime: string
  duration: number
  isFixedTime: boolean
  client: {
    id: string
    fullName: string
    address: string
  }
  workers: Array<{
    id: string
    fullName: string
  }>
  services: Array<{
    id: string
    name: string
  }>
}

interface ReportResponse {
  appointments: AppointmentData[]
  count: number
}

interface ClientOption {
  id: string
  name: string
  surname: string
  fullName: string
}

export default function ClientsReport() {
  const { session } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Фильтры
  const [dateRange, setDateRange] = useState<DateRange | null | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState<Selection>('all')

  // Определяем labels в зависимости от status
  const isStatus7 = session?.user?.status === 7

  const labels = {
    title: isStatus7 ? 'Berichte - Objekte' : 'Berichte - Kunden',
    client: isStatus7 ? 'Objekt' : 'Kunde',
    worker: isStatus7 ? 'Teilnehmer' : 'Mitarbeiter',
    service: isStatus7 ? 'Ziel' : 'Dienstleistung',
  }

  // Загрузка списка клиентов
  const fetchClients = async () => {
    setIsLoadingClients(true)
    try {
      const response = await fetch('/api/scheduling/clients', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Kunden')
      }

      const data = await response.json()
      const clientOptions: ClientOption[] = data.clients.map((c: any) => ({
        id: c.id,
        name: c.name,
        surname: c.surname,
        fullName: `${c.surname} ${c.name}`,
      }))
      setClients(clientOptions)
    } catch (err) {
      console.error('[ClientsReport] Error loading clients:', err)
    } finally {
      setIsLoadingClients(false)
    }
  }

  // Загрузка данных отчетов
  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (dateRange?.start) {
        const start = dateRange.start
        params.append(
          'dateFrom',
          `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`
        )
      }

      if (dateRange?.end) {
        const end = dateRange.end
        params.append(
          'dateTo',
          `${end.year}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}`
        )
      }

      // Добавляем clientFilter если он выбран
      if (clientFilter !== 'all' && Array.from(clientFilter).length > 0) {
        const selectedClientIds = Array.from(clientFilter)
        // Если выбран только один клиент, отправляем его ID
        if (selectedClientIds.length === 1) {
          params.append('clientID', selectedClientIds[0] as string)
        }
      }

      const url = `/api/scheduling/reports/clients?${params.toString()}`
      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Fehler beim Laden der Berichte')
      }

      const data: ReportResponse = await response.json()
      setAppointments(data.appointments)
    } catch (err) {
      console.error('[ClientsReport] Error:', err)
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  // Загрузка при монтировании
  useEffect(() => {
    fetchClients()
    fetchReports()
  }, [])

  // Фильтрация по поиску (клиент, участник/сотрудник, цель/услуга)
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments

    const term = searchTerm.toLowerCase()
    return appointments.filter(apt => {
      const clientMatch = apt.client.fullName.toLowerCase().includes(term)
      const workerMatch = apt.workers.some(w => w.fullName.toLowerCase().includes(term))
      const serviceMatch = apt.services.some(s => s.name.toLowerCase().includes(term))

      return clientMatch || workerMatch || serviceMatch
    })
  }, [appointments, searchTerm])

  // Группировка по клиентам
  const groupedByClient = useMemo(() => {
    const groups: Record<string, AppointmentData[]> = {}

    filteredAppointments.forEach(apt => {
      const clientId = apt.client.id
      if (!groups[clientId]) {
        groups[clientId] = []
      }
      groups[clientId].push(apt)
    })

    // Преобразуем в массив и сортируем по имени клиента
    return Object.entries(groups)
      .map(([clientId, appointments]) => ({
        clientId,
        client: appointments[0].client, // Все appointments имеют одинакового клиента
        appointments,
      }))
      .sort((a, b) => a.client.fullName.localeCompare(b.client.fullName))
  }, [filteredAppointments])

  // Форматирование даты для отображения
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Форматирование времени
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Форматирование времени для отображения
  const formatTimeRange = (apt: AppointmentData) => {
    if (!apt.isFixedTime) {
      return '—' // Без фиксированного времени
    }

    const start = formatTime(apt.startTime)
    const end = formatTime(apt.endTime)
    return `${start} - ${end}`
  }

  // Prepare data for export
  const clientSummaries = useMemo(() => {
    return groupedByClient.map(group => ({
      client: group.client,
      appointmentCount: group.appointments.length,
      appointments: group.appointments,
    }))
  }, [groupedByClient])

  // Export handlers
  const handleExportExcel = async () => {
    if (clientSummaries.length === 0) {
      return
    }
    await exportToExcel(clientSummaries, labels)
  }

  const handleExportPDF = () => {
    if (clientSummaries.length === 0) {
      return
    }
    exportToPDF(clientSummaries, labels)
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{labels.title}</h1>
        </div>

        <div className="flex gap-2">
          <ButtonGroup variant="primary" size="md">
            <Button
              onPress={handleExportExcel}
              isDisabled={isLoading || clientSummaries.length === 0}
            >
              Excel
            </Button>

            <Button
              onPress={handleExportPDF}
              isDisabled={isLoading || clientSummaries.length === 0}
            >
              <ButtonGroup.Separator />
              PDF
            </Button>

            {/* Filters - Drawer */}
            <Drawer>
              <Button>
                <ButtonGroup.Separator />
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <Drawer.Backdrop>
                <Drawer.Content placement="right">
                  <Drawer.Dialog className="w-full sm:w-[400px]">
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading>Filter</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <div className="flex flex-col gap-4">
                        {/* Date Range */}
                        <DateRangePicker
                          className="w-full"
                          startName="dateFrom"
                          endName="dateTo"
                          value={dateRange}
                          onChange={setDateRange}
                        >
                          <Label>Zeitraum</Label>
                          <DateField.Group fullWidth>
                            <DateField.Input slot="start">
                              {segment => <DateField.Segment segment={segment} />}
                            </DateField.Input>
                            <DateRangePicker.RangeSeparator />
                            <DateField.Input slot="end">
                              {segment => <DateField.Segment segment={segment} />}
                            </DateField.Input>
                            <DateField.Suffix>
                              <DateRangePicker.Trigger>
                                <DateRangePicker.TriggerIndicator />
                              </DateRangePicker.Trigger>
                            </DateField.Suffix>
                          </DateField.Group>
                          <DateRangePicker.Popover>
                            <RangeCalendar aria-label="Zeitraum wählen">
                              <RangeCalendar.Header>
                                <RangeCalendar.YearPickerTrigger>
                                  <RangeCalendar.YearPickerTriggerHeading />
                                  <RangeCalendar.YearPickerTriggerIndicator />
                                </RangeCalendar.YearPickerTrigger>
                                <RangeCalendar.NavButton slot="previous" />
                                <RangeCalendar.NavButton slot="next" />
                              </RangeCalendar.Header>
                              <RangeCalendar.Grid>
                                <RangeCalendar.GridHeader>
                                  {day => (
                                    <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                                  )}
                                </RangeCalendar.GridHeader>
                                <RangeCalendar.GridBody>
                                  {date => <RangeCalendar.Cell date={date} />}
                                </RangeCalendar.GridBody>
                              </RangeCalendar.Grid>
                              <RangeCalendar.YearPickerGrid>
                                <RangeCalendar.YearPickerGridBody>
                                  {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                                </RangeCalendar.YearPickerGridBody>
                              </RangeCalendar.YearPickerGrid>
                            </RangeCalendar>
                          </DateRangePicker.Popover>
                        </DateRangePicker>

                        {/* Client Filter */}
                        <div className="w-full">
                          <Label className="mb-2 block">{labels.client}</Label>
                          <Dropdown>
                            <Button variant="tertiary" className="w-full justify-between">
                              {clientFilter === 'all' || Array.from(clientFilter).length === 0
                                ? `Alle ${labels.client}`
                                : Array.from(clientFilter).length === 1
                                  ? clients.find(c => c.id === Array.from(clientFilter)[0])
                                      ?.fullName
                                  : `${Array.from(clientFilter).length} ausgewählt`}
                              <ChevronDownIcon className="w-4 h-4" />
                            </Button>
                            <Dropdown.Popover>
                              <Dropdown.Menu
                                disallowEmptySelection
                                aria-label="Client Filter"
                                selectedKeys={clientFilter}
                                selectionMode="single"
                                onSelectionChange={setClientFilter}
                                items={clients.map(c => ({ id: c.id, name: c.fullName }))}
                              >
                                {clients.map(client => (
                                  <DropdownItem key={client.id} id={client.id}>
                                    {client.fullName}
                                    <DropdownItemIndicator />
                                  </DropdownItem>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </div>

                        {/* Search */}
                        <TextField className="w-full">
                          <Label>Suche</Label>
                          <Input
                            placeholder={`${labels.worker}, ${labels.service}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                        </TextField>
                      </div>
                    </Drawer.Body>
                    <Drawer.Footer>
                      <Button
                        variant="secondary"
                        onPress={() => {
                          setDateRange(null)
                          setClientFilter('all')
                          setSearchTerm('')
                        }}
                      >
                        Zurücksetzen
                      </Button>
                      <Button slot="close" onPress={fetchReports} isDisabled={isLoading}>
                        Anwenden
                      </Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          </ButtonGroup>
        </div>
      </div>

      {/* Results */}
      <Card className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-danger">{error}</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-default-500">Keine Ergebnisse gefunden</p>
          </div>
        ) : (
          <div className="p-4">
            {/* Группы по клиентам */}
            {groupedByClient.map((group, groupIndex) => (
              <div key={group.clientId} className={groupIndex > 0 ? 'mt-8' : ''}>
                {/* Заголовок группы - Клиент */}
                <div className="mb-4 pb-2 border-b-2 border-primary">
                  <h3 className="text-xl font-bold text-foreground">{group.client.fullName}</h3>
                  <p className="text-sm text-default-500">{group.client.address}</p>
                </div>

                {/* Таблица записей для этого клиента */}
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label={`Appointments for ${group.client.fullName}`}>
                      <Table.Header>
                        <Table.Column isRowHeader>Datum</Table.Column>
                        <Table.Column>{labels.worker}</Table.Column>
                        <Table.Column>{labels.service}</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {group.appointments.map(item => (
                          <Table.Row key={item.id}>
                            <Table.Cell>
                              <div>
                                <p className="font-medium">{formatDate(item.date)}</p>
                                <p className="text-xs text-default-500">{formatTimeRange(item)}</p>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              {item.workers.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {item.workers.map(w => (
                                    <span key={w.id} className="text-sm">
                                      {w.fullName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-default-400">—</span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {item.services.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {item.services.map(s => (
                                    <span key={s.id} className="text-sm">
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-default-400">—</span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>

                {/* Подсчет записей для группы */}
                <div className="mt-2 text-right">
                  <p className="text-xs text-default-500">
                    {group.appointments.length}{' '}
                    {group.appointments.length === 1 ? 'Eintrag' : 'Einträge'}
                  </p>
                </div>
              </div>
            ))}

            {/* Общий подсчет */}
            <div className="mt-6 pt-4 border-t-2 border-default-200">
              <p className="text-sm text-default-600 font-medium">
                Gesamt: <strong>{filteredAppointments.length}</strong> Einträge für{' '}
                <strong>{groupedByClient.length}</strong>{' '}
                {groupedByClient.length === 1 ? labels.client : `${labels.client}n`}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
