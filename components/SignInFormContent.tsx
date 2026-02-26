'use client'

import { Button, Form, TextField, Label, Input, FieldError, Spinner } from '@heroui/react'
import Image from 'next/image'
import { useState } from 'react'

interface SignInFormContentProps {
  onSignIn: (provider: 'google' | 'apple') => Promise<void>
  onSignInWithCredentials?: (email: string, password: string) => Promise<{ error?: string; ok?: boolean }>
  t: (path: string, fallback?: string) => string
  lang?: string
  showTerms?: boolean
  showCredentials?: boolean
}

export function SignInFormContent({ onSignIn, onSignInWithCredentials, t, lang, showTerms, showCredentials = true }: SignInFormContentProps) {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCredentialsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!onSignInWithCredentials) return

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email')?.toString() || ''
    const password = formData.get('password')?.toString() || ''

    if (!email || !password) return

    setError('')
    setIsLoading(true)

    try {
      const result = await onSignInWithCredentials(email, password)
      if (result.error) {
        if (result.error === 'CredentialsSignin') {
          setError(t('auth.invalidCredentials', 'Invalid email or password'))
        } else if (result.error.includes('EMAIL_NOT_VERIFIED')) {
          setError(t('auth.emailNotVerified', 'Please verify your email first'))
        } else {
          setError(t('auth.signInFailed', 'Sign in failed'))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="text-center mb-4">
        <div className="flex flex-row md:flex-col items-center justify-center gap-4 mb-4 md:mb-6">
          <Image
            src="/web-app-manifest-192x192.png"
            alt="Moment LBS"
            width={80}
            height={80}
            className="rounded-xl w-16 h-16 md:w-20 md:h-20 shrink-0"
          />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-earth-900 dark:text-gray-100 md:mb-2 text-left md:text-center">
            {t('auth.welcome')}
          </h1>
        </div>
        <p className="text-earth-700 dark:text-gray-300 mt-4 md:mt-8">{t('auth.signInToAccess')}</p>
      </div>

      {showCredentials && onSignInWithCredentials && (
        <>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center mx-2 mb-4">
              {error}
            </div>
          )}

          <Form className="flex flex-col gap-4 px-2" onSubmit={handleCredentialsSubmit}>
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
              name="password"
              type="password"
              minLength={8}
              autoComplete="current-password"
            >
              <Label>{t('auth.password', 'Password')}</Label>
              <Input placeholder={t('auth.enterPassword', 'Enter your password')} />
              <FieldError />
            </TextField>

            <Button
              type="submit"
              size="lg"
              variant="primary"
              className="w-full rounded-xl font-semibold"
              isDisabled={isLoading}
            >
              {isLoading ? <Spinner /> : t('auth.signIn', 'Sign In')}
            </Button>
          </Form>

          {lang && (
            <div className="flex justify-between px-2 mt-2 text-sm">
              <a
                href={`/${lang}/auth/forgot-password`}
                className="text-earth-700 dark:text-gray-400 hover:underline"
              >
                {t('auth.forgotPassword', 'Forgot password?')}
              </a>
              <a
                href={`/${lang}/auth/register`}
                className="text-earth-800 dark:text-gray-300 hover:underline font-semibold"
              >
                {t('auth.register', 'Register')}
              </a>
            </div>
          )}

          <div className="relative my-6 px-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-gray-800 px-4 text-gray-500">
                {t('auth.orContinueWith', 'or')}
              </span>
            </div>
          </div>
        </>
      )}

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

      {showTerms && lang && (
        <div className="mt-8 pt-6 border-t border-sand-300">
          <p className="text-center text-sm text-earth-600">
            {t('auth.byContinuing')}{' '}
            <a
              href={`/${lang}/terms-of-use`}
              className="text-earth-800 hover:underline font-semibold"
            >
              {t('auth.termsOfUse')}
            </a>{' '}
            {t('auth.and')}{' '}
            <a
              href={`/${lang}/privacy-policy`}
              className="text-earth-800 hover:underline font-semibold"
            >
              {t('auth.privacyPolicy')}
            </a>
          </p>
        </div>
      )}
    </>
  )
}
