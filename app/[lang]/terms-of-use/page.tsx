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
    '/hatching-quail-icon-200.webp'
  )
}

export default function TermsOfUse() {
  return <TermsOfUseClient />
}
