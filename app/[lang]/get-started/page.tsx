import GetStartedClient from './GetStartedClient'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getDictionary, hasLocale } from '@/config/dictionaries'
import { Metadata } from 'next'
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
    dict.seo.getStarted.title,
    dict.seo.getStarted.description,
    '/get-started',
    lang,
    '/quail-breeder-application.webp'
  )
}

export default function GetStarted() {
  return <GetStartedClient />
}
