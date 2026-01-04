'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ApiClient } from '@/lib/api'
import { User } from '@/types/api'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default function UsersPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newHost, setNewHost] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editHost, setEditHost] = useState('')

  // Use WebSocket from context instead of creating new connection
  const { isConnected: connected, subscribe, unsubscribe } = useWebSocketContext()

  // Subscribe to all_messages when on users page
  useEffect(() => {
    if (!connected) return

    console.log('[UsersPage] Subscribing to all_messages')
    subscribe('all_messages')

    return () => {
      console.log('[UsersPage] Unsubscribing from all_messages')
      unsubscribe('all_messages')
    }
  }, [connected, subscribe, unsubscribe])

  // Reload users list when WebSocket connects to get fresh online statuses
  useEffect(() => {
    if (connected && sessionId) {
      console.log('[UsersPage] WebSocket connected, reloading users to get fresh statuses')
      loadUsers(sessionId)
    }
  }, [connected, sessionId])
  // Setup event listeners for WebSocket updates
  useEffect(() => {
    // Listen for real-time user status updates via WebSocket
    const handleUserStatusChanged = (event: any) => {
      const { username, isOnline } = event.detail
      console.log('[UsersPage] User status changed:', username, '→', isOnline)

      setUsersMap(prevMap => {
        // Игнорируем обновления если список еще не загружен
        if (prevMap.size === 0) {
          console.log('[UsersPage] Skipping update - users not loaded yet')
          return prevMap
        }

        const user = prevMap.get(username)
        if (!user) return prevMap // Пользователь не найден

        const newMap = new Map(prevMap)
        newMap.set(username, { ...user, isOnline })
        console.log('[UsersPage] Updated user status:', username, isOnline)
        return newMap
      })
    }

    // Listen for CPU status updates - O(1) вместо O(n)
    const handleCpuStatusChanged = (event: any) => {
      const { username, status } = event.detail
      //console.log("[UsersPage] CPU status changed:", username, "→", status);

      setUsersMap(prevMap => {
        // Игнорируем обновления если список еще не загружен
        if (prevMap.size === 0) {
          console.log('[UsersPage] Skipping update - users not loaded yet')
          return prevMap
        }

        const user = prevMap.get(username)
        if (!user) return prevMap // Пользователь не найден

        const newMap = new Map(prevMap)
        newMap.set(username, { ...user, status })
        //console.log("[UsersPage] Updated CPU status:", username, status);
        return newMap
      })
    }

    window.addEventListener('userStatusChanged', handleUserStatusChanged)
    window.addEventListener('cpuStatusChanged', handleCpuStatusChanged)

    console.log('[UsersPage] Event listeners registered')

    return () => {
      window.removeEventListener('userStatusChanged', handleUserStatusChanged)
      window.removeEventListener('cpuStatusChanged', handleCpuStatusChanged)
    }
  }, [])

  useEffect(() => {
    // Load auth from localStorage
    const storedSessionId = localStorage.getItem('sessionId')
    const storedUsername = localStorage.getItem('username')
    const storedExpiresAt = localStorage.getItem('sessionExpiresAt')

    // Check if session has expired
    if (storedExpiresAt) {
      const expiresAt = parseFloat(storedExpiresAt)
      const now = Date.now() / 1000 // Convert to Unix timestamp

      if (now >= expiresAt) {
        console.log('[UsersPage] Session expired, clearing localStorage and redirecting to login')
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

    setSessionId(storedSessionId)
    setCurrentUsername(storedUsername)
    loadUsers(storedSessionId)
  }, [router])

  const loadUsers = async (sessionId: string) => {
    try {
      setLoading(true)
      setError('')
      console.log('Loading users list... sessionId:', sessionId)
      const usersList = await ApiClient.getUsersList(sessionId)
      console.log('[UsersPage] Loaded users:', usersList)

      // Конвертируем массив в Map для O(1) доступа
      const newMap = new Map<string, User>()
      usersList.forEach(user => newMap.set(user.username, user))
      setUsersMap(newMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Call backend to delete session
      await ApiClient.logout(sessionId)
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

  const goToChat = () => {
    router.push(':3003/load.html')
  }

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      setError('Username and password are required')
      return
    }

    try {
      setError('')
      await ApiClient.register(newUsername, newPassword, newHost || undefined)
      setShowAddUser(false)
      setNewUsername('')
      setNewPassword('')
      setNewHost('')
      loadUsers(sessionId) // Reload list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user')
    }
  }

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return
    }

    try {
      setError('')
      await ApiClient.deleteUser(sessionId, username)
      loadUsers(sessionId) // Reload list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditHost(user.host || '')
    setEditPassword('')
    setShowEditUser(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    try {
      setError('')

      // Update password if provided
      if (editPassword) {
        await ApiClient.updatePassword(sessionId, selectedUser.username, editPassword)
      }

      // Update host
      await ApiClient.updateHost(sessionId, selectedUser.username, editHost || undefined)

      setShowEditUser(false)
      setSelectedUser(null)
      setEditPassword('')
      setEditHost('')
      loadUsers(sessionId) // Reload list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  if (loading && !sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Überwachungssystem</h1>
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
            <button
              onClick={goToChat}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              <a
                href={`http://ubuntu-wrk-03-vm:3003/load.html`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-m text-white dark:text-white hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                title="Open host in new tab"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Belastung Test
              </a>
            </button>
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              App hinzufügen
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentUsername}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alle Anwendungen ({usersMap.size})
            </h2>
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Herunterladen...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
                <button
                  onClick={() => loadUsers(sessionId)}
                  className="ml-2 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && usersMap.size === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No users found
              </div>
            )}

            {!loading && !error && usersMap.size > 0 && (
              <div className="space-y-3">
                {Array.from(usersMap.values()).map((user: User) => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => router.push(`/app?username=${user.username}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {/* Online indicator */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${
                            user.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`}
                          title={user.isOnline ? 'Online' : 'Offline'}
                        ></div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                            {user.username}
                          </h3>
                          {user.username === currentUsername && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                          {user.host && (
                            <a
                              href={
                                user.host.startsWith('http') ? user.host : `http://${user.host}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                              title="Open host in new tab"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              {user.host}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.isOnline ? 'Online' : 'Offline'}
                          </p>
                          {user.activeSessions > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              • {user.activeSessions} active{' '}
                              {user.activeSessions === 1 ? 'session' : 'sessions'}
                            </p>
                          )}
                          {user.lastActivity && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              • {new Date(user.lastActivity).toLocaleString('de-DE')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: CPU Load and Actions */}
                    <div className="flex items-center space-x-3">
                      {/* CPU Load */}
                      {user.isOnline && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            CPU: {user.status}%
                          </div>
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                user.status > 80
                                  ? 'bg-red-500'
                                  : user.status > 50
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(user.status, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Edit and Delete buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleEditUser(user)
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"
                          title="Edit user"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteUser(user.username)
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                          title="Delete user"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Neue Anwendung hinzufügen
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Host (optional)
                </label>
                <input
                  type="text"
                  value={newHost}
                  onChange={e => setNewHost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., localhost:3000"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddUser(false)
                  setNewUsername('')
                  setNewPassword('')
                  setNewHost('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit User: {selectedUser.username}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Host
                </label>
                <input
                  type="text"
                  value={editHost}
                  onChange={e => setEditHost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., localhost:3000"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditUser(false)
                  setSelectedUser(null)
                  setEditPassword('')
                  setEditHost('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
