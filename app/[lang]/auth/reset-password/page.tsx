import type { SupportedLocale } from '@/config/locales'
import ResetPasswordClient from './ResetPasswordClient'

interface ResetPasswordPageProps {
  params: Promise<{
    lang: SupportedLocale
  }>
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { lang } = await params

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-earth-800 via-earth-900 to-earth-950 p-4">
      <div className="bg-white/95 backdrop-blur-md dark:bg-gray-800/90 rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md border border-sand-300">
        <ResetPasswordClient lang={lang} />
      </div>
    </div>
  )
}
