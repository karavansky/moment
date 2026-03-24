import { hasLocale } from '@/config/dictionaries'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import HomeClient from './HomeClient'
import { SportBookingInfo } from '@/components/SportBookingInfo'

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  // Check if user has status = 7 (Sport- und Bäderamt)
  const session = await auth()
  const userStatus = session?.user?.status

  // Show Sport Booking System info for status = 7
  if (userStatus === 7) {
    return <SportBookingInfo />
  }

  return <HomeClient />
}
