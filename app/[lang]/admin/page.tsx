import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { redirect } from 'next/navigation'
import DashboardView from './DashboardView'
import { SchedulingProvider } from '@/contexts/SchedulingContext';

export default async function AdminPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const session = await auth()

  if (!session?.user?.isAdmin) {
    redirect(`/${lang}`)
  }

  return (
      <DashboardView />
  )
}