import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { redirect } from 'next/navigation'
import AdminTicketsList from '../AdminTicketsList'
import Dictionary from '../Dictionary'

export default async function AdminTicketsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const session = await auth()

  if (!session?.user?.email) {
    redirect(`/${lang}/login`)
  }

  const user = await getUserByEmail(session.user.email)

  if (!user?.isAdmin) {
    redirect(`/${lang}`)
  }

  return (
    <div className="container mx-auto pt-24 px-4 py-8 h-70vh">
      <h1 className="text-3xl font-bold mb-6">Admin Panel - Support Tickets</h1>
      <AdminTicketsList />
      <Dictionary />
    </div>
  )
}
