'use client'

import Image from 'next/image'
import { useTranslation } from '@/components/Providers'
import type { SupportedLocale } from '@/config/locales'

interface ConfirmClientProps {
  lang: SupportedLocale
}

export default function ConfirmClient({ lang }: ConfirmClientProps) {
  const { t } = useTranslation()

  // Эта страница показывается только если пользователь перешёл на /[lang]/auth/confirm
  // напрямую (без токена). Реальное подтверждение идёт через API /api/auth/confirm?token=xxx
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <Image
          src="/web-app-manifest-192x192.png"
          alt="Moment LBS"
          width={80}
          height={80}
          className="rounded-xl"
        />
      </div>
      <h1 className="font-display text-2xl font-bold text-earth-900 dark:text-gray-100 mb-4">
        {t('auth.emailConfirmation', 'Email Confirmation')}
      </h1>
      <p className="text-earth-700 dark:text-gray-300 mb-6">
        {t('auth.checkEmailForLink', 'Please check your email for the confirmation link.')}
      </p>
      <a
        href={`/${lang}/auth/signin`}
        className="text-earth-800 dark:text-gray-300 hover:underline font-semibold"
      >
        {t('auth.backToSignIn', 'Back to sign in')}
      </a>
    </div>
  )
}
