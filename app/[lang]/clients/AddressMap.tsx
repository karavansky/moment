'use client'

import { useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import ReactDOMServer from 'react-dom/server'
import { LogoMoment } from '@/components/icons'

// Создаем кастомную иконку с LogoMoment
const createCustomIcon = () => {
  const size = 56
  const iconHtml = ReactDOMServer.renderToString(
    <LogoMoment size={size} />
  )

  return L.divIcon({
    html: iconHtml,
    className: 'custom-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.84], // Якорь в нижней точке пина (216/256 ≈ 0.84)
    popupAnchor: [0, -size * 0.75], // Popup появляется над маркером
  })
}

interface AddressMapProps {
  coordinates: {
    lat: number
    lng: number
  }
  address: string
}

export default function AddressMap({ coordinates, address }: AddressMapProps) {
  const customIcon = useRef(createCustomIcon())

  return (
    <div className="w-full h-[300px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        <Marker position={[coordinates.lat, coordinates.lng]} icon={customIcon.current}>
          <Popup>
            <div className="text-sm p-1">
              <strong className="text-gray-900">Adresse:</strong>
              <br />
              <span className="text-gray-700">{address}</span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
