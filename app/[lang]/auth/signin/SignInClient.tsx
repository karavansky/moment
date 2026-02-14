'use client'

import { useAuth } from '@/components/AuthProvider'
import { useTranslation } from '@/components/Providers'
import { SignInFormContent } from '@/components/SignInFormContent'
import type { SupportedLocale } from '@/config/locales'

interface SignInClientProps {
  lang: SupportedLocale
}

export default function SignInClient({ lang }: SignInClientProps) {
  const { signIn, signInWithCredentials } = useAuth()
  const { t } = useTranslation()

  const handleSignIn = async (provider: 'google' | 'apple') => {
    await signIn(provider, `/${lang}/support`)
  }

  const handleCredentialsSignIn = async (email: string, password: string) => {
    return signInWithCredentials(email, password, `/${lang}/support`)
  }

  return (
    <SignInFormContent
      onSignIn={handleSignIn}
      onSignInWithCredentials={handleCredentialsSignIn}
      t={t}
      lang={lang}
      showTerms
    />
  )
}
