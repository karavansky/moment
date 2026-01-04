import {
  Card,
  CardHeader,
  Chip,
  Disclosure,
  DisclosureGroup,
  useDisclosureGroupNavigation,
  Button,
  Spinner,
  Accordion,
  AccordionItem,
  CardFooter,
} from '@heroui/react'
import SupportTicketForm from '@/components/SupportTicketForm'
import { SupportedLocale } from '@/config/locales'
import { useTranslation } from '@/components/Providers'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Selection } from '@heroui/react'
import { MessageSquare, MessageSquarePlus, MessagesSquare, Plus, SquarePen } from 'lucide-react'
import type { Ticket } from '@/lib/interface'
import type { ButtonProps } from '@heroui/react'
import { cn } from 'tailwind-variants'
import { Badge } from '@heroui/badge' // Правильно
import { PressableCard } from '@/components/PressableCard'
import { on } from 'node:cluster'

interface MyTicketsProps {
  lang: SupportedLocale
  tickets: Ticket[]
  userEmail: string
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
function AppleShowcaseButton({
  children,
  className,
  isSelected,
  ...props
}: ButtonProps & { isSelected: boolean }) {
  return (
    <Button
      className={cn(
        'h-14 rounded-full bg-[#1e1e20] text-[17px] text-[#f5f5f7] duration-400 ease-in-out-quad hover:bg-[#272729]',
        isSelected && 'bg-[#272729]',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

export default function MyTickets({ lang, tickets, userEmail, isDemo = false, onAction, authOpen }: MyTicketsProps) {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(
    tickets.length > 0 ? new Set(['2']) : new Set(['1'])
  )
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { t } = useTranslation()

  const onSelectionChange = (keys: Selection) => {
    // Если keys пустой или "all", оставляем текущий выбор
    if (keys === 'all' || (keys instanceof Set && keys.size === 0)) {
      return
    }
    setSelectedKeys(keys)
  }
  const itemClasses = {
    trigger: ' data-[hover=true]:bg-default-100 rounded-lg flex items-center',
  }
  //                  title={t('support.createTicket')}
  /*
              <AppleShowcaseButton
                isSelected={selectedKeys instanceof Set && selectedKeys.has('1')}
                slot="trigger"
              >
                <Plus
                  size={50}
                  color={
                    selectedKeys instanceof Set && selectedKeys.has('1') ? '#016fee' : undefined
                  }
                />
                {t('support.createTicket')}
              </AppleShowcaseButton>
*/
  return (
    <>
      <div className="flex flex-col items-center gap-2 mb-6">
        <h1 className="text-3xl font-bold">My Support Tickets</h1>
        <Chip variant="secondary" size="lg" color="success">
          {userEmail}
        </Chip>
      </div>
      <DisclosureGroup
        className="flex flex-col gap-y-3"
        expandedKeys={selectedKeys}
        onExpandedChange={onSelectionChange}
      >
        <Disclosure key="1" id="1" aria-label={t('support.createTicket')}>
          <Disclosure.Heading>
            <div className="flex flex-col items-start justify-start gap-2">
              <Button
                variant={
                  selectedKeys instanceof Set && selectedKeys.has('1') ? 'tertiary' : 'primary'
                }
                slot="trigger"
                size="lg"
                className="h-12 rounded-full gap-1"
              >
                <Plus className="min-w-7.5 min-h-7.5" />
                {t('support.createTicket')}
              </Button>
              {t('support.description')}
            </div>
          </Disclosure.Heading>
          <Disclosure.Content className="duration-420  ease-out-quad  py-3">
            <SupportTicketForm lang={lang} userEmail={userEmail} isDemo={isDemo} authOpen={authOpen} />
          </Disclosure.Content>
        </Disclosure>
        <Disclosure key="2" id="2" aria-label="My Tickets">
          <Disclosure.Heading>
            <div className="flex flex-col items-start justify-start gap-2">
              <Badge color="success" variant="solid" content={`${tickets.length}`} size="lg">
                <Button
                  variant={
                    selectedKeys instanceof Set && selectedKeys.has('2') ? 'tertiary' : 'primary'
                  }
                  slot="trigger"
                  size="lg"
                  className="h-12 rounded-full gap-1"
                >
                  <MessagesSquare className="min-w-7.5 min-h-7.5 mx-1" />
                  {'My Tickets'}
                </Button>
              </Badge>
            </div>
          </Disclosure.Heading>
          <Disclosure.Content className="duration-420 ease-out-quad py-2">
            <div className="flex flex-col gap-3 mx-3 xl:p-4">
              {tickets.map(ticket => (
                <PressableCard
                  key={ticket.ticketID}
                  onClick={() => {
                    if (isDemo) {
                      onAction && onAction('viewTicket', ticket)
                    } else {
                      startTransition(() => {
                        router.push(`/tickets/${ticket.ticketID}`)
                      })
                    }
                  }}
                  className={`dark:bg-gray-800/70 backdrop-blur-md  ${isPending ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <Card.Content className="flex flex-row justify-between items-start gap-4">
                    {/* Левый блок - растягивается */}
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <h2 className="text-md wrap-break-word">{ticket.subject}</h2>
                      {(ticket.unreadCount || 0) > 0 && (
                        <Chip size="sm" color="accent" variant="primary" className="shrink-0">
                          {ticket.unreadCount} new
                        </Chip>
                      )}
                    </div>

                    {/* Правый блок - прижимается к правому краю */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Chip size="sm" variant="soft">
                        {categoryNames[ticket.category]}
                      </Chip>
                      <Chip size="sm" color={priorityColors[ticket.pripority]} variant="soft">
                        {priorityNames[ticket.pripority]}
                      </Chip>
                    </div>
                  </Card.Content>
                  <Card.Footer>
                    <div className="flex flex-row justify-between items-center w-full">
                      <div className="text-sm opacity-70">
                        {ticket.messageCount} message{ticket.messageCount !== 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-row items-center gap-1 text-sm opacity-70">
                        <SquarePen size={16} />
                        <span suppressHydrationWarning>
                          {new Date(ticket.date).toLocaleTimeString(lang, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          , {new Date(ticket.date).toLocaleDateString(lang)}
                        </span>
                      </div>
                    </div>
                  </Card.Footer>
                </PressableCard>
              ))}
            </div>
          </Disclosure.Content>
        </Disclosure>
      </DisclosureGroup>
    </>
  )
}
