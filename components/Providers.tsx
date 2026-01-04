'use client'

import { ParallaxProvider } from 'react-scroll-parallax'
import { HeroUIProvider } from '@heroui/system'
import { ThemeProvider as NextThemesProvider, ThemeProviderProps, useTheme } from 'next-themes'
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from './AuthProvider'
import { useRouter } from 'next/navigation'

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
  dictionary?: Record<string, any>
  lang?: string
}
export const DictionaryContext = createContext<Record<string, any> | undefined>(undefined)

export const useDictionary = () => {
  const ctx = useContext(DictionaryContext)
  return ctx
}

export const useTranslation = () => {
  const dict = useDictionary()

  const t = React.useCallback(
    (path: string, fallback = 'Localization failed') => {
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

export function Providers({ children, themeProps, dictionary, lang }: ProvidersProps) {
  // Мемоизируем dictionary чтобы контекст не менялся при каждой навигации
  // ВАЖНО: используем dictionary как зависимость, а не lang!
  // Если словарь обновляется, мы должны передать новое значение в контекст
  const memoizedDictionary = useMemo(() => dictionary, [dictionary, lang])

  return (
    <SessionProvider>
      <AuthProvider>
        <ParallaxProvider>
          <NextThemesProvider {...themeProps}>
            <HeroUIThemeWrapper>
              <DictionaryContext.Provider value={memoizedDictionary}>
                <div className="min-h-screen flex flex-col">{children}</div>
              </DictionaryContext.Provider>
            </HeroUIThemeWrapper>
          </NextThemesProvider>
        </ParallaxProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
