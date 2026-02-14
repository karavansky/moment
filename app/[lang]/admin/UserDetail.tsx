'use client'

import { useState, useTransition, useRef, useEffect, useCallback, memo } from 'react'
import {
  Button,
  Card,
  Form,
  TextField,
  Label,
  Input,
  Separator,
  Spinner,
  Chip,
  Switch,
} from '@heroui/react'
import { Undo2, Shield, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserRow } from '@/components/UsersTable'

interface SessionRow {
  sessionID: string
  userID: string
  expiresAt: string
  createdAt: string
  userAgent: string | null
  ip: string | null
}

interface UserDetailProps {
  user: UserRow
  onClose: () => void
  onUserUpdated?: () => void
  className?: string
}

export default memo(UserDetail)
function UserDetail({ user, onClose, onUserUpdated, className }: UserDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview')
  const [isPending, startTransition] = useTransition()

  const overviewRef = useRef<HTMLButtonElement>(null)
  const sessionsRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  useEffect(() => {
    const updateIndicator = () => {
      if (activeTab === 'overview' && overviewRef.current) {
        setIndicatorStyle({
          width: overviewRef.current.offsetWidth,
          left: overviewRef.current.offsetLeft,
        })
      } else if (activeTab === 'sessions' && sessionsRef.current) {
        setIndicatorStyle({
          width: sessionsRef.current.offsetWidth,
          left: sessionsRef.current.offsetLeft,
        })
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      <div className="flex items-center pl-2 gap-2 mb-4 shrink-0">
        <Button onClick={onClose}>
          <Undo2 className="w-5 h-5 text-primary" />
        </Button>
        <h2 className="text-2xl font-semibold">{user.name}</h2>
        {user.isAdmin && (
          <Chip size="md" color="accent">Admin</Chip>
        )}
      </div>
      <div className="flex flex-col relative mb-4 shrink-0">
        <div className="flex flex-row gap-2 mb-2">
          <Button
            ref={overviewRef}
            variant={activeTab === 'overview' ? 'tertiary' : 'ghost'}
            onPress={() => startTransition(() => setActiveTab('overview'))}
          >
            Overview
          </Button>
          <Button
            ref={sessionsRef}
            variant={activeTab === 'sessions' ? 'tertiary' : 'ghost'}
            onPress={() => startTransition(() => setActiveTab('sessions'))}
          >
            Sessions
          </Button>
        </div>
        <div className="relative w-full">
          <Separator />
          <div
            className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-200 ease-out"
            style={{
              width: `${indicatorStyle.width}px`,
              left: `${indicatorStyle.left}px`,
            }}
          />
        </div>
      </div>
      <div
        className={`transition-opacity duration-200 flex-1 min-h-0 flex flex-col overflow-y-auto ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              <UserOverview user={user} onUserUpdated={onUserUpdated} />
            </motion.div>
          ) : (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              <UserSessions userID={user.userID} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function UserOverview({ user, onUserUpdated }: { user: UserRow; onUserUpdated?: () => void }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
    })
  }, [user])

  const isChanged =
    formData.name !== (user.name || '') ||
    formData.email !== (user.email || '') ||
    formData.isAdmin !== user.isAdmin ||
    formData.emailVerified !== user.emailVerified

  const handleReset = useCallback(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
    })
    setError('')
  }, [user])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID: user.userID, ...formData }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update user')
        return
      }

      onUserUpdated?.()
    } catch {
      setError('Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
      <Card>
        <Card.Content className="p-6">
          <h3 className="text-lg font-semibold mb-4">User Info</h3>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center mb-4">
              {error}
            </div>
          )}
          <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <TextField
              name="name"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
            >
              <Label>Name</Label>
              <Input />
            </TextField>

            <TextField
              name="email"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
            >
              <Label>Email</Label>
              <Input />
            </TextField>

            <div className="flex items-center justify-between py-2">
              <Label>Email Verified</Label>
              <Switch
                isSelected={formData.emailVerified}
                onChange={(value: boolean) => setFormData(prev => ({ ...prev, emailVerified: value }))}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Admin</Label>
              <Switch
                isSelected={formData.isAdmin}
                onChange={(value: boolean) => setFormData(prev => ({ ...prev, isAdmin: value }))}
              />
            </div>

            {isChanged && (
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onPress={handleReset}>
                  Reset
                </Button>
                <Button type="submit" variant="primary" isDisabled={isSaving}>
                  {isSaving ? <Spinner /> : 'Save'}
                </Button>
              </div>
            )}
          </Form>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="p-6">
          <h3 className="text-lg font-semibold mb-4">Details</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted">User ID</span>
              <span className="text-sm font-mono">{user.userID}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted">Provider</span>
              <Chip size="sm" className="capitalize">{user.provider}</Chip>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted">Registered</span>
              <span className="text-sm">{new Date(user.date).toLocaleString('de-DE')}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Email Status</span>
              <Chip size="sm" color={user.emailVerified ? 'success' : 'warning'}>
                {user.emailVerified ? 'Verified' : 'Pending'}
              </Chip>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

function UserSessions({ userID }: { userID: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/sessions?userID=${userID}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const data = await res.json()
      setSessions(data)
    } catch {
      setError('Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }, [userID])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleDeleteSession = async (sessionID: string) => {
    try {
      const res = await fetch(`/api/admin/users?action=delete-session&sessionID=${sessionID}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.sessionID !== sessionID))
      }
    } catch {
      setError('Failed to delete session')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const res = await fetch(`/api/admin/users?action=delete-all-sessions&userID=${userID}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions([])
      }
    } catch {
      setError('Failed to delete sessions')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Active Sessions ({sessions.length})
        </h3>
        {sessions.length > 0 && (
          <Button variant="danger-soft" size="sm" onPress={handleDeleteAll}>
            <Trash2 className="w-4 h-4" />
            Terminate All
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-muted">No active sessions</div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map(session => (
            <Card key={session.sessionID}>
              <Card.Content className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-mono">{session.sessionID}</span>
                    {session.ip && (
                      <span className="text-xs text-muted">IP: {session.ip}</span>
                    )}
                    {session.userAgent && (
                      <span className="text-xs text-muted truncate max-w-md">
                        {session.userAgent}
                      </span>
                    )}
                    <div className="flex gap-4 text-xs text-muted">
                      <span>Created: {new Date(session.createdAt).toLocaleString('de-DE')}</span>
                      <span>Expires: {new Date(session.expiresAt).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    onPress={() => handleDeleteSession(session.sessionID)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
