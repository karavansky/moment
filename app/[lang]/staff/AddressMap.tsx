'use client'

import { useRef, memo, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import ReactDOMServer from 'react-dom/server'
import { LogoMoment } from '@/components/icons'

// Создаем кастомную иконку с LogoMoment
const createCustomIcon = () => {
  const size = 56
  const iconHtml = ReactDOMServer.renderToString(<LogoMoment size={size} />)

  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.84], // Якорь в нижней точке пина (216/256 ≈ 0.84)
    popupAnchor: [0, -size * 0.75], // Popup появляется над маркером
  })
}

// Компонент для обновления центра карты при изменении координат
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap()
  useEffect(() => {
    // Сразу обновляем размер, если карта была скрыта
    map.invalidateSize()
    map.setView(center)

    // Дополнительная проверка через небольшую задержку на случай анимаций появления
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => clearTimeout(timer)
  }, [center, map])
  return null
}

interface AddressMapProps {
  coordinates: {
    lat: number
    lng: number
  } | null
  address: string
}

function AddressMap({ coordinates, address }: AddressMapProps) {
  const customIcon = useRef(createCustomIcon())
  const center = useMemo(
    () =>
      coordinates
        ? ([coordinates.lat, coordinates.lng] as [number, number])
        : ([51.1657, 10.4515] as [number, number]),
    [coordinates]
  )

  /*   // Debug logging
  const prevProps = useRef({ coordinates, address })
  useEffect(() => {
    const changes: string[] = []
    if (prevProps.current.coordinates !== coordinates) changes.push(`coordinates ref changed`)
    if (prevProps.current.coordinates.lat !== coordinates.lat)
      changes.push(`lat changed: ${prevProps.current.coordinates.lat} -> ${coordinates.lat}`)
    if (prevProps.current.coordinates.lng !== coordinates.lng)
      changes.push(`lng changed: ${prevProps.current.coordinates.lng} -> ${coordinates.lng}`)
    if (prevProps.current.address !== address)
      changes.push(`address changed: "${prevProps.current.address}" -> "${address}"`)

    if (changes.length > 0) {
      console.log(`[AddressMap] Re-render caused by props:`, changes)
    } else {
      console.log(`[AddressMap] Re-render but props appeared equal (or internal state change)`)
    }
    prevProps.current = { coordinates, address }
  })

  // Log mounting/unmounting
  useEffect(() => {
    console.log('[AddressMap] Mounted')
    return () => console.log('[AddressMap] Unmounted')
  }, []) */

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

  return (
    <div className="w-full h-75 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <MapController center={center} />
        {tileLayer}
        {coordinates && (
          <Marker position={center} icon={customIcon.current}>
            <Popup>
              <div className="text-sm p-1">
                <strong className="text-gray-900">Adresse:</strong>
                <br />
                <span className="text-gray-700">{address}</span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default memo(AddressMap)
