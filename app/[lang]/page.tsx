import HomeClient from './HomeClient'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getDictionary, hasLocale, type Locale } from '@/config/dictionaries'
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
    dict.seo.home.title,
    dict.seo.home.description,
    '',
    lang,
    '/quail-background.webp'
  )
}

export default function Home() {
  return <HomeClient />
}
