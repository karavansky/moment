'use client'

import { useAuth } from './AuthProvider'
import { signOut as nextAuthSignOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useRef, useTransition, useState, useEffect, memo, useCallback } from 'react'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Button,
} from '@heroui/react'
import { AuthModal } from './AuthModal'
import { localizedLink } from '@/utils/localizedLink'
import { SupportedLocale } from '@/config/locales'

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/tickets', '/admin']

interface SupportButtonsProps {
  lang: SupportedLocale
  onAction?: () => void
  t: (path: string, fallback?: string) => string
}

function SupportButtonsComponent({ lang, onAction, t }: SupportButtonsProps) {
  const { session, status, signIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  function useDisclosure(): {
    isOpen: boolean
    onOpen: () => void
    onOpenChange: (open: boolean) => void
  } {
    const [isOpen, setIsOpen] = useState(false)

    const onOpen = useCallback(() => {
      setIsOpen(true)
    }, [])

    const onOpenChange = useCallback((open: boolean) => {
      setIsOpen(open)
    }, [])

    return { isOpen, onOpen, onOpenChange }
  }
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  // Инициализируем кеш как null для SSR/CSR согласованности
  const [cachedAuthState, setCachedAuthState] = useState<
    'authenticated' | 'unauthenticated' | null
  >(null)

  const [cachedSession, setCachedSession] = useState<typeof session | null>(null)

  // Читаем из localStorage только на клиенте после монтирования
  useEffect(() => {
    try {
      const cached = localStorage.getItem('auth_state')
      if (cached === 'authenticated' || cached === 'unauthenticated') {
        setCachedAuthState(cached)
      }
    } catch {
      // Ignore localStorage errors
    }

    try {
      const cached = localStorage.getItem('auth_session')
      if (cached) {
        setCachedSession(JSON.parse(cached))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Сохраняем предыдущее состояние для предотвращения мигания
  const prevStatusRef = useRef(status)
  const prevSessionRef = useRef(session)
  const prevPropsRef = useRef({ lang, onAction, t })

  // Проверяем, что изменилось с предыдущего рендера
  const langChanged = prevPropsRef.current.lang !== lang
  const callbackChanged = prevPropsRef.current.onAction !== onAction
  const tChanged = prevPropsRef.current.t !== t

  // console.log('[SupportButtons RENDER]', {
  //   status,
  //   hasSession: !!session,
  //   cachedAuthState,
  //   displayWillBe: status === 'loading' ? (cachedAuthState || 'unauthenticated') : status,
  //   WHY_RERENDER: {
  //     langChanged,
  //     callbackChanged,
  //     tChanged,
  //     statusChanged: prevStatusRef.current !== status,
  //     sessionChanged: prevSessionRef.current !== session
  //   }
  // })

  prevPropsRef.current = { lang, onAction, t }

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (status !== 'loading') {
      try {
        localStorage.setItem('auth_state', status)
        setCachedAuthState(status)
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [status])

  // Сохраняем session в localStorage
  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem('auth_session', JSON.stringify(session))
        setCachedSession(session)
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [session])

  // Обновляем refs после рендера
  if (status !== 'loading') {
    prevStatusRef.current = status
    prevSessionRef.current = session
  }

  // Определяем какое состояние показывать - ПРИОРИТЕТ КЕШУ!
  const displayStatus =
    status === 'loading' ? cachedAuthState || prevStatusRef.current || 'unauthenticated' : status
  const displaySession = session || cachedSession || prevSessionRef.current

  // Check if current route is protected
  const isProtectedRoute = () => {
    if (!pathname) return false
    return PROTECTED_ROUTES.some(route => pathname.includes(route))
  }

  const handleMenu = async (key: string) => {
    onAction?.()
    switch (key) {
      case 'my-tickets':
        startTransition(() => {
          router.push(`/${lang}/tickets`)
        })
        break
      case 'admin-panel':
        startTransition(() => {
          router.push(`/${lang}/admin/tickets`)
        })
        break
      case 'logout':
        // If on protected route, redirect to home. Otherwise stay on current page
        const callbackUrl = isProtectedRoute() ? `/${lang}` : pathname || `/${lang}`
        await nextAuthSignOut({ callbackUrl })
        break
      default:
    }
  }
  //            className={`min-w-unit-16 h-8 rounded-xl text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white data-[hover=true]:bg-earth-800/50 dark:data-[hover=true]:bg-gray-700/50 gap-1.5 flex flex-row items-center ${isPending ? 'opacity-70' : ''}`}

  if (displayStatus === 'authenticated' && displaySession?.user) {
    return (
      <Dropdown
        key="user-dropdown-authenticated"
        onOpenChange={() => {
          onAction?.()
        }}
      >
        <Button isIconOnly size="md" isDisabled={isPending} variant="ghost">
          <Avatar>
            <Avatar.Image
              src={displaySession?.user?.image || undefined}
              alt={displaySession?.user?.name || 'User Avatar'}
              className="rounded-full"
            />
            <Avatar.Fallback delayMs={600}>NA</Avatar.Fallback>
          </Avatar>
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="User menu" onAction={key => handleMenu(key as string)}>
            <Dropdown.Item key="my-tickets" id="my-tickets">My Tickets</Dropdown.Item>
            {displaySession?.user.isAdmin === true ? (
              <Dropdown.Item key="admin-panel" id="admin-panel">Admin Panel</Dropdown.Item>
            ) : null}
            <Dropdown.Item key="logout" id="logout">Logout</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    )
  }

  const handleSignIn = async (provider: 'google' | 'apple') => {
    // Pass tickets page as callback URL so user lands there after auth
    await signIn(provider, `/${lang}/tickets`)
  }

  return (
    <>
      <Button
        size="md"
        variant='tertiary'
        className="min-w-unit-20 h-10 rounded-xl  text-sand-200 hover:text- dark:text-white dark:hover:text-white data-[hover=true]:bg-yellow-800/50 dark:data-[hover=true]:bg-gray-700/50 gap-2 flex flex-row items-center px-3"
        onPress={() => {
          onAction?.()
          router.push(localizedLink('support', lang))
          //onOpen()
        }}
      >
        <span className=" shrink-0">{t('navbar.support')}</span>
      </Button>
      <AuthModal
        isOpen={isOpen}
        onOpenChange={() => onOpenChange(true)}
        onSignIn={handleSignIn}
        t={t}
        lang={lang}
      />
    </>
  )
}

// Мемоизируем компонент для предотвращения ненужных ре-рендеров
export const SupportButtons = memo(SupportButtonsComponent)
