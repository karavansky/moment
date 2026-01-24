'use client'

import { createContext, useContext, useState, useLayoutEffect, useMemo, useCallback, ReactNode } from 'react'
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
    return saved !== null ? saved === 'true' : (initialExpanded ?? true)
  })

  // Флаг гидратации - используем useLayoutEffect для синхронной установки
  const [isHydrated, setIsHydrated] = useState(false)

  useLayoutEffect(() => {
    // После гидратации React берет управление на себя
    setIsHydrated(true)

    // Синхронно применяем CSS класс сразу после гидратации
    // Это предотвращает мерцание, так как класс уже установлен inline script'ом
    if (isExpanded) {
      document.documentElement.classList.remove('sidebar-collapsed')
    } else {
      document.documentElement.classList.add('sidebar-collapsed')
    }

    // Включаем transitions ПОСЛЕ установки начального состояния
    // requestAnimationFrame гарантирует, что transition не сработает при первом рендере
    const rafId = requestAnimationFrame(() => {
      document.documentElement.classList.add('sidebar-hydrated')
    })

    // Cleanup при размонтировании (важно для Strict Mode)
    return () => {
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
      setSidebarState(isExpanded)

      // Управляем CSS классом для sidebar синхронно
      if (isExpanded) {
        document.documentElement.classList.remove('sidebar-collapsed')
      } else {
        document.documentElement.classList.add('sidebar-collapsed')
      }
    }
  }, [isExpanded, isHydrated])

  // Мемоизируем callbacks чтобы они не пересоздавались при каждом рендере
  const toggleOpen = useCallback(() => setIsOpen(prev => !prev), [])
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // Мемоизируем context value для предотвращения лишних ре-рендеров
  // toggleOpen и toggleExpanded стабильные через useCallback, но все равно включаем для корректности
  const contextValue = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggleOpen,
      isExpanded,
      setIsExpanded,
      toggleExpanded,
      isHydrated,
    }),
    [isOpen, isExpanded, isHydrated, toggleOpen, toggleExpanded]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
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
