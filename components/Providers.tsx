'use client'

import { HeroUIProvider } from '@heroui/system'
import { ThemeProvider as NextThemesProvider, ThemeProviderProps, useTheme } from 'next-themes'
import React, { createContext, useContext, useMemo } from 'react'
import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { SchedulingProvider } from '@/contexts/SchedulingContext'
import { PlatformProvider } from '@/contexts/PlatformContext'

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
  dictionary?: Record<string, any>
  lang?: string
  initialSidebarExpanded?: boolean
}

// Language context for SSR-detected language (for root route only)
const ServerLanguageContext = createContext<string | undefined>(undefined)

export const useServerLanguage = () => {
  return useContext(ServerLanguageContext)
}

export const DictionaryContext = createContext<Record<string, any> | undefined>(undefined)

export const useDictionary = () => {
  const ctx = useContext(DictionaryContext)
  return ctx
}

export const useTranslation = () => {
  const dict = useDictionary()

  const t = React.useMemo(
    () => (path: string, fallback = 'Localization failed') => {
      const parts = path.split('.')
      let cur: any = dict

      if (!dict) {
        console.warn(`[useTranslation] Dictionary is undefined for path: ${path}`)
        return fallback
      }

      for (const p of parts) {
        if (!cur) {
          console.warn(`[useTranslation] Path not found: ${path} (failed at: ${p})`)
          return fallback
        }
        cur = cur[p]
      }

      if (cur === undefined || cur === null) {
        console.warn(`[useTranslation] Value not found for path: ${path}`)
        return fallback
      }

      return cur
    },
    [dict]
  )

  return { t, dict }
}

function HeroUIThemeWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return <HeroUIProvider navigate={router.push}>{children}</HeroUIProvider>
}

export function Providers({ children, themeProps, dictionary, lang, initialSidebarExpanded }: ProvidersProps) {
  // Мемоизируем dictionary чтобы контекст не менялся при каждой навигации
  // ВАЖНО: используем только dictionary как зависимость, а не lang!
  // Словарь меняется только когда действительно приходит новый объект
  const memoizedDictionary = useMemo(() => dictionary, [dictionary])

  return (
    <SessionProvider>
      <AuthProvider>
        <NextThemesProvider {...themeProps}>
          <PlatformProvider>
            <SidebarProvider initialExpanded={initialSidebarExpanded}>
              <HeroUIThemeWrapper>
                <ServerLanguageContext.Provider value={lang}>
                  <DictionaryContext.Provider value={memoizedDictionary}>
                    <SchedulingProvider>
                      <div className="min-h-screen flex flex-col">{children}</div>
                    </SchedulingProvider>
                  </DictionaryContext.Provider>
                </ServerLanguageContext.Provider>
              </HeroUIThemeWrapper>
            </SidebarProvider>
          </PlatformProvider>
        </NextThemesProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
