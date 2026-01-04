'use client'

import { useState, useEffect, useMemo, memo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ApiClient } from '@/lib/api'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

interface UserMessage {
  id: string
  username: string
  content: string
  createdAt: string
}

// ActivityCharts component removed (recharts dependency removed)

// Memoized CPU Status component
const CpuStatusIndicator = memo(({ cpuStatus }: { cpuStatus: number }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-right">
        <div className="text-sm font-medium text-gray-900 dark:text-white">CPU: {cpuStatus}%</div>
        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              cpuStatus > 80 ? 'bg-red-500' : cpuStatus > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(cpuStatus, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
})

CpuStatusIndicator.displayName = 'CpuStatusIndicator'

// Messages List component (not memoized to allow real-time updates)
const MessagesList = ({
  paginatedMessages,
  filteredMessages,
  messages,
  selectedTitle,
  searchText,
  showRaw,
  currentPage,
  totalPages,
  itemsPerPage,
  uniqueTitles,
  setSelectedTitle,
  setSearchText,
  setShowRaw,
  setCurrentPage,
  setItemsPerPage,
  formatDate,
}: {
  paginatedMessages: any[]
  filteredMessages: any[]
  messages: any[]
  selectedTitle: string
  searchText: string
  showRaw: boolean
  currentPage: number
  totalPages: number
  itemsPerPage: number
  uniqueTitles: string[]
  setSelectedTitle: (value: string) => void
  setSearchText: (value: string) => void
  setShowRaw: (value: boolean) => void
  setCurrentPage: (value: number | ((prev: number) => number)) => void
  setItemsPerPage: (value: number) => void
  formatDate: (date: string) => string
}) => {
  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Header with filters - fixed height */}
        <div className="px-4 py-5 sm:p-6 shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Gesamtnachrichten: {filteredMessages.length}{' '}
                {(selectedTitle !== 'All' || searchText.trim()) && `/ ${messages.length}`}
              </h2>

              {/* Items per page */}
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="items-per-page"
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  Pro Seite:
                </label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              {/* Raw toggle */}
              <div className="flex items-center space-x-2">
                <label htmlFor="raw-toggle" className="text-sm text-gray-600 dark:text-gray-400">
                  Raw:
                </label>
                <input
                  id="raw-toggle"
                  type="checkbox"
                  checked={showRaw}
                  onChange={e => setShowRaw(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              {/* Search by content */}
              <div className="flex items-center space-x-2">
                <label htmlFor="search-text" className="text-sm text-gray-600 dark:text-gray-400">
                  Suche:
                </label>
                <input
                  id="search-text"
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Text suchen..."
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>

              {/* Filter by Title */}
              <div className="flex items-center space-x-2">
                <label htmlFor="title-filter" className="text-sm text-gray-600 dark:text-gray-400">
                  Nach Titel filtern:
                </label>
                <select
                  id="title-filter"
                  value={selectedTitle}
                  onChange={e => setSelectedTitle(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueTitles.map(title => (
                    <option key={title} value={title}>
                      {title === 'All' ? 'Alle' : title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Messages content area - scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6">
          {filteredMessages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              {selectedTitle === 'All' && !searchText.trim()
                ? 'Keine Nachrichten für diesen Benutzer gefunden'
                : `Keine Nachrichten gefunden`}
            </p>
          ) : (
            <>
              {/* Scrollable messages list */}
              <div
                className={`flex-1 overflow-y-auto py-4 ${selectedTitle === 'All' ? 'space-y-4' : 'space-y-0.5'}`}
              >
                {paginatedMessages.map(message => {
                  // Raw mode - show content as-is
                  if (showRaw) {
                    return (
                      <div
                        key={message.id}
                        className="text-sm text-gray-700 dark:text-gray-300 font-mono py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded"
                      >
                        <span className="text-gray-500 dark:text-gray-400">
                          [{formatDate(message.createdAt)}]
                        </span>{' '}
                        {message.content}
                      </div>
                    )
                  }

                  const { title, body, isRaw } = message.parsed

                  // Compact single-line view when filtering by specific title
                  if (selectedTitle !== 'All') {
                    const displayContent = body.trim() || title || '(leer)'
                    return (
                      <div
                        key={message.id}
                        className="text-sm text-gray-700 dark:text-gray-300 font-mono py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded"
                      >
                        <span className="text-gray-500 dark:text-gray-400">
                          [{formatDate(message.createdAt)}]
                        </span>{' '}
                        {displayContent}
                      </div>
                    )
                  }

                  // Compact single-line view for all messages (not filtered)
                  return (
                    <div
                      key={message.id}
                      className={`text-sm font-mono py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded ${
                        isRaw
                          ? 'text-yellow-700 dark:text-yellow-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        [{formatDate(message.createdAt)}]
                      </span>{' '}
                      {body}{' '}
                      {title && (
                        <span
                          className={`${
                            isRaw
                              ? 'text-yellow-600 dark:text-yellow-500'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          [{title}]
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination Controls - fixed at bottom */}
              {totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Seite {currentPage} von {totalPages} ({filteredMessages.length} Nachrichten)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      «
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      »
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      »»
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function UserPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const username = searchParams.get('username')

  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<UserMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTitle, setSelectedTitle] = useState<string>('All')
  const [searchText, setSearchText] = useState<string>('')
  const [showRaw, setShowRaw] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(100)
  const [cpuStatus, setCpuStatus] = useState<number>(0)

  // Use WebSocket from context instead of creating new connection
  const { isConnected: connected, subscribe, unsubscribe } = useWebSocketContext()

  // Handle subscription based on username query parameter
  useEffect(() => {
    if (!connected) return

    if (username) {
      // If username is specified, subscribe to user-specific messages only
      console.log(`[UserPage] Subscribing to user:${username}`)
      subscribe(`user:${username}`)

      // Cleanup: unsubscribe when component unmounts or username changes
      return () => {
        console.log(`[UserPage] Unsubscribing from user:${username}`)
        unsubscribe(`user:${username}`)
      }
    } else {
      // If no username specified, no subscription needed (user page without specific user)
      console.log(`[UserPage] No username specified, no message subscription`)
    }
  }, [username, connected, subscribe, unsubscribe])

  // Setup event listener for real-time CPU status updates via WebSocket
  useEffect(() => {
    const handleCpuStatusChanged = (event: any) => {
      const { username: updatedUsername, status } = event.detail
      // Update only if it's for the current user
      if (updatedUsername === username) {
        setCpuStatus(status)
      }
    }

    window.addEventListener('cpuStatusChanged', handleCpuStatusChanged)

    return () => {
      window.removeEventListener('cpuStatusChanged', handleCpuStatusChanged)
    }
  }, [username])

  // Setup event listener for real-time message updates via WebSocket
  useEffect(() => {
    const handleMessageReceived = (event: any) => {
      console.log('[UserPage] Received messageReceived event:', event.detail)
      const { username: msgUsername, message } = event.detail
      // Update only if it's a message for the current user
      if (msgUsername === username) {
        console.log('[UserPage] Message is for current user, adding to list')
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          if (prev.some(m => m.id === message.id)) {
            console.log('[UserPage] Message already exists, skipping')
            return prev
          }
          console.log('[UserPage] Adding new message to list (at the beginning)')

          // New messages go to the beginning (sorted by descending time)
          // Move to first page to see the new message
          console.log('[UserPage] Moving to first page to show new message')
          setCurrentPage(1)

          // Add new message at the beginning of the array
          return [message, ...prev]
        })
      } else {
        console.log(
          '[UserPage] Message is for different user, ignoring. Expected:',
          username,
          'Got:',
          msgUsername
        )
      }
    }

    console.log('[UserPage] Setting up messageReceived listener for user:', username)
    window.addEventListener('messageReceived', handleMessageReceived)

    return () => {
      window.removeEventListener('messageReceived', handleMessageReceived)
    }
  }, [username])

  useEffect(() => {
    // Load auth from localStorage
    const storedSessionId = localStorage.getItem('sessionId')
    const storedExpiresAt = localStorage.getItem('sessionExpiresAt')

    // Check if session has expired
    if (storedExpiresAt) {
      const expiresAt = parseFloat(storedExpiresAt)
      const now = Date.now() / 1000 // Convert to Unix timestamp

      if (now >= expiresAt) {
        console.log('[AppPage] Session expired, clearing localStorage and redirecting to login')
        localStorage.removeItem('sessionId')
        localStorage.removeItem('username')
        localStorage.removeItem('sessionExpiresAt')
        router.push('/')
        return
      }
    }

    if (!storedSessionId) {
      router.push('/')
      return
    }

    if (!username) {
      setError('Username parameter is required')
      setLoading(false)
      return
    }

    setSessionId(storedSessionId)
    loadUserMessages(storedSessionId, username)
  }, [router, username])

  const loadUserMessages = async (sessionId: string, user: string) => {
    try {
      setLoading(true)
      setError('')
      const messagesList = await ApiClient.getUserMessages(sessionId, user)
      setMessages(messagesList)

      // Extract latest CPU status from messages
      for (let i = messagesList.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(messagesList[i].content)
          if (parsed.type === 'cpu' && parsed.message?.body?.status !== undefined) {
            setCpuStatus(parsed.message.body.status)
            break
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
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

  const goBack = () => {
    router.push('/apps')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const parseContent = (content: string) => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.message) {
        const title = parsed.message.title || ''
        let body = ''

        // Special handling for console.log - join array into single line
        if (title === 'console.log' && Array.isArray(parsed.message.body)) {
          body = parsed.message.body
            .map((item: any) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
            .join('')
        } else {
          body = parsed.message.body ? JSON.stringify(parsed.message.body, null, 2) : ''
        }

        return {
          title,
          body,
          isRaw: false,
        }
      }
      // JSON parsed but no message field - show as formatted JSON
      return { title: '', body: JSON.stringify(parsed, null, 2), isRaw: false }
    } catch {
      // Failed to parse - show raw content
      return { title: 'Roher Inhalt', body: content, isRaw: true }
    }
  }

  // Get unique titles from messages
  const uniqueTitles = useMemo(() => {
    const titles = new Set<string>()
    messages.forEach(msg => {
      const { title } = parseContent(msg.content)
      if (title) {
        titles.add(title)
      }
    })
    return ['All', ...Array.from(titles).sort()]
  }, [messages])

  // Parse all messages once and cache results
  const parsedMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      parsed: parseContent(msg.content),
    }))
  }, [messages])

  // Filter messages by selected title
  const filteredMessages = useMemo(() => {
    let filtered = parsedMessages

    // Filter by title
    if (selectedTitle !== 'All') {
      filtered = filtered.filter(msg => {
        return msg.parsed.title === selectedTitle
      })
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(msg => {
        if (showRaw) {
          // Raw mode: search in original content
          return msg.content.toLowerCase().includes(searchLower)
        } else {
          // Parsed mode: search in parsed title and body
          const searchableText = `${msg.parsed.title} ${msg.parsed.body}`.toLowerCase()
          return searchableText.includes(searchLower)
        }
      })
    }

    return filtered
  }, [parsedMessages, selectedTitle, searchText, showRaw])

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage)
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredMessages.slice(startIndex, endIndex)
  }, [filteredMessages, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTitle, searchText, showRaw])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Nachrichten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Fehler: {error}</div>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Zurück
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={goBack} className="text-blue-500 hover:text-blue-600">
              ← Zurück
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nachrichten von {username}
            </h1>
            {/* WebSocket status indicator */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
                title={connected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
              ></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <CpuStatusIndicator cpuStatus={cpuStatus} />
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Abmelden
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Activity Charts removed (recharts dependency removed) */}

        {/* Messages List */}
        <div className="flex-1 overflow-hidden">
          <MessagesList
            paginatedMessages={paginatedMessages}
            filteredMessages={filteredMessages}
            messages={messages}
            selectedTitle={selectedTitle}
            searchText={searchText}
            showRaw={showRaw}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            uniqueTitles={uniqueTitles}
            setSelectedTitle={setSelectedTitle}
            setSearchText={setSearchText}
            setShowRaw={setShowRaw}
            setCurrentPage={setCurrentPage}
            setItemsPerPage={setItemsPerPage}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  )
}

export default function UserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Laden...</p>
          </div>
        </div>
      }
    >
      <UserPageContent />
    </Suspense>
  )
}
