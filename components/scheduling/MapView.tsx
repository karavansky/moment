'use client'

import { useRef, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import ReactDOMServer from 'react-dom/server'
import { LogoMoment } from '@/components/icons'

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

/** Fit map to the single marker */
function MapFitter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()
    map.setView([lat, lng], 16, { animate: false })

    const timer = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(timer)
  }, [lat, lng, map])

  return null
}

interface MapViewProps {
  lat: number
  lng: number
  address?: string
}

export default function MapView({ lat, lng, address }: MapViewProps) {
  const customIcon = useRef(createCustomIcon())

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
    <div className="w-full h-full min-h-[300px] rounded-lg overflow-hidden">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <MapFitter lat={lat} lng={lng} />
        {tileLayer}
        <Marker position={[lat, lng]} icon={customIcon.current}>
          {address && (
            <Tooltip permanent direction="top" offset={[0, -40]}>
              <span className="text-xs font-medium">{address}</span>
            </Tooltip>
          )}
        </Marker>
      </MapContainer>
    </div>
  )
}
