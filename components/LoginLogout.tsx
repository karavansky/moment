'use client'

import { Image, LogOut, Settings } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Button, Avatar, Dropdown, Label } from '@heroui/react'
import { useCallback, useState } from 'react'
import type {Selection} from "@heroui/react";

export function LoginLogout() {
  const { session, status, signIn, signOut } = useAuth()
  const [selected, setSelected] = useState<Selection>(new Set());

  const handleLogin = useCallback((keys: Selection) => {
    console.log('LoginLogout handleLogin called with keys:', keys)
    if (keys === 'all') return
    const selectedKey = keys.values().next().value
    console.log('Selected key:', selectedKey)
    if (selectedKey === 'item-1') {
      signIn('google')
    } else if (selectedKey === 'item-2') {
      signIn('apple')
    }
  }, [signIn])

  if (status === 'loading') {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (status === 'authenticated' && session?.user && session.user.isAdmin) {
    return (
      <Dropdown>
        <Dropdown.Trigger className="rounded-full">
          <Avatar>
            <Avatar.Image alt={session.user.name || 'User'} src={session.user.image || ''} />
            <Avatar.Fallback delayMs={600}>JD</Avatar.Fallback>
          </Avatar>
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Image alt={session.user.name || 'User'} src={session.user.image || ''} />
                <Avatar.Fallback delayMs={600}>JD</Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-0">
                <p className="text-sm leading-5 font-medium">{session.user.name || 'User'}</p>
                <p className="text-xs leading-none text-muted">{session.user.email}</p>
              </div>
            </div>
          </div>
          <Dropdown.Menu>
            <Dropdown.Item id="dashboard" textValue="Dashboard">
              <Label>Dashboard</Label>
            </Dropdown.Item>
            <Dropdown.Item id="profile" textValue="Profile">
              <Label>Profile</Label>
            </Dropdown.Item>
            <Dropdown.Item id="settings" textValue="Settings">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Settings</Label>
                <Settings className="size-3.5 text-muted" />
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="new-project" textValue="New project">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>S3 Storage</Label>
                <Image className="size-3.5 text-muted" />
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue="Logout" variant="danger">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Log Out</Label>
                <LogOut className="size-3.5 text-danger" />
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    )
  }

  if (status === 'authenticated' && session?.user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Hello, {session.user.name || session.user.email}
        </span>
        <Button onClick={() => signOut()} variant="danger-soft" size="sm">
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Dropdown>
      <Button variant="tertiary">Anmelden</Button>
      <Dropdown.Popover>
        <Dropdown.Menu selectionMode="single" selectedKeys={selected} onSelectionChange={handleLogin}>
          <Dropdown.Item id="item-1" textValue="Item 1" className="hover:bg-surface-secondary">
            Sign in with Google
          </Dropdown.Item>
          <Dropdown.Item id="item-2" textValue="Item 1" className="hover:bg-surface-secondary">
            Sign in with Apple
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

/*

    <div className="flex items-center gap-2">
      <Button onClick={() => signIn('google')} variant="tertiary" size="sm">
        Sign in with Google
      </Button>
      <Button onClick={() => signIn('apple')} variant="tertiary" size="sm">
        Sign in with Apple
      </Button>
    </div>

    */
