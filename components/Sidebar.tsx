'use client'

import { useState, useEffect } from 'react'
import { Button, Card, Separator } from '@heroui/react'
import {
  Home,
  Users,
  List,
  LayoutGrid,
  Building2,
  Briefcase,
  CheckSquare,
  Package,
  Send,
  Zap,
  ArrowRightLeft,
  MessageCircle,
  ShoppingCart,
  Crown,
  Van,
  X,
  Map,
  Calendar1,
  UserStar,
  ClipboardMinus,
  ClipboardPlus,
  BookOpen,
  ArrowLeftToLine,
  ArrowRightToLine,
} from 'lucide-react'
import { Link } from '@heroui/react'
import { usePathname } from 'next/navigation'
import { LogoMoment } from './icons'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'

interface MenuItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
  badgeColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Calendar1, label: 'Dienstplan', href: '/dienstplan' },
  { icon: Map, label: 'Karte', href: '/map' },
]

const crmSubItems: MenuItem[] = [
  { icon: UserStar, label: 'Kunden', href: '/clients' },
  { icon: Users, label: 'Fachkräfte', href: '/staff' },
  { icon: Van, label: 'Fahrzeug', href: '/transport' },
]

const otherItems: MenuItem[] = [
  { icon: ClipboardPlus, label: 'Kunden', href: '/clients' },
  { icon: ClipboardMinus, label: 'Fachkräfte', href: '/staff' },
  { icon: BookOpen, label: 'Fahrtenbuch', href: '/transport' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // Получаем состояние из контекста
  const { isOpen, toggleOpen, toggleExpanded } = useSidebar()

  // Для SSR всегда начинаем с false (desktop режим)
  const [isMobile, setIsMobile] = useState(false)

  // Определяем мобильный режим
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // На мобильном закрываем при клике на ссылку
  const handleLinkClick = () => {
    if (isMobile && isOpen) {
      toggleOpen()
    }
  }

  return (
    <>
      {/* Overlay для mobile drawer */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleOpen}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        suppressHydrationWarning
        className={`
          sidebar-main
          fixed md:static inset-y-0 left-0 z-50 md:z-auto
          h-screen bg-background border-r border-divider rounded-r-4xl flex flex-col
          dark:bg-gray-900
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo/Brand + Close button on mobile */}
        <div className="flex items-center justify-between px-2 pt-4 border-b border-divider shrink-0">
          <div className="flex items-center gap-2">
            {/* Всегда одинаковая структура DOM для избежания скачков позиционирования */}
            <div className="sidebar-logo-container">
              <LogoMoment size={48} />
            </div>
            <h1 className="sidebar-title text-xl font-bold text-primary">Moment</h1>
          </div>

          {/* Close button только на mobile */}
          {isMobile && isOpen && (
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={toggleOpen}
              className="md:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        {/* Toggle Button - только на desktop */}
        {!isMobile && (
          <div className="flex justify-end pr-2.5 pt-3" suppressHydrationWarning>
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={toggleExpanded}
              className="w-10 h-10 rounded-full shadow-xl relative"
            >
              {/* Рендерим обе иконки, управляем видимостью через CSS */}
              <ArrowLeftToLine className="absolute inset-0 m-auto toggle-icon-collapse" />
              <ArrowRightToLine className="absolute inset-0 m-auto toggle-icon-expand" />
            </Button>
          </div>
        )}
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4" suppressHydrationWarning>
          <div className="px-2 space-y-1 ">
            {/* Main Menu Items */}
            {menuItems.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link key={item.href} href={item.href} className={`w-full no-underline`}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      active ? 'bg-primary/10 text-primary' : 'text-default-700'
                    }`}
                    onPress={handleLinkClick}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="sidebar-label">{item.label}</span>
                  </Button>
                </Link>
              )
            })}

            {/* CRM Section */}
            <div className="mt-6">
              {/* Всегда рендерим оба элемента, управляем видимостью через CSS */}
              <div className="section-header px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider">
                CRM
              </div>
              <Separator className="section-separator mb-6" />
                {crmSubItems.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link key={item.href} href={item.href} className={`w-full no-underline`}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          active ? 'bg-success/10 text-success' : 'text-default-600'
                        }`}
                        onPress={handleLinkClick}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="sidebar-label">{item.label}</span>
                      </Button>
                    </Link>
                  )
                })}
            </div>

            {/* Other Items */}
            <div className="mt-6">
              {/* Всегда рендерим оба элемента, управляем видимостью через CSS */}
              <div className="section-header px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider">
                Bericht
              </div>
              <Separator className="section-separator mb-6" />

                {otherItems.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link key={item.href} href={item.href} className={`w-full no-underline`}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          active ? 'bg-primary/10 text-primary' : 'text-default-600'
                        }`}
                        onPress={handleLinkClick}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="sidebar-label">{item.label}</span>
                      </Button>
                    </Link>
                  )
                })}
            </div>
          </div>
        </nav>

        {/* Footer - User/Settings */}
        <div
          className="sidebar-footer p-4 border-t border-divider shrink-0"
          suppressHydrationWarning
        >
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                QB
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">Moment LBS</div>
                <div className="text-xs text-default-500 truncate">moment-lbs.app</div>
              </div>
            </div>
          </Card>
        </div>
      </aside>
    </>
  )
}
/*
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-divider flex items-center justify-center hover:bg-default-100 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          */
