'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { WSMessage, ChatMessage, WSMessageShort } from '@/types/api'
import { ApiClient } from '@/lib/api'

interface UseWebSocketOptions {
  sessionId: string
  username: string
  onConnectionChange?: (connected: boolean) => void
  subscribeToTypes?: string[] // Types of messages to subscribe to (e.g., ["cpu_status", "user_status"])
}

export function useWebSocket({
  sessionId,
  username,
  onConnectionChange,
  subscribeToTypes = [],
}: UseWebSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)
  const onConnectionChangeRef = useRef(onConnectionChange)
  const sessionIdRef = useRef(sessionId)
  const usernameRef = useRef(username)
  const subscribeToTypesRef = useRef(subscribeToTypes)
  const pendingSubscriptionsRef = useRef<string[]>([])
  const subscribedTypesRef = useRef<Set<string>>(new Set())
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  // Keep refs updated
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange
    sessionIdRef.current = sessionId
    usernameRef.current = username
    subscribeToTypesRef.current = subscribeToTypes
  })

  // Setup BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Create broadcast channel for syncing WebSocket events between tabs
    const channel = new BroadcastChannel('websocket-events')
    broadcastChannelRef.current = channel

    // Listen for events from other tabs
    channel.onmessage = event => {
      const { type, data } = event.data
      //console.log("[BroadcastChannel] Received event from other tab:", type, data);

      // Dispatch the same custom events that would come from WebSocket
      if (type === 'cpuStatusChanged') {
        window.dispatchEvent(new CustomEvent('cpuStatusChanged', { detail: data }))
      } else if (type === 'userStatusChanged') {
        window.dispatchEvent(new CustomEvent('userStatusChanged', { detail: data }))
      } else if (type === 'messageReceived') {
        window.dispatchEvent(new CustomEvent('messageReceived', { detail: data }))
      }
    }

    return () => {
      channel.close()
      broadcastChannelRef.current = null
    }
  }, [])

  const loadMessageHistory = useCallback(async () => {
    if (!sessionIdRef.current || historyLoaded) {
      console.log('Skipping history load:', { hasSessionId: !!sessionIdRef.current, historyLoaded })
      return
    }

    // Skip loading history for now - endpoint not available
    console.log('Message history loading disabled (endpoint /messages not available)')
    setHistoryLoaded(true)
    return

    try {
      console.log('Loading message history...')
      const response = await ApiClient.getMessageHistory(sessionIdRef.current)

      const historyMessages: ChatMessage[] = response.map((msg: any) => ({
        id: `history-${msg.id}`,
        type: 'message', // All messages from history are regular messages
        content: msg.content,
        username: msg.username,
        timestamp: new Date(msg.createdAt), // createdAt is already in ISO format
        isOwn: msg.username === usernameRef.current,
      }))

      // Sort messages by timestamp (oldest first)
      historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      setMessages(historyMessages)
      setHistoryLoaded(true)
      console.log(`Loaded ${historyMessages.length} messages from history`)
    } catch (error) {
      console.error('Failed to load message history:', error)
      // Don't prevent WebSocket connection if history loading fails
      setHistoryLoaded(true)
    }
  }, [historyLoaded]) // Only historyLoaded as dependency

  const connect = useCallback(async () => {
    console.log(
      '[useWebSocket] connect() called with sessionId:',
      !!sessionIdRef.current,
      'username:',
      usernameRef.current
    )

    if (!sessionIdRef.current || !usernameRef.current) {
      console.log('[useWebSocket] Skipping connection: missing credentials')
      return
    }

    // If already connected or connecting, skip
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(
        '[useWebSocket] Already connected, skipping. readyState:',
        wsRef.current.readyState
      )
      return
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log(
        '[useWebSocket] Already connecting, skipping. readyState:',
        wsRef.current.readyState
      )
      return
    }

    try {
      const wsUrl = ApiClient.getWebSocketURL(sessionIdRef.current)
      const ws = new WebSocket(wsUrl)

      // Helper function to subscribe to next message type in queue
      const subscribeNext = (ws: WebSocket) => {
        if (pendingSubscriptionsRef.current.length === 0) {
          console.log(
            '[WebSocket] All subscriptions completed:',
            Array.from(subscribedTypesRef.current)
          )
          return
        }

        const messageType = pendingSubscriptionsRef.current[0]
        console.log('[WebSocket] Subscribing to:', messageType)

        const subscribeMsg = JSON.stringify({
          type: 'subscribe',
          messageType: messageType,
        })

        ws.send(subscribeMsg)

        // Timeout fallback - if no response in 3 seconds, try next subscription anyway
        setTimeout(() => {
          if (pendingSubscriptionsRef.current[0] === messageType) {
            console.warn(
              '[WebSocket] Subscription timeout for:',
              messageType,
              '- proceeding to next'
            )
            pendingSubscriptionsRef.current.shift()
            subscribeNext(ws)
          }
        }, 3000)
      }

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        setConnected(true)
        onConnectionChangeRef.current?.(true)
        reconnectAttemptsRef.current = 0

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        // Start sequential subscription process
        if (subscribeToTypesRef.current.length > 0) {
          pendingSubscriptionsRef.current = [...subscribeToTypesRef.current]
          subscribedTypesRef.current.clear()
          console.log(
            '[WebSocket] Starting sequential subscriptions:',
            pendingSubscriptionsRef.current
          )
          subscribeNext(ws)
        }
      }

      ws.onmessage = event => {
        // Fast path: Handle simple ping/pong strings first (optimized, 75% less traffic)
        if (event.data === 'ping') {
          //console.log("[WebSocket] 🏓 Received ping, sending pong");
          ws.send('pong')
          return
        }

        if (event.data === 'pong') {
          //console.log("[WebSocket] 🏓 Received pong");
          return
        }

        try {
          // Handle invalid JSON from backend (temporary fix for backend bug)
          if (event.data.includes('\\(messageType)')) {
            // Silently ignore malformed subscription response
            return
          }

          //console.log("[WebSocket] ═══ RAW MESSAGE ═══");
          //console.log("[WebSocket] Raw data:", event.data);
          const data: WSMessageShort = JSON.parse(event.data)
          /*
          console.log(
            "[WebSocket] Parsed type:",
            data.type,
            "| username:",
            data.username,
            "| content:",
            data.content?.substring(0, 50)
          );
*/
          // Special logging for user_status messages
          if (data.t === 'user_status') {
            console.log('🔔🔔🔔 USER_STATUS EVENT DETECTED! 🔔🔔🔔', data)
          }
          // Legacy JSON ping/pong support (kept for compatibility)
          if (data.t === 'ping') {
            console.log('[WebSocket] 🏓 Received legacy JSON ping, sending simple pong')
            ws.send('pong')
            return
          }

          // Handle subscription responses
          if (
            data.t === 'subscribe_response' ||
            data.t === 'unsubscribe_response' ||
            data.t === 'subscribed' ||
            data.t === 'unsubscribed'
          ) {
            // Handle successful subscription
            if (data.t === 'subscribed' && data.c) {
              console.log('[WebSocket] ✅ Subscription confirmed:', data.c)
              console.log('[WebSocket] 📊 Expecting messages for:', data.c)
              subscribedTypesRef.current.add(data.c)

              // Remove from pending and subscribe to next
              if (pendingSubscriptionsRef.current[0] === data.c) {
                pendingSubscriptionsRef.current.shift()
                subscribeNext(ws)
              }
            }
            return
          }

          // Handle user status updates separately
          if (data.t === 'user_status') {
            console.log('[WebSocket] user_status:', data.u, '→', data.c)
            // Emit custom event for user status changes
            // Use queueMicrotask to ensure event is dispatched after React renders
            const statusDetail = {
              username: data.u,
              isOnline: data.c === 'online',
            }
            console.log('[WebSocket] Dispatching userStatusChanged event:', statusDetail)
            queueMicrotask(() => {
              window.dispatchEvent(
                new CustomEvent('userStatusChanged', {
                  detail: statusDetail,
                })
              )
              // Broadcast to other tabs
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'userStatusChanged',
                  data: statusDetail,
                })
              }
            })
            return // Don't add to chat messages
          }

          // Handle CPU status updates
          if (data.t === 'cpu_status' || data.t === 'cpu') {
            // console.log("[WebSocket] cpu_status:", data.username, "→", data.content);
            // Emit custom event for CPU status changes
            // Use queueMicrotask to ensure event is dispatched after React renders
            const cpuDetail = {
              username: data.u,
              status: parseInt(data.c, 10),
            }
            queueMicrotask(() => {
              window.dispatchEvent(
                new CustomEvent('cpuStatusChanged', {
                  detail: cpuDetail,
                })
              )
              // Broadcast to other tabs
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'cpuStatusChanged',
                  data: cpuDetail,
                })
              }
            })
            return // Don't add to chat messages
          }

          // Handle new messages (for real-time updates on user page)
          if (data.t === 'message' && data.u) {
            /*
            console.log("[WebSocket] Received message event:", {
              type: data.t,
              username: data.u,
              content: data.c?.substring(0, 100), // First 100 chars
              timestamp: data.timestamp,
            });
*/
            // Parse the content to extract message details
            const messageDetail = {
              username: data.u,
              message: {
                id: `${Date.now()}-${Math.random()}`,
                username: data.u,
                content: data.c,
                createdAt: new Date(data.d * 1000).toISOString(),
              },
            }

            // Dispatch event using queueMicrotask for better performance
            // This ensures React components have time to register listeners
            queueMicrotask(() => {
              //console.log("[WebSocket] Dispatching messageReceived event for user:", data.username);
              window.dispatchEvent(
                new CustomEvent('messageReceived', {
                  detail: messageDetail,
                })
              )
              // Broadcast to other tabs
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'messageReceived',
                  data: messageDetail,
                })
              }
            })
          }

          // Add message to messages state (for chat page)
          // Only add chat-related messages, not service messages like ping/pong
          if (
            data.t === 'system' ||
            data.t === 'message' ||
            data.t === 'join' ||
            data.t === 'leave'
          ) {
            const message: ChatMessage = {
              id: `${Date.now()}-${Math.random()}`,
              type: data.t,
              content: data.c,
              username: data.u,
              timestamp: new Date(data.d * 1000), // Convert from Unix timestamp
              isOwn: data.u === usernameRef.current && data.t === 'message',
            }
            setMessages(prev => {
              const newMessages = [...prev, message]
              console.log(
                '[WebSocket] 📝 Added message to state. Total messages:',
                newMessages.length
              )
              return newMessages
            })
          }
        } catch (error) {
          console.error('Failed to parse message:', error)
          console.error('Raw message data:', event.data)
        }
      }

      ws.onerror = error => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = event => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason })
        setConnected(false)
        onConnectionChangeRef.current?.(false)
        wsRef.current = null

        // Check if session is invalid (code 1008 = policyViolation)
        if (event.code === 1008) {
          console.error('❌ Session invalid or expired. Logging out...')
          // Clear local storage
          localStorage.removeItem('sessionId')
          localStorage.removeItem('username')
          localStorage.removeItem('sessionExpiresAt')
          // Trigger auth-change event to notify other components
          window.dispatchEvent(new Event('auth-change'))
          // Redirect to login page
          window.location.href = '/'
          return
        }

        // Only attempt to reconnect if component is still mounted
        if (!isMountedRef.current) {
          console.log('Component unmounted, skipping reconnect')
          return
        }

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        // Attempt to reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++

        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`)
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`Reconnecting (attempt ${reconnectAttemptsRef.current})...`)
            connect()
          }
        }, delay)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }, []) // No dependencies - uses refs instead

  const sendMessage = useCallback((content: string) => {
    console.log('[WebSocket] Attempting to send message:', content)
    console.log('[WebSocket] WebSocket state:', wsRef.current?.readyState, 'OPEN=', WebSocket.OPEN)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending message to server')
      wsRef.current.send(content)
    } else {
      console.error(
        '[WebSocket] Cannot send - WebSocket is not connected. State:',
        wsRef.current?.readyState
      )
    }
  }, [])

  const disconnect = useCallback(() => {
    console.log('[useWebSocket] disconnect() called. isMounted:', isMountedRef.current)

    isMountedRef.current = false

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close WebSocket connection
    if (wsRef.current) {
      const currentState = wsRef.current.readyState
      console.log('[useWebSocket] Closing WebSocket connection, readyState:', currentState)

      // Only try to close if not already closed/closing
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }

      wsRef.current = null
      setConnected(false)
    }
  }, [])

  const subscribe = useCallback((messageType: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const subscribeMsg = JSON.stringify({
        type: 'subscribe',
        messageType: messageType,
      })
      console.log(`[useWebSocket] Subscribing to: ${messageType}`)
      wsRef.current.send(subscribeMsg)
    }
  }, [])

  const unsubscribe = useCallback((messageType: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const unsubscribeMsg = JSON.stringify({
        type: 'unsubscribe',
        messageType: messageType,
      })
      console.log(`[useWebSocket] Unsubscribing from: ${messageType}`)
      wsRef.current.send(unsubscribeMsg)
    }
  }, [])

  useEffect(() => {
    console.log('History loading effect:', {
      sessionId: !!sessionId,
      username: !!username,
      historyLoaded,
    })
    if (sessionId && username && !historyLoaded) {
      loadMessageHistory()
    }
  }, [sessionId, username, historyLoaded, loadMessageHistory])

  useEffect(() => {
    console.log('WebSocket connection effect:', {
      sessionId: !!sessionId,
      username: !!username,
      historyLoaded,
    })
    isMountedRef.current = true

    if (sessionId && username && historyLoaded) {
      // If credentials changed, disconnect old connection first
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) &&
        (sessionIdRef.current !== sessionId || usernameRef.current !== username)
      ) {
        console.log('[useWebSocket] Credentials changed, closing old connection')
        wsRef.current.close()
        wsRef.current = null
      }

      // Only connect if not already connected or connecting
      const currentState = wsRef.current?.readyState
      if (currentState !== WebSocket.OPEN && currentState !== WebSocket.CONNECTING) {
        console.log('[useWebSocket] Initiating new connection')
        connect()
      } else {
        console.log('[useWebSocket] Skipping connect - already in state:', currentState)
      }
    } else if (!sessionId || !username) {
      // If credentials are cleared (logout), disconnect
      if (wsRef.current) {
        console.log('[useWebSocket] Credentials cleared, disconnecting')
        wsRef.current.close()
        wsRef.current = null
        setConnected(false)
      }
    }

    return () => {
      // Only mark as unmounted, actual disconnect happens in cleanup effect
      console.log('[useWebSocket] Effect cleanup - marking as unmounted')
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, username, historyLoaded]) // connect and disconnect are stable

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    messages,
    connected,
    historyLoaded,
    sendMessage,
    reconnect: connect,
    subscribe,
    unsubscribe,
  }
}
