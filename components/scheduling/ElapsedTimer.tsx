'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface ElapsedTimerProps {
  openedAt?: Date
  closedAt?: Date
  offsetSeconds?: number
  className?: string
}

export default function ElapsedTimer({ openedAt, closedAt, offsetSeconds = 0, className }: ElapsedTimerProps) {
  const calcElapsed = () => {
    if (!openedAt) return offsetSeconds
    const end = closedAt ? new Date(closedAt).getTime() : Date.now()
    return offsetSeconds + Math.floor((end - new Date(openedAt).getTime()) / 1000)
  }

  const [elapsed, setElapsed] = useState(calcElapsed)

  useEffect(() => {
    // If no active session running, show static time
    if (!openedAt || closedAt) {
      setElapsed(calcElapsed())
      return
    }

    const interval = setInterval(() => {
      setElapsed(calcElapsed())
    }, 1000)
    return () => clearInterval(interval)
  }, [openedAt, closedAt, offsetSeconds])

  const format = (n: number) => n.toString().padStart(2, '0')
  const isRunning = !!openedAt && !closedAt

  let display: string
  if (isRunning) {
    // Running: show HH:MM:SS with seconds
    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60
    display = `${hours > 0 ? `${format(hours)}:` : ''}${format(minutes)}:${format(seconds)}`
  } else {
    // Static accumulated time: round up to nearest minute, show as "X Min" or "Xh X Min"
    const totalMinutes = Math.ceil(elapsed / 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    display = h > 0 ? (m > 0 ? `${h}h ${m} Min` : `${h}h`) : `${totalMinutes} Min`
  }

  return (
    <span className={`inline-flex items-center gap-1 font-mono ${isRunning ? 'text-green-600' : 'text-default-500'} ${className ?? ''}`}>
      <Clock className="w-3.5 h-3.5" />
      {display}
    </span>
  )
}
