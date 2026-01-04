'use client'

import { Card, CardHeader, Chip, Button } from '@heroui/react'
import { useRouter, usePathname } from 'next/navigation'
import TicketChat from '@/components/TicketChat'
import { useState, useEffect, useRef } from 'react'
import type { Ticket } from '@/lib/interface'
import { isDynamicServerError } from 'next/dist/client/components/hooks-server-context'
import { on } from 'node:cluster'

interface TicketDetailClientProps {
  ticket: Ticket
  isAdmin: boolean
  isDemo?: boolean
  onAction?: (action: string, ticket?: Ticket) => void
  authOpen?: () => void
}

const categoryNames: Record<number, string> = {
  1: 'Technical',
  2: 'Billing',
  3: 'Feature',
  4: 'Data',
  5: 'Other',
}

const priorityColors: Record<number, 'success' | 'warning' | 'danger'> = {
  1: 'success',
  2: 'warning',
  3: 'danger',
}

const priorityNames: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
}

export default function TicketDetailClient({
  ticket,
  isAdmin,
  isDemo,
  onAction,
  authOpen,
}: TicketDetailClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const messagesStartRef = useRef<HTMLDivElement>(null)

  const scrollToTop = () => {
    messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  // Avoid hydration mismatch by only rendering date on client
  useEffect(() => {
    setMounted(true)
    scrollToTop()
  }, [])

  const handleBack = () => {
    // Извлекаем язык из текущего пути (например, /en/tickets/123 -> en)
    console.log('Back button clicked, isDemo:', isDemo)
    if (isDemo && onAction) {
      onAction('backToList')
    } else {
      const lang = pathname.split('/')[1]
      router.push(`/${lang}/tickets`)
    }
  }

  return (
    <div ref={messagesStartRef}>
      <div className="container mx-auto pt-18">
        <Button onPress={handleBack} variant="primary" className="mb-4">
          ← Back
        </Button>

        <Card className="mb-6">
          <CardHeader className="flex justify-between">
            <div>
              <h1 className="text-2xl font-bold">{ticket.subject}</h1>
              <p className="text-sm opacity-70 mt-1">Ticket ID: {ticket.ticketID}</p>
            </div>
            <div className="flex gap-2">
              <Chip variant="primary">{categoryNames[ticket.category]}</Chip>
              <Chip color={priorityColors[ticket.pripority]} variant="primary">
                {priorityNames[ticket.pripority]}
              </Chip>
            </div>
          </CardHeader>
          <Card.Content>
            <p className="text-sm opacity-70">
              Created: {mounted ? new Date(ticket.date).toLocaleString() : '...'}
            </p>
          </Card.Content>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Conversation</h2>
          </CardHeader>
          <Card.Content className="p-0">
            <TicketChat ticketID={ticket.ticketID} isAdmin={isAdmin} isDemo={isDemo} authOpen={authOpen}/>
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
