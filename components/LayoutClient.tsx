'use client'

import { memo, useState, useEffect } from 'react'
import Navbar from './Navbar'
import { LanguageSync } from './LanguageSync'
import Sidebar from './Sidebar'

interface LayoutClientProps {
  children: React.ReactNode
}

// Мемоизируем весь клиентский layout для предотвращения ре-рендеров
function LayoutClientComponent({ children }: LayoutClientProps) {
  // isOpen - состояние mobile drawer (открыт/закрыт)
  // ВАЖНО: На мобильном всегда начинаем с false (закрыт)
  // Не сохраняем в localStorage - drawer должен закрываться при каждой навигации
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  return (
    <>
      <LanguageSync />

      {/* Sidebar - всегда рендерим, но на мобильном он будет drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onExpandChange={setIsSidebarExpanded}
      />

      {/* Основной контент с Navbar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          sidebarExpanded={isSidebarExpanded}
        />
        {children}
      </div>
    </>
  )
}

export const LayoutClient = memo(LayoutClientComponent)
