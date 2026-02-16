import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { redirect } from 'next/navigation'
import WorkersView from './WorkersView'
import { SchedulingProvider } from '@/contexts/SchedulingContext'

export default async function WorkersPage() {
  const session = await auth()

  let isDemo = true
  console.log('Session:', session) // Debug log
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
    <div className="h-full w-full">
      <WorkersView />
    </div>
  )
}
