'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChatMessage } from '@/types/api'

interface WebSocketContextType {
  isConnected: boolean
  messages: ChatMessage[]
  historyLoaded: boolean
  sendMessage: (content: string) => void
  reconnect: () => Promise<void>
  subscribe: (messageType: string) => void
  unsubscribe: (messageType: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState('')
  const [username, setUsername] = useState('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Load initial values
    //console.log("[WebSocketContext] Initializing from storage");
    const updateFromStorage = () => {
      const storedSessionId = localStorage.getItem('sessionId')
      const storedUsername = localStorage.getItem('username')
      const storedExpiresAt = localStorage.getItem('sessionExpiresAt')

      // Reduced logging - only log when session changes
      // console.log('[WebSocketContext] Updating from storage:', {
      //   hasSessionId: !!storedSessionId,
      //   username: storedUsername,
      //   sessionId: storedSessionId,
      //   expiresAt: storedExpiresAt,
      // })

      // Check if session has expired
      if (storedExpiresAt) {
        const expiresAt = parseFloat(storedExpiresAt)
        const now = Date.now() / 1000 // Convert to Unix timestamp

        if (now >= expiresAt) {
          console.log('[WebSocketContext] Session expired, clearing localStorage')
          localStorage.removeItem('sessionId')
          localStorage.removeItem('username')
          localStorage.removeItem('sessionExpiresAt')
          setSessionId('')
          setUsername('')
          setIsReady(false)
          return
        }
      }

      if (storedSessionId && storedUsername) {
        setSessionId(storedSessionId)
        setUsername(storedUsername)
        setIsReady(true)
      } else {
        setSessionId('')
        setUsername('')
        setIsReady(false)
      }
    }

    updateFromStorage()

    // Listen for storage changes (when user logs in/out in same tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sessionId' || e.key === 'username' || e.key === null) {
        updateFromStorage()
      }
    }

    // Listen for custom event (for same-tab updates)
    const handleAuthChange = () => {
      updateFromStorage()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-change', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  const { connected, messages, historyLoaded, sendMessage, reconnect, subscribe, unsubscribe } =
    useWebSocket({
      sessionId: isReady ? sessionId : '',
      username: isReady ? username : '',
      // Only subscribe to global status updates by default
      // Pages can subscribe to "all_messages" or "user:{username}" as needed
      subscribeToTypes: ['cpu_status', 'user_status'],
    })

  // Only log when state actually changes
  useEffect(() => {
    console.log('[WebSocketContext] State:', { isReady, sessionId: sessionId, username, connected })
  }, [isReady, sessionId, username, connected])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected: connected,
        messages,
        historyLoaded,
        sendMessage,
        reconnect,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}
