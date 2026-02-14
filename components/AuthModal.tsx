'use client'

import { Modal, Button } from '@heroui/react'
import { useMemo } from 'react'
import { SignInFormContent } from './SignInFormContent'

interface AuthModalProps {
  isOpen: boolean
  onOpenChange: () => void
  onSignIn: (provider: 'google' | 'apple') => Promise<void>
  onSignInWithCredentials?: (email: string, password: string) => Promise<{ error?: string; ok?: boolean }>
  t: (path: string, fallback?: string) => string
  lang?: string
}

export function AuthModal({ isOpen, onOpenChange, onSignIn, onSignInWithCredentials, t, lang }: AuthModalProps) {
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
              <SignInFormContent onSignIn={onSignIn} onSignInWithCredentials={onSignInWithCredentials} t={t} lang={lang} />
            </Modal.Header>
            <Modal.Body />
            <Modal.Footer>
                <Button variant="danger-soft" onPress={onOpenChange}>{t('auth.close', 'Close')}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
