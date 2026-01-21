import type { Metadata } from 'next'
import TermsOfUseClient from './TermsOfUseClient'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getDictionary, hasLocale } from '@/config/dictionaries'
import { notFound } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params

  // Validate locale before loading dictionary
  if (!hasLocale(lang)) {
    notFound()
  }

  const dict = await getDictionary(lang)

  return createPageMetadata(
    dict.seo.termsOfUse.title,
    dict.seo.termsOfUse.description,
    '/terms-of-use',
    lang,
    '/web-app-manifest-192x192.png'
  )
}

export default function TermsOfUse() {
  return <TermsOfUseClient />
}
