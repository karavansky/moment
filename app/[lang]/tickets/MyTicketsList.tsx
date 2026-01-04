'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Selection } from '@heroui/react'
import {
  Card,
  CardHeader,
  Chip,
  Button,
  Spinner,
  Accordion,
  AccordionItem,
} from '@heroui/react'
import SupportTicketForm from '@/components/SupportTicketForm'
import { SupportedLocale } from '@/config/locales'
import { useTranslation } from '@/components/Providers'
import MyTickets from './MyTickets'
import type { Ticket } from '@/lib/interface'



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

interface MyTicketsListProps {
  lang: SupportedLocale
  userEmail: string
}

export default function MyTicketsList({ lang, userEmail }: MyTicketsListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { t } = useTranslation()
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set(['1']))
  const [isPending, startTransition] = useTransition()

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/tickets/my')

      // Check for rate limiting or other HTTP errors
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited, will retry later')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setTickets(data.tickets)
        if (data.tickets.length > 0) {
          setSelectedKeys(new Set(['2']))
        }
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    // const interval = setInterval(loadTickets, 30000)
    // return () => clearInterval(interval)
    return () => {}
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  /* Handle case when user has no tickets 
  if (tickets.length === 0) {
    return (
      <Card>
        <Card.Content className="text-center py-12">
          <p className="text-xl opacity-70 mb-4">You don't have any support tickets yet</p>
          <Button color="primary" onClick={() => router.push('/support')}>
            Create Support Ticket
          </Button>
        </Card.Content>
      </Card>
    )
  }

  defaultSelectedKeys
    */
  //        <Button startContent="+" color="primary" >New Ticket</Button>
  const onSelectionChange = (keys: Selection) => {
    // Если keys пустой или "all", оставляем текущий выбор
    if (keys === 'all' || (keys instanceof Set && keys.size === 0)) {
      return
    }
    setSelectedKeys(keys)
  }
 return <MyTickets lang={lang} tickets={tickets} userEmail={userEmail} />
}
