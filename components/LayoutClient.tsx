'use client'

import Navbar from './Navbar'
import { LanguageSync } from './LanguageSync'
import Sidebar from './Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'

interface LayoutClientProps {
  children: React.ReactNode
}

export function LayoutClient({ children }: LayoutClientProps) {
  const { toggleOpen, isExpanded, isHydrated } = useSidebar()

  return (
    <>
      <LanguageSync />

      {/* Sidebar - получает состояние из контекста */}
      <Sidebar />

      {/* Основной контент с Navbar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuToggle={toggleOpen}
          sidebarExpanded={isExpanded}
          isHydrated={isHydrated}
        />
        {children}
      </div>
    </>
  )
}
