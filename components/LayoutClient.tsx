'use client'

import { memo } from 'react'
import Navbar from './Navbar'
import { LanguageSync } from './LanguageSync'
import Sidebar from './Sidebar'
import { SchedulingProvider } from '@/contexts/SchedulingContext'
import { useSidebar } from '@/contexts/SidebarContext'

interface LayoutClientProps {
  children: React.ReactNode
}

// Мемоизируем весь клиентский layout для предотвращения ре-рендеров
function LayoutClientComponent({ children }: LayoutClientProps) {
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
        <SchedulingProvider>
          {children}
        </SchedulingProvider>
      </div>
    </>
  )
}

export const LayoutClient = memo(LayoutClientComponent)
