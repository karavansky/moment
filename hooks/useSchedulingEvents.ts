'use client'

import { useEffect, useRef } from 'react'

export interface SchedulingEvent {
  type:
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_deleted'
    | 'worker_created'
    | 'worker_updated'
    | 'worker_deleted'
    | 'client_created'
    | 'client_updated'
    | 'client_deleted'
    | 'team_created'
    | 'team_updated'
    | 'team_deleted'
    | 'groupe_created'
    | 'groupe_updated'
    | 'groupe_deleted'
    | 'service_created'
    | 'service_updated'
    | 'service_deleted'
    | 'connected'
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
  onEvent: (event: SchedulingEvent) => void,
  onReconnect?: () => void
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect

  useEffect(() => {
    if (!isLiveMode) return

    let eventSource: EventSource | null = null
    let isClosed = false
    let hasConnectedOnce = false

    const connect = () => {
      if (isClosed) return

      // Guarantee any previous connection is fully closed before making a new one
      if (eventSource) {
        eventSource.close()
      }

      eventSource = new EventSource('/api/scheduling/events')

      eventSource.onmessage = e => {
        try {
          const data: SchedulingEvent = JSON.parse(e.data)
          if (data.type === 'connected') {
            console.log('[SSE] Connected to scheduling events')

            // If we've already connected before, this is a reconnection (e.g. waking up from sleep)
            if (hasConnectedOnce && onReconnectRef.current) {
              console.log('[SSE] Connection restored. Triggering global refresh...')
              onReconnectRef.current()
            }
            hasConnectedOnce = true

            return
          }
          onEventRef.current(data)
        } catch (err) {
          console.error('[SSE] Failed to parse event:', err)
        }
      }

      eventSource.onerror = () => {
        // EventSource automatically reconnects with exponential backoff,
        // but this often fails or hangs on mobile during deep sleep.
        console.log('[SSE] Connection error, native EventSource will try to auto-reconnect')
      }
    }

    const handleVisibilityChange = () => {
      // When the app comes back to the foreground, don't trust the native reconnect.
      // Force a brand new connection right away to bypass exponential backoff starvation.
      if (document.visibilityState === 'visible') {
        console.log('[SSE] App returned to foreground, forcing SSE reconnect...')
        connect()
      }
    }

    connect()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isClosed = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      eventSource?.close()
    }
  }, [isLiveMode])
}
