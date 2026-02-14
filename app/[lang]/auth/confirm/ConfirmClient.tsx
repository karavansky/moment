'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button, Spinner, TextField, Label, Input } from '@heroui/react'
import { CheckCircle, XCircle, Clock, Mail } from 'lucide-react'
import { useTranslation } from '@/components/Providers'
import type { SupportedLocale } from '@/config/locales'

interface ConfirmClientProps {
  lang: SupportedLocale
}

export default function ConfirmClient({ lang }: ConfirmClientProps) {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')

  if (status === 'success') return <SuccessView lang={lang} />
  if (status === 'expired') return <ExpiredView lang={lang} />
  if (status === 'invalid' || status === 'error') return <ErrorView lang={lang} />

  // Страница без параметров — пользователь зашёл напрямую
  return <DefaultView lang={lang} />
}

function DefaultView({ lang }: { lang: SupportedLocale }) {
  const { t } = useTranslation()

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

function SuccessView({ lang }: { lang: SupportedLocale }) {
  const { t } = useTranslation()

  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <h1 className="font-display text-2xl font-bold text-earth-900 dark:text-gray-100 mb-4">
        {t('auth.emailConfirmed', 'Email Confirmed!')}
      </h1>
      <p className="text-earth-700 dark:text-gray-300 mb-2">
        {t('auth.emailConfirmedDesc', 'Your email has been successfully verified and you are now logged in.')}
      </p>
      <p className="text-earth-600 dark:text-gray-400 text-sm mb-8">
        {t('auth.canCloseWindow', 'You can close this window or continue to the app.')}
      </p>
      <a
        href={`/${lang}`}
        className="inline-block bg-earth-800 hover:bg-earth-900 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
      >
        {t('auth.goToApp', 'Go to App')}
      </a>
    </div>
  )
}

function ExpiredView({ lang }: { lang: SupportedLocale }) {
  const { t } = useTranslation()

  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
      <h1 className="font-display text-2xl font-bold text-earth-900 dark:text-gray-100 mb-4">
        {t('auth.linkExpired', 'Link Expired')}
      </h1>
      <p className="text-earth-700 dark:text-gray-300 mb-6">
        {t('auth.linkExpiredDesc', 'This confirmation link has expired or has already been used. Enter your email to receive a new one.')}
      </p>
      <ResendForm lang={lang} />
    </div>
  )
}

function ErrorView({ lang }: { lang: SupportedLocale }) {
  const { t } = useTranslation()

  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
      </div>
      <h1 className="font-display text-2xl font-bold text-earth-900 dark:text-gray-100 mb-4">
        {t('auth.confirmationFailed', 'Confirmation Failed')}
      </h1>
      <p className="text-earth-700 dark:text-gray-300 mb-6">
        {t('auth.confirmationFailedDesc', 'Something went wrong. If you need a new confirmation link, enter your email below.')}
      </p>
      <ResendForm lang={lang} />
    </div>
  )
}

function ResendForm({ lang }: { lang: SupportedLocale }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({
          type: 'success',
          message: t('auth.verificationResent', 'A new confirmation link has been sent to your email.'),
        })
      } else {
        setResult({
          type: 'error',
          message: data.error || t('auth.resendFailed', 'Failed to send verification email.'),
        })
      }
    } catch {
      setResult({
        type: 'error',
        message: t('auth.resendFailed', 'Failed to send verification email.'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (result?.type === 'success') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl text-sm">
          <Mail className="w-5 h-5 shrink-0" />
          {result.message}
        </div>
        <a
          href={`/${lang}/auth/signin`}
          className="text-earth-800 dark:text-gray-300 hover:underline font-semibold text-sm"
        >
          {t('auth.backToSignIn', 'Back to sign in')}
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleResend} className="flex flex-col gap-4 text-left">
      {result?.type === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center">
          {result.message}
        </div>
      )}
      <TextField
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        isRequired
      >
        <Label>Email</Label>
        <Input placeholder="your@email.com" />
      </TextField>
      <Button
        type="submit"
        variant="primary"
        isDisabled={isLoading || !email}
        className="w-full"
      >
        {isLoading ? <Spinner size="sm" /> : <Mail className="w-4 h-4" />}
        {t('auth.resendVerification', 'Send New Link')}
      </Button>
      <a
        href={`/${lang}/auth/signin`}
        className="text-earth-800 dark:text-gray-300 hover:underline font-semibold text-sm text-center"
      >
        {t('auth.backToSignIn', 'Back to sign in')}
      </a>
    </form>
  )
}
