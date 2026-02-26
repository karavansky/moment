'use client'

import { Calendar1, Image, LogOut, Settings } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Button, Avatar, Dropdown, Label } from '@heroui/react'
import { useCallback, useState } from 'react'
import type { Selection } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'
import { localizedLink } from '@/utils/localizedLink'
import { AuthModal } from './AuthModal'
import { useTranslation } from './Providers'

export function LoginLogout() {
  const { session, status, signIn, signInWithCredentials, signOut } = useAuth()
  const [selected, setSelected] = useState<Selection>(new Set())
  const router = useRouter()
  const lang = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()

  const handleLogin = useCallback(
    (keys: Selection) => {
      console.log('LoginLogout handleLogin called with keys:', keys)
      if (keys === 'all') return
      const selectedKey = keys.values().next().value
      console.log('Selected key:', selectedKey)
      if (selectedKey === 'item-1') {
        signIn('google')
      } else if (selectedKey === 'item-2') {
        signIn('apple')
      }
    },
    [signIn]
  )
  const handleSignIn = async (provider: 'google' | 'apple') => {
    await signIn(provider, `/${lang}/tickets`)
  }

  const handleCredentialsSignIn = async (email: string, password: string) => {
    console.log('[LoginLogout] handleCredentialsSignIn called with lang:', lang)
    return signInWithCredentials(email, password, `/${lang}/tickets`)
  }
  const handleAdmin = useCallback(
    (keys: Selection) => {
      console.log('LoginLogout handleLogin called with keys:', keys)
      if (keys === 'all') return
      const selectedKey = keys.values().next().value
      console.log('Selected key:', selectedKey)
      switch (selectedKey) {
        case 'dashboard':
          router.push(localizedLink('admin', lang))
          break
        case 'profile':
          break
        case 'settings':
          router.push(`/${lang}/settings`)
          break
        case 'new-project':
          router.push(`/${lang}/s3-storage`)
          break
        case 'logout':
            signOut(`/${lang}/auth/signin`)
          break
        default:
          break
      }
    },
    [signIn, router]
  )
  const handleAuth = useCallback(
    (keys: Selection) => {
      console.log('LoginLogout handleLogin called with keys:', keys)
      if (keys === 'all') return
      const selectedKey = keys.values().next().value
      console.log('Selected key:', selectedKey)
      switch (selectedKey) {
        case 'settings':
          router.push(`/${lang}/settings`)
          break
        case 'logout':
          signOut(`/${lang}/auth/signin`  )
          break
        default:
          break
      }
    },
    [signIn, router]
  )
  const handleStaff = useCallback(
    (keys: Selection) => {
      console.log('LoginLogout handleLogin called with keys:', keys)
      if (keys === 'all') return
      const selectedKey = keys.values().next().value
      console.log('Selected key:', selectedKey)
      switch (selectedKey) {
        case 'plan':
          router.push(`/${lang}/dienstplan`)
          break
        case 'settings':
          router.push(`/${lang}/settings`)
          break
        case 'logout':
          signOut(`/${lang}/auth/signin`)
          break
        default:
          break
      }
    },
    [signIn, router]
  )
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
          <Dropdown.Menu
            selectionMode="single"
            selectedKeys={selected}
            onSelectionChange={handleAdmin}
          >
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
  if (status === 'authenticated' && session?.user?.status === 1) {
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
          <Dropdown.Menu
            selectionMode="single"
            selectedKeys={selected}
            onSelectionChange={handleStaff}
          >
            <Dropdown.Item id="plan" textValue="Terminplan">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Terminplan</Label>
                <Calendar1 className="size-3.5 " />
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="settings" textValue="Settings">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Settings</Label>
                <Settings className="size-3.5 " />
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
          <Dropdown.Menu
            selectionMode="single"
            selectedKeys={selected}
            onSelectionChange={handleAuth}
          >
            <Dropdown.Item id="settings" textValue="Settings">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Settings</Label>
                <Settings className="size-3.5 " />
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

  return (
    <>
      <Button variant="tertiary" onPress={() => setIsOpen(true)}>
        Anmelden
      </Button>
      <AuthModal
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        onSignIn={handleSignIn}
        onSignInWithCredentials={handleCredentialsSignIn}
        t={t}
        lang={lang}
      />{' '}
    </>
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
