'use client'

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'

interface PlatformContextType {
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  isReady: boolean
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined)

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<PlatformContextType>({
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isReady: false,
  })

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()

    // Определение iOS
    // iPadOS 13+ часто маскируется под Macintosh, но имеет touch points
    const isIpad = /macintosh/.test(userAgent) && 'ontouchend' in document
    const isIphone = /iphone|ipod/.test(userAgent) || isIpad

    // Определение Android
    const isAndroidDevice = /android/.test(userAgent)

    setPlatform({
      isIOS: isIphone,
      isAndroid: isAndroidDevice,
      isMobile: isIphone || isAndroidDevice,
      isReady: true,
    })
  }, [])

  // Мемоизируем context value для предотвращения лишних ре-рендеров
  const contextValue = useMemo(() => platform, [platform])

  return (
    <PlatformContext.Provider value={contextValue}>
      {children}
    </PlatformContext.Provider>
  )
}

// Custom hook для использования контекста
export function usePlatformContext() {
  const context = useContext(PlatformContext)
  if (context === undefined) {
    throw new Error('usePlatformContext must be used within a PlatformProvider')
  }
  return context
}
