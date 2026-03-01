'use client'

import { Card, Button } from '@heroui/react'
import { Download, X } from 'lucide-react'
import { usePWAInstall } from '@/contexts/PWAInstallContext'
import { LogoMoment } from './icons'
export function PWAInstallPrompt() {
  const { isInstallable, isDismissed, installPWA, dismissPrompt } = usePWAInstall()

  // Only show the banner if installable and not manually dismissed
  if (!isInstallable || isDismissed) return null

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 md:bottom-8 md:px-8 flex justify-center pointer-events-none animate-in slide-in-from-bottom-5 fade-in duration-500">
      <Card className="w-full max-w-sm sm:max-w-md pointer-events-auto shadow-2xl border border-divider overflow-visible bg-background/90 backdrop-blur-xl">
        <div className="p-4 flex flex-col gap-4">
          <Button
            isIconOnly
            aria-label="Сlose install prompt"
            variant="ghost"
            size="sm"
            onPress={dismissPrompt}
            className="absolute -top-2 -right-2 bg-default-100 dark:bg-default-50 shadow-sm z-10 rounded-full"
          >
            <X className="w-4 h-4 text-default-500" />
          </Button>

          <div className="flex items-start gap-3">
            <div className="shrink-0 pt-0.5">
              <LogoMoment size={42} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold leading-tight text-foreground">
                Install Moment LBS
              </h3>
              <p className="text-xs text-default-500 mt-1 line-clamp-2 leading-relaxed">
                Add Moment to your home screen or dock for faster access, offline capabilities, and
                a native app experience.
              </p>
            </div>
          </div>

          <Button
            onPress={installPWA}
            className="w-full font-medium shadow-sm bg-primary text-primary-foreground flex gap-2"
          >
            <Download className="w-4 h-4" />
            Install App
          </Button>
        </div>
      </Card>
    </div>
  )
}
