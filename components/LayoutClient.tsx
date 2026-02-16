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
  const { isRestricted } = useRoleGuard()

  return (
    <>
      <LanguageSync />

      {/* Sidebar — только для директора/менеджера/неавторизованных */}
      {!isRestricted && <Sidebar />}

      {/* Основной контент с Navbar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuToggle={isRestricted ? undefined : toggleOpen}
          sidebarExpanded={isRestricted ? false : isExpanded}
          isHydrated={isHydrated}
        />
        {children}
      </div>
    </>
  )
}
