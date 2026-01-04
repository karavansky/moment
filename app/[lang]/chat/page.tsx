'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { ChatMessage } from '@/types/api'
import { ApiClient } from '@/lib/api'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default function ChatPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, isConnected, historyLoaded, sendMessage, subscribe, unsubscribe } =
    useWebSocketContext()

  // Subscribe to all_messages when on chat page
  useEffect(() => {
    if (!isConnected) return

    console.log('[ChatPage] Subscribing to all_messages')
    subscribe('all_messages')

    return () => {
      console.log('[ChatPage] Unsubscribing from all_messages')
      unsubscribe('all_messages')
    }
  }, [isConnected, subscribe, unsubscribe])

  useEffect(() => {
    console.log(`[ChatPage] Messages updated: ${messages.length} messages`)
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      // Load auth from localStorage
      const storedSessionId = localStorage.getItem('sessionId')
      const storedUsername = localStorage.getItem('username')
      const storedExpiresAt = localStorage.getItem('sessionExpiresAt')

      // Check if session has expired
      if (storedExpiresAt) {
        const expiresAt = parseFloat(storedExpiresAt)
        const now = Date.now() / 1000 // Convert to Unix timestamp

        if (now >= expiresAt) {
          console.log('[ChatPage] Session expired, clearing localStorage and redirecting to login')
          localStorage.removeItem('sessionId')
          localStorage.removeItem('username')
          localStorage.removeItem('sessionExpiresAt')
          router.push('/')
          return
        }
      }

      if (!storedSessionId || !storedUsername) {
        router.push('/')
        return
      }

      setUsername(storedUsername)
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to access localStorage:', error)
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[ChatPage] handleSend called. Message:', inputMessage, 'Connected:', isConnected)

    if (!inputMessage.trim() || !isConnected) {
      console.log('[ChatPage] Cannot send - empty message or not isConnected')
      return
    }

    console.log('[ChatPage] Calling sendMessage...')
    sendMessage(inputMessage)
    setInputMessage('')
  }

  const handleLogout = async () => {
    try {
      // Call backend to delete session
      const sessionId = localStorage.getItem('sessionId')
      if (sessionId) {
        await ApiClient.logout(sessionId)
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with local cleanup even if backend call fails
    }

    localStorage.removeItem('sessionId')
    localStorage.removeItem('username')
    localStorage.removeItem('sessionExpiresAt')
    // Trigger custom event to notify WebSocketContext
    window.dispatchEvent(new Event('auth-change'))
    router.push('/')
  }

  const goToUsers = () => {
    router.push('/apps')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'system' || msg.type === 'join' || msg.type === 'leave') {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <div className="bg-gray-200 dark:bg-gray-700 px-4 py-1 rounded-full text-sm text-gray-600 dark:text-gray-400">
            {msg.content}
          </div>
        </div>
      )
    }

    return (
      <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md ${msg.isOwn ? 'order-2' : 'order-1'}`}>
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {msg.username || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {formatTime(msg.timestamp)}
            </span>
          </div>
          <div
            className={`px-4 py-2 rounded-2xl ${
              msg.isOwn
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
            }`}
          >
            {msg.content}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToUsers}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
          >
            Users
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {!historyLoaded && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Loading message history...
            </div>
          )}
          {historyLoaded && messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              No messages yet. Start chatting!
            </div>
          )}
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            disabled={!isConnected}
            placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
