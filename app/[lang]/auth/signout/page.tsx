'use client'

import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/components/Providers'
import { useLanguage } from '@/hooks/useLanguage'

export default function SignOutPage() {
  const { t } = useTranslation()
  const lang = useLanguage()
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    // Auto-signout after component mounts
    const performSignOut = async () => {
      setIsSigningOut(true)

      // 1. Unsubscribe from pushes on THIS device before destroying session
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint }),
            })
            console.log('[SignOut] Successfully purged local push token')
          }
        }
      } catch (err) {
        console.error('[SignOut] Failed to purge push token:', err)
      }

      // 2. SignOut and redirect to signin page
      await signOut({
        callbackUrl: `/${lang}/auth/signin`,
        redirect: true,
      })
    }

    // Small delay to show the UI
    const timer = setTimeout(() => {
      performSignOut()
    }, 500)

    return () => clearTimeout(timer)
  }, [lang])

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-earth-800 via-earth-900 to-earth-950 p-4">
      <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md border border-sand-300 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 border-4 border-earth-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-earth-900 dark:text-white mb-2">
            {t('auth.signingOut', 'Signing out...')}
          </h2>
          <p className="text-earth-700 dark:text-gray-300 text-sm">
            {t('auth.pleaseWait', 'Please wait')}
          </p>
        </div>

        {!isSigningOut && (
          <button
            onClick={async () => {
              setIsSigningOut(true)

              // 1. Unsubscribe
              try {
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                  const reg = await navigator.serviceWorker.ready
                  const sub = await reg.pushManager.getSubscription()
                  if (sub) {
                    await fetch('/api/push/unsubscribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ endpoint: sub.endpoint }),
                    })
                  }
                }
              } catch (err) {
                console.error('[SignOut] Failed to purge push token:', err)
              }

              // 2. SignOut
              await signOut({
                callbackUrl: `/${lang}/auth/signin`,
                redirect: true,
              })
            }}
            className="w-full bg-earth-600 hover:bg-earth-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            {t('auth.confirmSignOut', 'Sign Out')}
          </button>
        )}
      </div>
    </div>
  )
}
