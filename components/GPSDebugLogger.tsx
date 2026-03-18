'use client'

import { useEffect, useRef } from 'react'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

interface GPSLogEntry {
  timestamp: string // HH:MM:SS
  browserLng: number
  browserLat: number
  browserDist: number // meters from previous browser position
  snapLng: number
  snapLat: number
  snapDist: number // meters from previous snapped position
  wasSnapped: boolean
}

interface GPSDebugLoggerProps {
  className?: string
}

export default function GPSDebugLogger({ className = '' }: GPSDebugLoggerProps) {
  const logEntriesRef = useRef<GPSLogEntry[]>([])
  const lastBrowserPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastSnapPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Listen for GPS log events from parent
  useEffect(() => {
    const handleGPSLog = (event: CustomEvent) => {
      const { browserLat, browserLng, snapLat, snapLng, wasSnapped } = event.detail

      // Calculate distance from previous browser position
      let browserDist = 0
      if (lastBrowserPosRef.current) {
        const from = point([lastBrowserPosRef.current.lng, lastBrowserPosRef.current.lat])
        const to = point([browserLng, browserLat])
        browserDist = distance(from, to, { units: 'meters' })
      }

      // Calculate distance from previous snapped position
      let snapDist = 0
      if (lastSnapPosRef.current) {
        const from = point([lastSnapPosRef.current.lng, lastSnapPosRef.current.lat])
        const to = point([snapLng, snapLat])
        snapDist = distance(from, to, { units: 'meters' })
      }

      // Format timestamp
      const now = new Date()
      const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      // Create log entry
      const entry: GPSLogEntry = {
        timestamp,
        browserLng,
        browserLat,
        browserDist,
        snapLng,
        snapLat,
        snapDist,
        wasSnapped,
      }

      // Add to log (keep last 100 entries)
      logEntriesRef.current = [...logEntriesRef.current, entry].slice(-100)

      // Update previous positions
      lastBrowserPosRef.current = { lat: browserLat, lng: browserLng }
      lastSnapPosRef.current = { lat: snapLat, lng: snapLng }

      // Force re-render and scroll to bottom
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }

      // Trigger re-render by updating the DOM directly (to avoid state overhead)
      requestAnimationFrame(() => {
        if (logContainerRef.current) {
          renderLogEntries()
        }
      })
    }

    window.addEventListener('gps-log-event' as any, handleGPSLog as EventListener)

    return () => {
      window.removeEventListener('gps-log-event' as any, handleGPSLog as EventListener)
    }
  }, [])

  const renderLogEntries = () => {
    if (!logContainerRef.current) return

    const tbody = logContainerRef.current.querySelector('tbody')
    if (!tbody) return

    // Clear existing rows
    tbody.innerHTML = ''

    // Render all log entries
    logEntriesRef.current.forEach((entry, index) => {
      const row = document.createElement('tr')
      row.className = index % 2 === 0 ? 'bg-default-50' : 'bg-white'

      row.innerHTML = `
        <td class="px-2 py-1 text-xs font-mono text-default-700 whitespace-nowrap">${entry.timestamp}</td>
        <td class="px-2 py-1 text-xs font-mono text-default-600">${entry.browserLng.toFixed(6)}</td>
        <td class="px-2 py-1 text-xs font-mono text-default-600">${entry.browserLat.toFixed(6)}</td>
        <td class="px-2 py-1 text-xs font-mono text-right ${entry.browserDist > 0 ? 'text-blue-600 font-semibold' : 'text-default-400'}">${entry.browserDist > 0 ? entry.browserDist.toFixed(1) : '-'}</td>
        <td class="px-2 py-1 text-xs font-mono ${entry.wasSnapped ? 'text-green-600' : 'text-orange-600'}">${entry.snapLng.toFixed(6)}</td>
        <td class="px-2 py-1 text-xs font-mono ${entry.wasSnapped ? 'text-green-600' : 'text-orange-600'}">${entry.snapLat.toFixed(6)}</td>
        <td class="px-2 py-1 text-xs font-mono text-right ${entry.snapDist > 0 ? (entry.wasSnapped ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold') : 'text-default-400'}">${entry.snapDist > 0 ? entry.snapDist.toFixed(1) : '-'}</td>
      `

      tbody.appendChild(row)
    })

    // Scroll to bottom
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
  }

  return (
    <div className={`h-full flex flex-col bg-white border border-default-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="shrink-0 bg-default-100 border-b border-default-200 px-4 py-2">
        <h3 className="text-sm font-semibold text-default-700">
          🐛 GPS Debug Log
        </h3>
        <p className="text-xs text-default-500 mt-1">
          Последние {logEntriesRef.current.length} GPS обновлений
        </p>
      </div>

      {/* Log Table */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-default-200 z-10">
            <tr>
              <th className="px-2 py-2 text-xs font-semibold text-default-700 border-b border-default-300 whitespace-nowrap">
                Время
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-default-700 border-b border-default-300" colSpan={3}>
                Браузер (исходные координаты)
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-default-700 border-b border-default-300" colSpan={3}>
                Snap-to-Road (от backend)
              </th>
            </tr>
            <tr className="bg-default-100">
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300"></th>
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300">Lng</th>
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300">Lat</th>
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300 text-right">Δ (m)</th>
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300">Lng</th>
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300">Lat</th>
              <th className="px-2 py-1 text-xs font-medium text-default-600 border-b border-default-300 text-right">Δ (m)</th>
            </tr>
          </thead>
          <tbody>
            {/* Rows will be rendered dynamically */}
          </tbody>
        </table>

        {/* Empty state */}
        {logEntriesRef.current.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-default-400">
              Ожидание GPS данных...
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 bg-default-50 border-t border-default-200 px-4 py-2">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-mono text-green-600">●</span>
            <span className="text-default-600">Snapped (привязано к дороге)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-orange-600">●</span>
            <span className="text-default-600">Not snapped (исходные координаты)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-blue-600 font-semibold">Δ</span>
            <span className="text-default-600">Расстояние от предыдущей точки</span>
          </div>
        </div>
      </div>
    </div>
  )
}
