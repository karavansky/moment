'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallContextType {
  isInstallable: boolean
  isDismissed: boolean
  installPWA: () => Promise<void>
  dismissPrompt: () => void
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined)

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user already dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      console.log('👍 [PWAInstallContext] beforeinstallprompt event fired')

      // Stash the event so it can be triggered later.
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      console.log('🚀 [PWAInstallContext] App was successfully installed')
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('No deferred prompt available')
      return
    }

    // Show the native install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWAInstallContext] User choice outcome: ${outcome}`)

    // We've used the prompt, and can't use it again, clear it up
    setDeferredPrompt(null)
    setIsInstallable(false)
  }, [deferredPrompt])

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }, [])

  return (
    <PWAInstallContext.Provider value={{ isInstallable, isDismissed, installPWA, dismissPrompt }}>
      {children}
    </PWAInstallContext.Provider>
  )
}

export function usePWAInstall() {
  const context = useContext(PWAInstallContext)
  if (context === undefined) {
    throw new Error('usePWAInstall must be used within a PWAInstallProvider')
  }
  return context
}
