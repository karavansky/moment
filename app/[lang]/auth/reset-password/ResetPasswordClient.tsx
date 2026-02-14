'use client'

import { Button, Form, TextField, Label, Input, FieldError, Description, Spinner } from '@heroui/react'
import Image from 'next/image'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/components/Providers'
import type { SupportedLocale } from '@/config/locales'

interface ResetPasswordClientProps {
  lang: SupportedLocale
}

export default function ResetPasswordClient({ lang }: ResetPasswordClientProps) {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-red-600 mb-4">
          {t('auth.invalidLink', 'Invalid Link')}
        </h1>
        <p className="text-earth-700 dark:text-gray-300 mb-6">
          {t('auth.resetLinkInvalid', 'This password reset link is invalid or has expired.')}
        </p>
        <a
          href={`/${lang}/auth/forgot-password`}
          className="text-earth-800 dark:text-gray-300 hover:underline font-semibold"
        >
          {t('auth.requestNewLink', 'Request a new link')}
        </a>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password')?.toString() || ''
    const confirmPassword = formData.get('confirmPassword')?.toString() || ''

    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch', 'Passwords do not match'))
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('auth.resetFailed', 'Password reset failed'))
        return
      }

      setSuccess(true)
    } catch {
      setError(t('auth.resetFailed', 'Password reset failed'))
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
          {t('auth.passwordResetSuccess', 'Password Reset Successfully')}
        </h1>
        <p className="text-earth-700 dark:text-gray-300 mb-6">
          {t('auth.canNowSignIn', 'You can now sign in with your new password.')}
        </p>
        <a
          href={`/${lang}/auth/signin`}
          className="inline-block bg-earth-800 text-white font-semibold py-3 px-8 rounded-xl hover:bg-earth-900 transition-colors"
        >
          {t('auth.signIn', 'Sign In')}
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
          {t('auth.setNewPassword', 'Set New Password')}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center mb-4">
          {error}
        </div>
      )}

      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          isRequired
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          validate={(value) => {
            if (value.length < 8) {
              return t('auth.passwordTooShort', 'Password must be at least 8 characters')
            }
            return null
          }}
        >
          <Label>{t('auth.newPassword', 'New Password')}</Label>
          <Input placeholder={t('auth.enterPassword', 'Enter your password')} />
          <Description>{t('auth.passwordRequirements', 'At least 8 characters')}</Description>
          <FieldError />
        </TextField>

        <TextField
          isRequired
          name="confirmPassword"
          type="password"
          minLength={8}
          autoComplete="new-password"
        >
          <Label>{t('auth.confirmPassword', 'Confirm Password')}</Label>
          <Input placeholder={t('auth.repeatPassword', 'Repeat your password')} />
          <FieldError />
        </TextField>

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="w-full rounded-xl font-semibold"
          isDisabled={isLoading}
        >
          {isLoading ? <Spinner /> : t('auth.resetPassword', 'Reset Password')}
        </Button>
      </Form>
    </>
  )
}
