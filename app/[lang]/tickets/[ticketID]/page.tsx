import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTicketById } from '@/lib/tickets'
import { notFound } from 'next/navigation'
import TicketDetailClient from './TicketDetailClient'
import { localizedLink } from '@/utils/localizedLink'
import { SupportedLocale } from '@/config/locales'
import type { Ticket } from '@/lib/interface'
import { ticketExample } from '@/lib/interface'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketID: string; lang: SupportedLocale }>
}) {
  const session = await auth()
  const { ticketID, lang } = await params
  if (ticketID !== '12345' && ticketID !== '12346') {
    if (!session?.user?.email || !session?.user?.id) {
      redirect(localizedLink('support', lang))
    }

    const ticket = await getTicketById(ticketID)
    if (!ticket) {
      notFound()
    }

    // Check access rights
    if (ticket.userID !== session.user.id && !session.user.isAdmin) {
      redirect(localizedLink('tickets', lang))
    }
    return <TicketDetailClient ticket={ticket} isAdmin={session.user.isAdmin || false} />
  }
  const ticket: Ticket = ticketID === '12345' ? ticketExample[0] : ticketExample[1]

  return <TicketDetailClient ticket={ticket} isAdmin={false} />
}
