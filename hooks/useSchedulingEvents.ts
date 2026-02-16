'use client'

import { useEffect, useRef } from 'react'

export interface SchedulingEvent {
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'connected'
  appointmentID?: string
  workerIds?: string[]
  clientID?: string
  isOpen?: boolean
  openedAt?: string | null
  closedAt?: string | null
  firmaID?: string
}

/**
 * Подписывается на SSE-поток scheduling events.
 * EventSource автоматически переподключается при обрыве.
 */
export function useSchedulingEvents(
  isLiveMode: boolean,
  onEvent: (event: SchedulingEvent) => void
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!isLiveMode) return

    let eventSource: EventSource | null = null
    let isClosed = false

    const connect = () => {
      if (isClosed) return

      eventSource = new EventSource('/api/scheduling/events')

      eventSource.onmessage = (e) => {
        try {
          const data: SchedulingEvent = JSON.parse(e.data)
          if (data.type === 'connected') {
            console.log('[SSE] Connected to scheduling events')
            return
          }
          onEventRef.current(data)
        } catch (err) {
          console.error('[SSE] Failed to parse event:', err)
        }
      }

      eventSource.onerror = () => {
        // EventSource automatically reconnects with exponential backoff
        console.log('[SSE] Connection error, will auto-reconnect')
      }
    }

    connect()

    return () => {
      isClosed = true
      eventSource?.close()
    }
  }, [isLiveMode])
}
