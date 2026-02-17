'use client'

import { useRef, memo, useMemo, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import ReactDOMServer from 'react-dom/server'
import { LogoMoment } from '@/components/icons'
import { useScheduling, AppointmentWithClient } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { useTranslation } from '@/components/Providers'

//к Компонент таймера для отображения времени с openedAt
const ElapsedTimer = ({ openedAt }: { openedAt: Date }) => {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [openedAt])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const format = (n: number) => n.toString().padStart(2, '0')

  return (
    <span className="font-mono text-green-600">
      {hours > 0 && `${format(hours)}:`}{format(minutes)}:{format(seconds)}
    </span>
  )
}

// Фабрики форматтеров с поддержкой локали приложения
const createDateFormatter = (locale: string) => new Intl.DateTimeFormat(locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const createTimeFormatter = (locale: string) => new Intl.DateTimeFormat(locale, {
  hour: '2-digit',
  minute: '2-digit',
})

// Создаем кастомную иконку с LogoMoment
const createCustomIcon = () => {
  const size = 56
  const iconHtml = ReactDOMServer.renderToString(<LogoMoment size={size} />)

  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.84],
    popupAnchor: [0, -size * 0.75],
  })
}

// Компонент маркера с управлением видимостью tooltip
const AppointmentMarker = ({ apt, icon, isSelected }: { apt: AppointmentWithClient; icon: L.DivIcon; isSelected?: boolean }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(isSelected ?? false)
  const markerRef = useRef<L.Marker>(null)
  const lang = useLanguage()
  const { t } = useTranslation()
  const timeFormatter = useMemo(() => createTimeFormatter(lang), [lang])

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  return (
    <Marker
      ref={markerRef}
      position={[apt.client.latitude, apt.client.longitude]}
      icon={icon}
      eventHandlers={{
        popupopen: () => setIsPopupOpen(true),
        popupclose: () => setIsPopupOpen(false),
      }}
    >
      {apt.isOpen && apt.openedAt && !isPopupOpen && (
        <Tooltip permanent direction="top" offset={[0, -40]} className="timer-tooltip">
          <ElapsedTimer openedAt={apt.openedAt} />
        </Tooltip>
      )}
      <Popup>
        <div className="text-sm p-1 min-w-50">
          <div className="font-semibold text-gray-900 mb-2">
            {apt.client.name} {apt.client.surname}
          </div>
          <div className="text-gray-600 mb-2">
            {apt.client.street} {apt.client.houseNumber}
            {apt.client.apartment && `, ${apt.client.apartment}`}
            <br />
            {apt.client.postalCode} {apt.client.city}
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('map.time')}</span>
              <span className="font-medium">
                {timeFormatter.format(new Date(apt.startTime))} - {timeFormatter.format(new Date(apt.endTime))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('map.duration')}</span>
              <span>{apt.duration} {t('map.min')}</span>
            </div>
            {apt.isOpen && apt.openedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('map.current')}</span>
                <ElapsedTimer openedAt={apt.openedAt} />
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

// Компонент для подстройки bounds карты под все маркеры
const MapBoundsController = ({ appointments }: { appointments: AppointmentWithClient[] }) => {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()

    if (appointments.length === 0) return

    const bounds = L.latLngBounds(
      appointments.map(apt => [apt.client.latitude, apt.client.longitude] as [number, number])
    )

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })

    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => clearTimeout(timer)
  }, [appointments, map])

  return null
}
interface AppointmentsMapProps {
  slug?: string;
}

function AppointmentsMap({ slug }: AppointmentsMapProps) {
  const { todayAppointments, isLoading } = useScheduling()
  const lang = useLanguage()
  const { t } = useTranslation()
  const customIcon = useRef(createCustomIcon())
  const dateFormatter = useMemo(() => createDateFormatter(lang), [lang])
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 8))

  useEffect(() => {
    console.log(`🗺️ [AppointmentsMap] MOUNTED [${mountIdRef.current}], slug=${slug}, lang=${lang}, pathname=${window.location.pathname}`)
    return () => {
      console.log(`🗺️ [AppointmentsMap] UNMOUNTED [${mountIdRef.current}]`)
    }
  }, [])

  useEffect(() => {
    const selected = slug ? todayAppointments.find(a => a.id === slug) : null
    console.log(`🗺️ [AppointmentsMap] Render [${mountIdRef.current}]: slug=${slug}, total=${todayAppointments.length}, selectedIsOpen=${selected?.isOpen}, selectedOpenedAt=${selected?.openedAt}`)
  }, [todayAppointments, slug])

  // Центр Германии как дефолтный центр
  const defaultCenter: [number, number] = [51.1657, 10.4515]

  const tileLayer = useMemo(
    () => (
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
    ),
    []
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-default-500">{t('map.loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t('map.title')} ({todayAppointments.length})
        </h1>
        <span className="text-default-500">
          {dateFormatter.format(new Date())}
        </span>
      </div>

      <div className="relative z-10 flex-1 rounded-lg overflow-hidden border border-default-200 shadow-sm min-h-100">
        <MapContainer
          center={defaultCenter}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <MapBoundsController appointments={todayAppointments} />
          {tileLayer}
          {todayAppointments.map((apt) => (
            <AppointmentMarker key={apt.id} apt={apt} icon={customIcon.current} isSelected={slug === apt.id} />
          ))}
        </MapContainer>
      </div>

      {todayAppointments.length === 0 && (
        <div className="text-center text-default-500 py-8">
          {t('map.noAppointments')}
        </div>
      )}
    </div>
  )
}

export default memo(AppointmentsMap)
