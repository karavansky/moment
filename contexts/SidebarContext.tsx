'use client'

import { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react'
import { setSidebarState } from '@/lib/sidebar-actions'

interface SidebarContextType {
  // Mobile drawer state (открыт/закрыт на мобильном)
  isOpen: boolean
  setIsOpen: (value: boolean) => void
  toggleOpen: () => void

  // Desktop expansion state (развернут/свернут на desktop)
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
  toggleExpanded: () => void

  // Флаг готовности (для избежания hydration mismatch)
  isHydrated: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({
  children,
  initialExpanded
}: {
  children: ReactNode
  initialExpanded?: boolean
}) {
  // Mobile drawer state - всегда начинаем с закрытого
  const [isOpen, setIsOpen] = useState(false)

  // Desktop expansion state - используем SSR значение из cookie
  const [isExpanded, setIsExpanded] = useState(() => {
    // SSR: возвращаем значение из cookie (по умолчанию true)
    if (typeof window === 'undefined') {
      return initialExpanded ?? true
    }

    // Клиент: читаем из localStorage (приоритет), затем используем SSR cookie
    const saved = localStorage.getItem('sidebar-expanded')
    const value = saved !== null ? saved === 'true' : (initialExpanded ?? true)

    console.log('🎯 Initial isExpanded from localStorage:', saved, '| SSR cookie:', initialExpanded, '| final:', value)
    return value
  })

  // Флаг гидратации - используем useLayoutEffect для синхронной установки
  const [isHydrated, setIsHydrated] = useState(false)

  useLayoutEffect(() => {
    console.log('🚀 SidebarProvider MOUNTED, isExpanded:', isExpanded)
    console.log('📊 HTML classes before:', document.documentElement.className)

    // После гидратации React берет управление на себя
    setIsHydrated(true)

    // Синхронно применяем CSS класс сразу после гидратации
    // Это предотвращает мерцание, так как класс уже установлен inline script'ом
    if (isExpanded) {
      console.log('➡️ Removing sidebar-collapsed class')
      document.documentElement.classList.remove('sidebar-collapsed')
    } else {
      console.log('➡️ Adding sidebar-collapsed class')
      document.documentElement.classList.add('sidebar-collapsed')
    }

    console.log('📊 HTML classes after:', document.documentElement.className)

    // Включаем transitions ПОСЛЕ установки начального состояния
    // requestAnimationFrame гарантирует, что transition не сработает при первом рендере
    const rafId = requestAnimationFrame(() => {
      console.log('🎨 Adding sidebar-hydrated class for transitions')
      document.documentElement.classList.add('sidebar-hydrated')
    })

    // Cleanup при размонтировании (важно для Strict Mode)
    return () => {
      console.log('🧹 SidebarProvider UNMOUNTING')
      cancelAnimationFrame(rafId)
      // НЕ удаляем классы при размонтировании, чтобы избежать flash
    }
  }, [])

  // Сохраняем состояние развернутости в localStorage и cookie при изменении
  // Используем useLayoutEffect для синхронного обновления CSS
  useLayoutEffect(() => {
    if (isHydrated) {
      // Синхронная запись в localStorage
      localStorage.setItem('sidebar-expanded', String(isExpanded))

      // Асинхронная запись в cookie (для SSR)
      setSidebarState(isExpanded).catch(err => {
        console.error('Failed to sync sidebar state to cookie:', err)
      })

      // Управляем CSS классом для sidebar синхронно
      if (isExpanded) {
        document.documentElement.classList.remove('sidebar-collapsed')
      } else {
        document.documentElement.classList.add('sidebar-collapsed')
      }
    }
  }, [isExpanded, isHydrated])

  const toggleOpen = () => setIsOpen(prev => !prev)
  const toggleExpanded = () => {
    console.log('🔀 toggleExpanded called, current:', isExpanded)
    setIsExpanded(prev => !prev)
  }

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleOpen,
        isExpanded,
        setIsExpanded,
        toggleExpanded,
        isHydrated,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

// Custom hook для использования контекста
export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
