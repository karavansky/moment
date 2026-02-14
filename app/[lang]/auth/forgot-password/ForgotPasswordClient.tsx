'use client'

import { Button, Form, TextField, Label, Input, FieldError, Spinner } from '@heroui/react'
import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from '@/components/Providers'
import type { SupportedLocale } from '@/config/locales'

interface ForgotPasswordClientProps {
  lang: SupportedLocale
}

export default function ForgotPasswordClient({ lang }: ForgotPasswordClientProps) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email')?.toString() || ''

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || t('auth.requestFailed', 'Request failed'))
        return
      }

      setSuccess(true)
    } catch {
      setError(t('auth.requestFailed', 'Request failed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
          {t('auth.checkEmail', 'Check your email')}
        </h1>
        <p className="text-earth-700 dark:text-gray-300 mb-6">
          {t('auth.resetLinkSent', 'If an account with this email exists, we sent a password reset link.')}
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

  return (
    <>
      <div className="text-center mb-6">
        <div className="flex justify-center mb-6">
          <Image
            src="/web-app-manifest-192x192.png"
            alt="Moment LBS"
            width={80}
            height={80}
            className="rounded-xl"
          />
        </div>
        <h1 className="font-display text-2xl font-bold text-earth-900 dark:text-gray-100 mb-2">
          {t('auth.forgotPassword', 'Forgot password?')}
        </h1>
        <p className="text-earth-700 dark:text-gray-300 mt-2">
          {t('auth.enterEmailToReset', 'Enter your email to receive a password reset link.')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center mb-4">
          {error}
        </div>
      )}

      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          isRequired
          name="email"
          type="email"
          autoComplete="email"
          validate={(value) => {
            if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
              return t('auth.invalidEmail', 'Please enter a valid email address')
            }
            return null
          }}
        >
          <Label>Email</Label>
          <Input placeholder="email@example.com" />
          <FieldError />
        </TextField>

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="w-full rounded-xl font-semibold"
          isDisabled={isLoading}
        >
          {isLoading ? <Spinner /> : t('auth.sendResetLink', 'Send Reset Link')}
        </Button>
      </Form>

      <div className="mt-6 text-center">
        <a
          href={`/${lang}/auth/signin`}
          className="text-earth-800 dark:text-gray-300 hover:underline font-semibold text-sm"
        >
          {t('auth.backToSignIn', 'Back to sign in')}
        </a>
      </div>
    </>
  )
}
