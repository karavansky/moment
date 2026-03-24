'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface DemoContextType {
  isDemoActive: boolean
  startDemo: () => void
  stopDemo: () => void
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoActive, setIsDemoActive] = useState(false)

  const startDemo = useCallback(() => {
    console.log('🎬 [DemoContext] Starting demo mode')
    setIsDemoActive(true)
  }, [])

  const stopDemo = useCallback(() => {
    console.log('🛑 [DemoContext] Stopping demo mode')
    setIsDemoActive(false)
  }, [])

  return (
    <DemoContext.Provider value={{ isDemoActive, startDemo, stopDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider')
  }
  return context
}
