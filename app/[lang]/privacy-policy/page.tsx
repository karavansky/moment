import type { Metadata } from 'next'
import PrivacyPolicyClient from './PrivacyPolicyClient'
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
    dict.seo.privacyPolicy.title,
    dict.seo.privacyPolicy.description,
    '/privacy-policy',
    lang,
    '/web-app-manifest-192x192.png'
  )
}

export default function PrivacyPolicy() {
  return <PrivacyPolicyClient />
}
