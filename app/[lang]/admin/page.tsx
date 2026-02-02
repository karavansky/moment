import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { redirect } from 'next/navigation'
import DashboardView from './DashboardView'
import { SchedulingProvider } from '@/contexts/SchedulingContext';

export default async function ClientsPage() {
  const session = await auth()
  

  if (!session?.user?.isAdmin) {
    redirect('/')
  }

  return (
      <DashboardView />
  )
}