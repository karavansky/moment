'use client'

import Navbar from './Navbar'
import { LanguageSync } from './LanguageSync'
import Sidebar from './Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/components/AuthProvider'

interface LayoutClientProps {
  children: React.ReactNode
}

export function LayoutClient({ children }: LayoutClientProps) {
  const { toggleOpen, isExpanded, isHydrated } = useSidebar()
  const { session, status: authStatus } = useAuth()

  // Sidebar скрыт для worker (1) и client (2), а также пока auth загружается
  const userStatus = session?.user?.status
  const isRestricted = authStatus === 'authenticated' && (userStatus === 1 || userStatus === 2)
  const showSidebar = !isRestricted && authStatus !== 'loading'

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
