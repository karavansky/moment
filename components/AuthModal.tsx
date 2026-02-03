'use client'

import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import Image from 'next/image'
import { useMemo } from 'react'

interface AuthModalProps {
  isOpen: boolean
  onOpenChange: () => void
  onSignIn: (provider: 'google' | 'apple') => Promise<void>
  t: (path: string, fallback?: string) => string
  lang?: string
}

export function AuthModal({ isOpen, onOpenChange, onSignIn, t }: AuthModalProps) {
  const state = useMemo(
    () => ({
      isOpen,
      setOpen: (open: boolean) => {
        if (!open) onOpenChange()
      },
      open: () => {},
      close: onOpenChange,
      toggle: onOpenChange,
    }),
    [isOpen, onOpenChange]
  )

  return (
    // NOTE: Hero UI 3.0 beta has a known issue with controlled modals
    // DialogTrigger shows a warning about missing pressable child, but the modal works correctly
    // This warning can be safely ignored until Hero UI fixes the issue
    <Modal state={state}>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="flex flex-col gap-1">
              <div className="text-center mb-4">
                <div className="flex justify-center mb-6">
                  <Image
                    src="/web-app-manifest-192x192.png"
                    alt="Moment LBS"
                    width={80}
                    height={80}
                    className="rounded-xl"
                  />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-earth-900 dark:text-gray-100 mb-2">
                  {t('auth.welcome')}
                </h1>
                <p className="text-earth-700 dark:text-gray-300 mt-8">{t('auth.signInToAccess')}</p>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-4 px-2">
                <Button
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl border-2 border-gray-300 transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                  onPress={async () => {
                    await onSignIn('google')
                  }}
                >
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>{t('auth.continueWithGoogle')}</span>
                  </>
                </Button>
                <Button
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                  onPress={async () => {
                    await onSignIn('apple')
                  }}
                >
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <span>{t('auth.continueWithApple')}</span>
                  </>
                </Button>
              </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="danger-soft" onPress={onOpenChange}>{t('auth.close', 'Close')}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
