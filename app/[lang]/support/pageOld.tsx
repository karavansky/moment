import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getDictionary } from '@/config/dictionaries'
import type { SupportedLocale } from '@/config/locales'
import SupportTicketForm from '@/components/SupportTicketForm'

interface SupportPageProps {
  params: Promise<{
    lang: SupportedLocale
  }>
}

export default async function SupportPage({ params }: SupportPageProps) {
  const { lang } = await params
  const session = await auth()

  if (!session) {
    redirect(`/${lang}/auth/signin`)
  }

  const dict = await getDictionary(lang)

  return (
    <div className="min-h-screen pt-12 bg-linear-to-br from-earth-800 via-earth-900 to-earth-950">
      {/* Header */}
      <div className="bg-earth-900/80 backdrop-blur-md border-b border-sand-300/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/web-app-manifest-192x192.png"
                alt="Quail Breeder"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h1 className="font-display text-xl font-bold text-sand-50">
                  {dict.support.title}
                </h1>
                <p className="text-sm text-sand-300">{session.user?.email}</p>
              </div>
            </div>

            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: `/${lang}` })
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-sand-200 hover:text-sand-50 hover:bg-earth-800 rounded-lg transition-colors"
              >
                {dict.support.signOut}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 md:p-12 border border-sand-300">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-earth-900 mb-3">
              {dict.support.createTicket}
            </h2>
            <p className="text-earth-700 text-lg">{dict.support.description}</p>
          </div>

          <SupportTicketForm userEmail={session.user?.email || ''} lang={lang} />
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-earth-900/70 backdrop-blur-md rounded-2xl p-6 border border-sand-300/30">
          <h3 className="font-display text-xl font-bold text-sand-50 mb-4">
            {dict.support.beforeSubmitting}
          </h3>
          <ul className="space-y-2 text-sand-200">
            <li className="flex items-start gap-2">
              <span className="text-sand-400 mt-1">•</span>
              <span>{dict.support.tip1}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sand-400 mt-1">•</span>
              <span>{dict.support.tip2}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sand-400 mt-1">•</span>
              <span>{dict.support.tip3}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
