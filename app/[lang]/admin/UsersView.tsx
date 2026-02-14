'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import UsersTable, { type UserRow } from '@/components/UsersTable'
import UserDetail from './UserDetail'

export default function UsersView() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const onSelectUser = (userID: string) => {
    startTransition(() => {
      const user = users.find(u => u.userID === userID)
      if (user) setSelectedUser(user)
    })
  }

  const onCloseDetail = () => {
    startTransition(() => {
      setSelectedUser(null)
    })
  }

  const onUserUpdated = () => {
    fetchUsers()
    setSelectedUser(null)
  }

  return (
    <div
      className={`w-full flex flex-col gap-1  ${
        selectedUser ? 'h-full overflow-hidden' : 'h-full sm:overflow-hidden overflow-auto'
      }`}
    >
      <div
        className={`transition-opacity duration-200 h-full flex flex-col ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="wait">
          {selectedUser ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full flex flex-col"
            >
              <UserDetail
                user={selectedUser}
                onClose={onCloseDetail}
                onUserUpdated={onUserUpdated}
                className="pt-2"
              />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full flex flex-col"
            >
              <UsersTable
                list={users}
                isLoading={isLoading}
                onRowClick={onSelectUser}
                className="pt-2"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
