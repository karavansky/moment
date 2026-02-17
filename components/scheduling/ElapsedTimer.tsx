'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface ElapsedTimerProps {
  openedAt: Date
  closedAt?: Date
  className?: string
}

export default function ElapsedTimer({ openedAt, closedAt, className }: ElapsedTimerProps) {
  const calcElapsed = () => {
    const end = closedAt ? new Date(closedAt).getTime() : Date.now()
    return Math.floor((end - new Date(openedAt).getTime()) / 1000)
  }

  const [elapsed, setElapsed] = useState(calcElapsed)

  useEffect(() => {
    // If stopped, just show static time
    if (closedAt) {
      setElapsed(calcElapsed())
      return
    }

    const interval = setInterval(() => {
      setElapsed(calcElapsed())
    }, 1000)
    return () => clearInterval(interval)
  }, [openedAt, closedAt])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const format = (n: number) => n.toString().padStart(2, '0')

  return (
    <span className={`inline-flex items-center gap-1 font-mono ${closedAt ? 'text-default-500' : 'text-green-600'} ${className ?? ''}`}>
      <Clock className="w-3.5 h-3.5" />
      {hours > 0 && `${format(hours)}:`}{format(minutes)}:{format(seconds)}
    </span>
  )
}
