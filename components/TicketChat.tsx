'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, TextArea, Card, Spinner, ScrollShadow } from '@heroui/react'
import { Send } from 'lucide-react'
import type { Message } from '@/lib/interface'

interface TicketChatProps {
  ticketID: string
  isAdmin?: boolean
  isDemo?: boolean
  authOpen?: () => void
}

export default function TicketChat({ ticketID, isAdmin = false, isDemo = false, authOpen }: TicketChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      const response = await fetch(`/api/tickets/${ticketID}/messages`)

      // Check for rate limiting or other HTTP errors
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited, will retry later')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && mountedRef.current) {
        setMessages(data.messages)
        if (data.messages.length > messages.length && !isDemo) {
          setTimeout(scrollToBottom, 100)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [ticketID, messages.length])

  const sendMessage = async () => {
    if (!newMessage.trim()) return
      console.log('Demo mode: triggering isDemo', authOpen)
    if (isDemo && authOpen) {
      console.log('Demo mode: triggering authOpen instead of sending message')
      authOpen()
      return
    }
    setSending(true)
    try {
      const response = await fetch(`/api/tickets/${ticketID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setMessages([...messages, data.message])
        setNewMessage('')
        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // Initial load
    loadMessages()

    // Set up interval - 1 minute polling as fallback (WebSocket will handle real-time updates)
    const interval = setInterval(loadMessages, 60000)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [loadMessages])

  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all dark:text-blue-400"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-150">
      <ScrollShadow className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.messageID}
            className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
          >
            <Card
              className={`max-w-[70%] ${
                msg.isAdmin ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'
              }`}
            >
              <Card.Content>
                <div className="text-xs font-semibold mb-1">
                  {msg.isAdmin ? 'Support Team' : 'You'}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {renderMessageWithLinks(msg.message)}
                </div>
                <div className="text-xs opacity-70 mt-2">{new Date(msg.date).toLocaleString()}</div>
              </Card.Content>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollShadow>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <TextArea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            rows={2}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            className="flex-1"
          />
          <Button
            isIconOnly
            isPending={sending}
            isDisabled={!newMessage.trim()}
            onPress={sendMessage}
            className="text-white"
          >
            {({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Send />}</>}
          </Button>
        </div>
        <div className="text-xs opacity-70 mt-2">Press Enter to send, Shift+Enter for new line</div>
      </div>
    </div>
  )
}
