'use client'

import { Button, Form, TextField, Label, Input, FieldError, Description, Spinner } from '@heroui/react'
import { Turnstile } from '@marsidev/react-turnstile'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useTranslation } from '@/components/Providers'
import type { SupportedLocale } from '@/config/locales'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

interface RegisterClientProps {
  lang: SupportedLocale
}

export default function RegisterClient({ lang }: RegisterClientProps) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name')?.toString() || ''
    const email = formData.get('email')?.toString() || ''
    const organisation = formData.get('organisation')?.toString() || ''
    const password = formData.get('password')?.toString() || ''
    const confirmPassword = formData.get('confirmPassword')?.toString() || ''

    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch', 'Passwords do not match'))
      return
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError(t('auth.captchaRequired', 'Please complete the CAPTCHA verification'))
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organisation, turnstileToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('auth.registrationFailed', 'Registration failed'))
        return
      }

      setSuccess(true)
    } catch {
      setError(t('auth.registrationFailed', 'Registration failed'))
    } finally {
      setIsLoading(false)
      turnstileRef.current?.reset()
      setTurnstileToken(null)
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
          {t('auth.verificationSent', 'We sent a verification link to your email. Please click it to activate your account.')}
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
        <h1 className="font-display text-3xl md:text-4xl font-bold text-earth-900 dark:text-gray-100 mb-2">
          {t('auth.createAccount', 'Create Account')}
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
          name="name"
          type="text"
          autoComplete="name"
        >
          <Label>{t('auth.name', 'Name')}</Label>
          <Input placeholder={t('auth.namePlaceholder', 'Your name')} />
          <FieldError />
        </TextField>

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

        <TextField
          isRequired
          name="organisation"
          type="text"
          maxLength={80}
          autoComplete="organization"
        >
          <Label>{t('auth.organisation', 'Organisation')}</Label>
          <Input placeholder={t('auth.organisationPlaceholder', 'Your company or organisation')} />
          <FieldError />
        </TextField>

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
          <Label>{t('auth.password', 'Password')}</Label>
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

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={(code) => {
                console.error('[Turnstile] Error code:', code)
                setError(`CAPTCHA failed to load (${code}). Check domain settings in Cloudflare Turnstile.`)
              }}
              options={{ theme: 'auto', size: 'normal' }}
            />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="w-full rounded-xl font-semibold"
          isDisabled={isLoading}
        >
           {isLoading ? <Spinner /> : t('auth.register', 'Register')}
        </Button>
      </Form>

      <div className="mt-6 text-center text-sm">
        <span className="text-earth-700 dark:text-gray-400">
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
        </span>
        <a
          href={`/${lang}/auth/signin`}
          className="text-earth-800 dark:text-gray-300 hover:underline font-semibold"
        >
          {t('auth.signIn', 'Sign In')}
        </a>
      </div>
    </>
  )
}
