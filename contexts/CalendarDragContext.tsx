'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode, useMemo } from 'react'

interface CalendarDragContextValue {
  dragEndSignal: number
}

const CalendarDragContext = createContext<CalendarDragContextValue | null>(null)

export function CalendarDragProvider({ children }: { children: ReactNode }) {
  const [dragEndSignal, setDragEndSignal] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const handleGlobalDragEnd = () => {
      if (mountedRef.current) {
        setDragEndSignal(prev => prev + 1)
      }
    }

    window.addEventListener('dragend', handleGlobalDragEnd)

    return () => {
      mountedRef.current = false
      window.removeEventListener('dragend', handleGlobalDragEnd)
    }
  }, [])

  const contextValue = useMemo(() => ({ dragEndSignal }), [dragEndSignal])

  return (
    <CalendarDragContext.Provider value={contextValue}>
      {children}
    </CalendarDragContext.Provider>
  )
}

export function useCalendarDrag() {
  const context = useContext(CalendarDragContext)
  if (!context) {
    throw new Error('useCalendarDrag must be used within CalendarDragProvider')
  }
  return context
}

// Hook for DayView to reset drag state on global dragend
export function useDragEndReset(resetCallback: () => void) {
  const { dragEndSignal } = useCalendarDrag()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    resetCallback()
  }, [dragEndSignal, resetCallback])
}
