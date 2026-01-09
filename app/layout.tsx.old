import type { Metadata, Viewport } from 'next'
import './[lang]/globals.css'
import { supportedLocales } from '@/config/locales'
import { getDictionary, hasLocale } from '@/config/dictionaries'
import { notFound } from 'next/navigation'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'auto',
}
const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'



// Minimal root layout for the root page
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
