import AboutClient from './AboutClient'
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
    dict.seo.about.title,
    dict.seo.about.description,
    '/about',
    lang,
    '/web-app-manifest-192x192.png'
  )
}

export default function About() {
  return <AboutClient />
}
