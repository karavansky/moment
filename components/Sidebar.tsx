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
import {Link} from '@heroui/react'
import { usePathname } from 'next/navigation'
import { LogoMoment } from './icons'
import { SimpleTooltip } from './SimpleTooltip'
import {useRouter} from 'next/navigation'

interface MenuItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
  badgeColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onExpandChange?: (isExpanded: boolean) => void
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Calendar1, label: 'Dienstplan', href: '/dienstplan' },
  { icon: Map, label: 'Karte', href: '/map' },
]

const crmSubItems: MenuItem[] = [
  { icon: UserStar, label: 'Kunden', href: '/contacts' },
  { icon: Users, label: 'Fachkräfte', href: '/personal' },
  { icon: Van, label: 'Fahrzeug', href: '/transport' },
]

const otherItems: MenuItem[] = [
  { icon: ClipboardPlus, label: 'Kunden', href: '/contacts' },
  { icon: ClipboardMinus, label: 'Fachkräfte', href: '/personal' },
  { icon: BookOpen, label: 'Fahrtenbuch', href: '/transport' },
]

export default function Sidebar({ isOpen, onToggle, onExpandChange }: SidebarProps) {
  const pathname = usePathname()
  // Для SSR всегда начинаем с false (desktop режим)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  // isExpanded - только для desktop (ширина sidebar)
  // Начинаем с true для SSR, обновим на клиенте
  const [isExpanded, setIsExpanded] = useState(true)

  // Уведомляем родителя об изменении состояния развернутости (только desktop)
  useEffect(() => {
    if (onExpandChange && !isMobile) {
      onExpandChange(isExpanded)
    }
  }, [isExpanded, isMobile, onExpandChange])

  // Сохраняем состояние в localStorage (только desktop)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      localStorage.setItem('sidebar-expanded', String(isExpanded))
    }
  }, [isExpanded, isMobile])

  // Инициализируем isExpanded из localStorage один раз при монтировании
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded')
    if (saved !== null) {
      setIsExpanded(saved === 'true')
    }
  }, [])

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

  const isCRMActive = crmSubItems.some(item => isActive(item.href))

  // На мобильном закрываем при клике на ссылку
  const handleLinkClick = () => {
    if (isMobile && isOpen) {
      onToggle()
    }
  }

  return (
    <>
      {/* Overlay для mobile drawer */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 md:z-auto
          h-screen bg-background border-r border-divider rounded-r-4xl flex flex-col
          transition-all duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isExpanded ? 'w-56' : 'w-16'}
        `}
      >
        {/* Logo/Brand + Close button on mobile */}
        <div className="flex items-center justify-between px-4 pt-4 border-b border-divider shrink-0">
          <div className="flex items-center gap-2">
            <LogoMoment size={isExpanded ? 48 : 36} />
            {isExpanded && <h1 className="text-xl font-bold text-primary">Moment</h1>}
          </div>

          {/* Close button только на mobile */}
          {isMobile && isOpen && (
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={onToggle}
              className="md:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        {/* Toggle Button - только на desktop */}
        {!isMobile && (
          <div className="flex justify-end pr-2.5 pt-3">
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={() => setIsExpanded(!isExpanded)}
              className="w-10 h-10 rounded-full shadow-xl"
            >
              {isExpanded ? <ArrowLeftToLine /> : <ArrowRightToLine />}
            </Button>
          </div>
        )}
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-2 space-y-1">
            {/* Main Menu Items */}
            {menuItems.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link key={item.href} href={item.href} underline="none">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      active ? 'bg-primary/10 text-primary' : 'text-default-700'
                    }`}
                    onPress={handleLinkClick}
                  >
                    {isExpanded ? (
                      <>
                        <Icon className="w-5 h-5 mr-3" />
                        <span>{item.label}</span>
                      </>
                    ) : (
                      <SimpleTooltip content={item.label}>
                        <Icon className="w-5 h-5 mr-3" />
                      </SimpleTooltip>
                    )}
                  </Button>
                </Link>
              )
            })}

            {/* CRM Section */}
            <div className="mt-6">
              {isExpanded ? (
                <div className="px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider">
                  CRM
                </div>
              ) : (
                <Separator className="mb-6" />
              )}
              <div className="space-y-1">
                {crmSubItems.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link key={item.href} href={item.href} underline="none">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start ${
                          active ? 'bg-success/10 text-success' : 'text-default-600'
                        }`}
                        onPress={handleLinkClick}
                      >
                        {isExpanded ? (
                          <>
                            <Icon className="w-5 h-5 mr-3" />
                            <span>{item.label}</span>
                          </>
                        ) : (
                          <SimpleTooltip content={"CRM -> " + item.label}>
                            <Icon className="w-5 h-5 mr-3" />
                          </SimpleTooltip>
                        )}
                        {/*item.badge && <span className="text-xs">{item.badge}</span>*/}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>



            {/* Other Items */}
              <div className="mt-6">
                              {isExpanded ? (
                <div className="px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider">
                  Bericht
                </div>
              ) : (
                <Separator className="mb-6" />
              )}

                <div className="space-y-1">
                  {otherItems.map(item => {
                    const Icon = item.icon
                    const active = isActive(item.href)

                    return (
                      <Link key={item.href} href={item.href} underline="none">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start ${
                            active ? 'bg-primary/10 text-primary' : 'text-default-600'
                          }`}
                          onPress={handleLinkClick}
                        >
                         {isExpanded ? (
                          <>
                            <Icon className="w-5 h-5 mr-3" />
                            <span>{item.label}</span>
                          </>
                        ) : (
                          <SimpleTooltip content={"Bericht -> " + item.label}>
                            <Icon className="w-5 h-5 mr-3" />
                          </SimpleTooltip>
                        )}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>
          </div>
        </nav>

        {/* Footer - User/Settings */}
        {isExpanded && (
          <div className="p-4 border-t border-divider shrink-0">
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  QB
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">Quail Breeder</div>
                  <div className="text-xs text-default-500 truncate">quailbreeder.net</div>
                </div>
              </div>
            </Card>
          </div>
        )}
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
