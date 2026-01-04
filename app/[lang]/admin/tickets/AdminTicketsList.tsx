'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@heroui/table'

import { Chip, Button, Modal, ModalHeader, ModalBody, Spinner } from '@heroui/react'
import TicketChat from '@/components/TicketChat'
import { useDisclosure } from '@/lib/useDisclosure'

interface Ticket {
  ticketID: string
  userID: string
  subject: string
  category: number
  pripority: number
  date: string
  userName: string
  userEmail: string
  messageCount: number
  unreadCount: number
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

export default function AdminTicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/admin/tickets')
      const data = await response.json()

      if (data.success) {
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    const interval = setInterval(loadTickets, 30000)
    return () => clearInterval(interval)
  }, [])

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    onOpen()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <p className="text-sm opacity-70">
          Total tickets: {tickets.length} | Unread:{' '}
          {tickets.reduce((sum, t) => sum + t.unreadCount, 0)}
        </p>
      </div>

      <Table aria-label="Admin tickets table">
        <TableHeader>
          <TableColumn>ID</TableColumn>
          <TableColumn>Subject</TableColumn>
          <TableColumn>User</TableColumn>
          <TableColumn>Category</TableColumn>
          <TableColumn>Priority</TableColumn>
          <TableColumn>Messages</TableColumn>
          <TableColumn>Date</TableColumn>
          <TableColumn>Action</TableColumn>
        </TableHeader>
        <TableBody>
          {tickets.map(ticket => (
            <TableRow key={ticket.ticketID}>
              <TableCell>
                <span className="text-xs font-mono">{ticket.ticketID.slice(0, 8)}...</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {ticket.subject}
                  {ticket.unreadCount > 0 && (
                    <Chip size="sm" color="danger" variant="soft">
                      {ticket.unreadCount} new
                    </Chip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-semibold">{ticket.userName}</div>
                  <div className="text-xs opacity-70">{ticket.userEmail}</div>
                </div>
              </TableCell>
              <TableCell>{categoryNames[ticket.category]}</TableCell>
              <TableCell>
                <Chip size="sm" color={priorityColors[ticket.pripority]} variant="soft">
                  {priorityNames[ticket.pripority]}
                </Chip>
              </TableCell>
              <TableCell>{ticket.messageCount}</TableCell>
              <TableCell>
                <span className="text-xs">{new Date(ticket.date).toLocaleDateString()}</span>
              </TableCell>
              <TableCell>
                <Button size="sm" onClick={() => openTicket(ticket)}  >
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} variant="blur">
          <Modal.Container>
            <Modal.Dialog>
              <ModalHeader>
                <div>
                  <h3>{selectedTicket?.subject}</h3>
                  <p className="text-sm opacity-70">{selectedTicket?.userName}</p>
                </div>
              </ModalHeader>
              <ModalBody className="p-0">
                {selectedTicket && <TicketChat ticketID={selectedTicket.ticketID} isAdmin={true} />}
              </ModalBody>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
