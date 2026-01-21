import { getDictionary, hasLocale } from '@/config/dictionaries'
import { createPageMetadata } from '@/lib/seo/metadata'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SlaClient from './SlaClient'

interface SlaPageProps {
  params: Promise<{
    lang: string
  }>
}

export async function generateMetadata({ params }: SlaPageProps): Promise<Metadata> {
  const { lang } = await params

  // Validate locale before loading dictionary
  if (!hasLocale(lang)) {
    notFound()
  }

  const dict = await getDictionary(lang)

  return createPageMetadata(
    dict.sla.hero.title,
    dict.sla.hero.description,
    '/support',
    lang,
    '/web-app-manifest-192x192.png'
  )
}

export default async function SlaPage() {
  return <SlaClient />
}
