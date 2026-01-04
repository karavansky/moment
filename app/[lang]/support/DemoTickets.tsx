import { Suspense, useCallback, useState, useTransition } from 'react'
import MyTickets from '../tickets/MyTickets'
import type { Ticket } from '@/lib/interface'
import { ticketExample } from '@/lib/interface'
import TicketDetailClient from '../tickets/[ticketID]/TicketDetailClient'
import { SupportedLocale } from '@/config/locales'

interface DemoTicketsProps {
    lang: SupportedLocale
    authOpen?: () => void
}


export default function DemoTickets({ lang, authOpen }: DemoTicketsProps) {
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState('root')
  const [ticket, setTicket] = useState<Ticket | null>(null)

  const onAction = useCallback(
    () => (action: string, ticket?: Ticket) => {
      startTransition(() => {
        if (action === 'viewTicket' && ticket) {
          setTicket(ticket)
          setView('ticketDetail')
        } else if (action === 'backToList') {
          setTicket(null)
          setView('root')
        }
      })
    },
    [setView, setTicket]
  )
  return (
    <Suspense fallback={<div>Loading demo tickets...</div>}>
      {view === 'root' && (
        <MyTickets lang={lang} tickets={ticketExample} userEmail="demo@example.com" isDemo={true} onAction={onAction()} authOpen={authOpen} />
      )}
      {view === 'ticketDetail' && ticket && <TicketDetailClient ticket={ticket} isAdmin={false} isDemo={true} onAction={onAction()} authOpen={authOpen} />}
    </Suspense>
  )
}
