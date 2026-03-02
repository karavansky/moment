import { hasLocale } from '@/config/dictionaries'
import { notFound } from 'next/navigation'
import HomeClient from './HomeClient'

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  return <HomeClient />
}
