import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { redirect } from 'next/navigation'
import ClientsView from './ClientsView'
import { SchedulingProvider } from '@/contexts/SchedulingContext';

export default async function ClientsPage() {
  const session = await auth()
  
  let isDemo = true
  
  if (session?.user?.email) {
    const user = await getUserByEmail(session.user.email)

    if (!user) {
   //   redirect('/login')
    } else {
      isDemo = true
    }
  } else {
  //  redirect('/login')
  }

  return (
      <ClientsView />
  )
}
