'use client'

import Navbar from './Navbar'
import { LanguageSync } from './LanguageSync'
import Sidebar from './Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'
import { useRoleGuard } from '@/hooks/useRoleGuard'

interface LayoutClientProps {
  children: React.ReactNode
}

export function LayoutClient({ children }: LayoutClientProps) {
  const { toggleOpen, isExpanded, isHydrated } = useSidebar()
  const { isRestricted, isLoading } = useRoleGuard()
  const showSidebar = !isRestricted && !isLoading

  return (
    <>
      <LanguageSync />

      {/* Sidebar — только для директора/менеджера (скрыт пока auth загружается) */}
      {showSidebar && <Sidebar />}

      {/* Основной контент с Navbar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuToggle={showSidebar ? toggleOpen : undefined}
          sidebarExpanded={showSidebar ? isExpanded : false}
          isHydrated={isHydrated}
        />
        {children}
      </div>
    </>
  )
}
