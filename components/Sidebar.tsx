'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Button, Card, Separator } from '@heroui/react'
import {
  Home,
  Users,
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
  UserCog,
  Building2,
  ShieldCheck,
  Bell,
  HandHeart,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoMoment } from './icons'
import { useSidebar } from '@/contexts/SidebarContext'
import { SimpleTooltip } from './SimpleTooltip'

interface MenuItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
  badgeColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

interface MenuSection {
  title: string
  items: MenuItem[]
  activeColor?: string
}

// Вынесли данные за пределы компонента для предотвращения пересоздания
const menuItems: MenuItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Calendar1, label: 'Dienstplan', href: '/dienstplan' },
  { icon: Map, label: 'Karte', href: '/map' },
]

const crmSubItems: MenuItem[] = [
  { icon: UserStar, label: 'Kunden', href: '/clients' },
  { icon: Users, label: 'Fachkräfte', href: '/staff' },
  { icon: Van, label: 'Fahrzeug', href: '/transport' },
  { icon: HandHeart, label: 'Dienstleistungen', href: '/services' },
]

const reportsItems: MenuItem[] = [
  { icon: ClipboardPlus, label: 'Kunden', href: '/reports/clients' },
  { icon: ClipboardMinus, label: 'Fachkräfte', href: '/reports/staff' },
  { icon: BookOpen, label: 'Fahrtenbuch', href: '/reports/transport' },
]

const settingsItems: MenuItem[] = [
  { icon: UserCog, label: 'Personal', href: '/settings/personal' },
  { icon: Building2, label: 'Organisation', href: '/settings/organisation' },
  { icon: ShieldCheck, label: 'Users', href: '/settings/users' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
]

const menuSections: MenuSection[] = [
  { title: 'CRM', items: crmSubItems, activeColor: 'bg-success/10 text-success' },
  { title: 'Bericht', items: reportsItems, activeColor: 'bg-primary/10 text-primary' },
  { title: 'Settings', items: settingsItems, activeColor: 'bg-primary/10 text-primary' },
]

// Мемоизированный компонент для элементов меню
const MenuItemComponent = memo(({
  item,
  isActive,
  onClick,
  activeClassName = 'bg-primary/10 text-primary',
  isExpanded = true,
  lang
}: {
  item: MenuItem
  isActive: boolean
  onClick: () => void
  activeClassName?: string
  isExpanded?: boolean
  lang: string
}) => {
  const Icon = item.icon
  // Добавляем языковой префикс к href
  const localizedHref = item.href === '/' ? `/${lang}` : `/${lang}${item.href}`

  return (
    <SimpleTooltip
      content={item.label}
      placement="right"
      isDisabled={isExpanded}
      delay={100}
      wrapperClassName="w-full"
    >
      <Link
        href={localizedHref}
        onClick={onClick}
        className={`flex items-center w-full px-4 py-2 rounded-lg transition-colors no-underline ${
          isActive ? activeClassName : 'text-default-700 hover:bg-default-100'
        }`}
      >
        <Icon className="w-5 h-5 mr-3" />
        <span className="sidebar-label">{item.label}</span>
      </Link>
    </SimpleTooltip>
  )
})

MenuItemComponent.displayName = 'MenuItemComponent'

// Мемоизированный компонент для секций меню
const MenuSectionComponent = memo(({
  section,
  isActive,
  onLinkClick,
  isExpanded = true,
  lang
}: {
  section: MenuSection
  isActive: (href: string) => boolean
  onLinkClick: () => void
  isExpanded?: boolean
  lang: string
}) => {
  return (
    <div className="mt-6">
      <div className="section-header px-3 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider">
        {section.title}
      </div>
      <Separator className="section-separator mb-6" />
      {section.items.map(item => (
        <MenuItemComponent
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          onClick={onLinkClick}
          activeClassName={section.activeColor}
          isExpanded={isExpanded}
          lang={lang}
        />
      ))}
    </div>
  )
})

MenuSectionComponent.displayName = 'MenuSectionComponent'

// Мемоизированный компонент для footer
const SidebarFooter = memo(() => {
  return (
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
  )
})

SidebarFooter.displayName = 'SidebarFooter'

// Мемоизированный компонент для toggle button
const ToggleButton = memo(({ onToggle }: { onToggle: () => void }) => {
  return (
    <div className="flex justify-end pr-2.5 pt-3" suppressHydrationWarning>
      <Button
        isIconOnly
        variant="tertiary"
        size="sm"
        onPress={onToggle}
        className="w-10 h-10 rounded-full shadow-xl relative"
      >
        {/* Рендерим обе иконки, управляем видимостью через CSS */}
        <ArrowLeftToLine className="absolute inset-0 m-auto toggle-icon-collapse" />
        <ArrowRightToLine className="absolute inset-0 m-auto toggle-icon-expand" />
      </Button>
    </div>
  )
})

ToggleButton.displayName = 'ToggleButton'

export default function Sidebar() {
  const pathname = usePathname()

  // Извлекаем язык из pathname (первый сегмент после /)
  const lang = pathname.split('/')[1] || 'en'

  // Получаем состояние из контекста
  const { isOpen, isExpanded, toggleOpen, toggleExpanded } = useSidebar()

  // Для SSR всегда начинаем с false (desktop режим)
  const [isMobile, setIsMobile] = useState(false)

  // Определяем мобильный режим с debounce для оптимизации
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()

    // Debounced resize handler для уменьшения количества вызовов
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Мемоизированная функция проверки активного пути
  const isActive = useCallback((href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }, [pathname])

  // Мемоизированный обработчик клика для мобильных устройств
  const handleLinkClick = useCallback(() => {
    if (isMobile && isOpen) {
      toggleOpen()
    }
  }, [isMobile, isOpen, toggleOpen])

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
        {!isMobile && <ToggleButton onToggle={toggleExpanded} />}
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4" suppressHydrationWarning>
          <div className="px-2 space-y-1">
            {/* Main Menu Items */}
            {menuItems.map(item => (
              <MenuItemComponent
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                onClick={handleLinkClick}
                isExpanded={isExpanded}
                lang={lang}
              />
            ))}

            {/* Dynamic Sections (CRM, Reports, Settings) */}
            {menuSections.map(section => (
              <MenuSectionComponent
                key={section.title}
                section={section}
                isActive={isActive}
                onLinkClick={handleLinkClick}
                isExpanded={isExpanded}
                lang={lang}
              />
            ))}
          </div>
        </nav>

        {/* Footer - User/Settings */}
        <SidebarFooter />
      </aside>
    </>
  )
}
