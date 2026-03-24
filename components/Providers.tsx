'use client'

// HeroUI v3 doesn't require a provider for most components
import { ThemeProvider as NextThemesProvider, ThemeProviderProps, useTheme } from 'next-themes'
import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react'
import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from './AuthProvider'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { SchedulingProvider } from '@/contexts/SchedulingContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { PlatformProvider } from '@/contexts/PlatformContext'
import {
  Toast,
  toastQueue,
  ToastContent,
  ToastDescription,
  ToastQueue,
  ToastTitle,
} from '@heroui/react'
import type { ToastContentValue } from '@heroui/react'
import { NotificationObserver } from './NotificationObserver'
import DeviceSyncObserver from './DeviceSyncObserver'
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { PWAInstallProvider } from '@/contexts/PWAInstallContext'

const variantIcons: Record<string, React.ReactNode> = {
  default: <Info className="w-6 h-6" strokeWidth={2} color="#338ef7" />,
  accent: <Info className="w-6 h-6" strokeWidth={2} color="#338ef7" />,
  success: <CheckCircle className="w-6 h-6" strokeWidth={1.5} color="#28a745" />,
  warning: <AlertTriangle className="w-6 h-6" strokeWidth={1.5} color="#ffc107" />,
  danger: <XCircle className="w-6 h-6" strokeWidth={1.5} color="#dc3545" />,
}
import { DemoNotificationWorker } from './DemoNotificationWorker'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { GeolocationTracker } from './GeolocationTracker'
import { useAppVersion } from '@/hooks/useAppVersion'
import { DemoProvider } from '@/contexts/DemoContext'

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
    () =>
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
  // HeroUI v3 doesn't require a provider wrapper
  return <>{children}</>
}

// Separate component so useAppVersion runs inside all necessary context providers (like ToastProvider)
function AppVersionCheck() {
  useAppVersion()
  return null
}

export function Providers({
  children,
  themeProps,
  dictionary,
  lang,
  initialSidebarExpanded,
}: ProvidersProps) {
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 8))

  // Логируем монтирование/размонтирование
  useEffect(() => {
    console.log(`🟢 Providers MOUNTED [${mountIdRef.current}], lang=${lang}`)
    return () => {
      console.log(`🔴 Providers UNMOUNTED [${mountIdRef.current}]`)
    }
  }, [])

  // Логируем изменение props
  useEffect(() => {
    console.log(`📦 Providers props changed [${mountIdRef.current}]: lang=${lang}`)
  }, [lang, dictionary, initialSidebarExpanded])

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
                <Toast.Provider queue={toastQueue} placement="top">
                  {({ toast: toastItem }) => {
                    const content = toastItem.content as ToastContentValue
                    return (
                      <Toast
                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                        toast={toastItem}
                        variant={content.variant}
                      >
                        <Toast.Content>
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            <div className="shrink-0 mt-0.5 sm:mt-0">
                              {variantIcons[content.variant || 'accent']}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {content.title ? (
                                  <Toast.Title className="font-medium text-gray-900 dark:text-white text-sm">
                                    {content.title}
                                  </Toast.Title>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {content.description ? (
                            <Toast.Description className="text-gray-500 pt-2 dark:text-gray-400 text-sm">
                              {content.description}
                            </Toast.Description>
                          ) : null}{' '}
                        </Toast.Content>
                        {content.actionProps ? (
                          <Toast.ActionButton
                            {...{ ...content.actionProps, size: 'sm' }}
                            className="self-center"
                          />
                        ) : null}
                        <Toast.CloseButton className="absolute top-1 right-1 border-none p-1 bg-transparent opacity-100 [&>svg]:size-4" />
                      </Toast>
                    )
                  }}
                </Toast.Provider>
                <ServerLanguageContext.Provider value={lang}>
                  <DictionaryContext.Provider value={memoizedDictionary}>
                    <NotificationProvider>
                      <SchedulingProvider>
                        <DemoProvider>
                          <ServiceWorkerRegistrar />
                          <GeolocationTracker />
                          <NotificationObserver />
                          <DeviceSyncObserver />
                          <DemoNotificationWorker />
                          <AppVersionCheck />
                          <PWAInstallProvider>
                            <PWAInstallPrompt />
                            <div className="min-h-screen flex flex-col">{children}</div>
                          </PWAInstallProvider>
                        </DemoProvider>
                      </SchedulingProvider>
                    </NotificationProvider>
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
