'use client'

import { useAuth } from './AuthProvider'
import { Button } from '@heroui/react'

export function AuthButtons() {
  const { session, status, signIn, signOut } = useAuth()

  if (status === 'loading') {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (status === 'authenticated' && session?.user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Hello, {session.user.name || session.user.email}
        </span>
        <Button
          onClick={() => signOut()}
          variant="danger-soft"
          size="sm"
        >
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => signIn('google')}
        variant="tertiary"
        size="sm"
      >
        Sign in with Google
      </Button>
      <Button
        onClick={() => signIn('apple')}
        variant="tertiary"
        size="sm"
      >
        Sign in with Apple
      </Button>
    </div>
  )
}
